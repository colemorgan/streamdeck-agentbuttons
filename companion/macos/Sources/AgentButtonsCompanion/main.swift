import AppKit
import Foundation
import ServiceManagement
import SwiftUI

// MARK: - Paths & process helpers

enum AppPaths {
  static var resources: URL {
    Bundle.main.resourceURL ?? Bundle.main.bundleURL
  }

  static var companionBundle: URL {
    resources.appendingPathComponent("companion.bundle.cjs")
  }

  static var preload: URL {
    resources.appendingPathComponent("preload.cjs")
  }

  static var launchChatGPT: URL {
    resources.appendingPathComponent("launch-chatgpt.sh")
  }

  static var logsDir: URL {
    let home = FileManager.default.homeDirectoryForCurrentUser
    return home.appendingPathComponent("Library/Logs", isDirectory: true)
  }

  static var companionLog: URL {
    logsDir.appendingPathComponent("agentbuttons-companion.log")
  }

  static var pidFile: URL {
    logsDir.appendingPathComponent("agentbuttons-companion.pid")
  }

  static var docsURL: URL {
    URL(string: "https://github.com/colemorgan/streamdeck-agentbuttons/blob/main/docs/user/setup.md")!
  }

  static var releasesURL: URL {
    URL(string: "https://github.com/colemorgan/streamdeck-agentbuttons/releases")!
  }

  static func findNode() -> String? {
    let candidates = [
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "/usr/bin/node",
    ]
    for c in candidates where FileManager.default.isExecutableFile(atPath: c) {
      return c
    }
    // Fall back to PATH
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/which")
    task.arguments = ["node"]
    let pipe = Pipe()
    task.standardOutput = pipe
    task.standardError = FileHandle.nullDevice
    do {
      try task.run()
      task.waitUntilExit()
      let data = pipe.fileHandleForReading.readDataToEndOfFile()
      let path = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      if !path.isEmpty, FileManager.default.isExecutableFile(atPath: path) {
        return path
      }
    } catch {
      /* ignore */
    }
    return nil
  }
}

// MARK: - Companion controller

@MainActor
final class CompanionModel: ObservableObject {
  enum BridgeState: String {
    case stopped
    case starting
    case running
    case error
  }

  @Published var bridgeState: BridgeState = .stopped
  @Published var chatgptLabel: String = "Unknown"
  @Published var lastError: String?
  @Published var openAtLogin: Bool = false

  private var process: Process?
  private var healthTimer: Timer?
  private let ipcPort = 19847

  var statusSymbol: String {
    switch bridgeState {
    case .running:
      return chatgptLabel.lowercased().contains("connected") ? "circle.fill" : "circle.lefthalf.filled"
    case .starting:
      return "ellipsis.circle"
    case .error:
      return "exclamationmark.triangle"
    case .stopped:
      return "circle"
    }
  }

  var statusTitle: String {
    switch bridgeState {
    case .running:
      return "Bridge running · ChatGPT \(chatgptLabel)"
    case .starting:
      return "Starting bridge…"
    case .error:
      return lastError ?? "Error"
    case .stopped:
      return "Bridge stopped"
    }
  }

  init() {
    refreshLoginItem()
    if isPidAlive() {
      bridgeState = .running
      startHealthPolling()
    }
  }

  func toggleBridge() {
    if bridgeState == .running || bridgeState == .starting {
      stopBridge()
    } else {
      startBridge()
    }
  }

  func startBridge() {
    lastError = nil
    guard bridgeState != .running, bridgeState != .starting else { return }

    guard let node = AppPaths.findNode() else {
      lastError = "Node.js not found. Install Node 20+ (Homebrew or nvm)."
      bridgeState = .error
      return
    }
    let script = AppPaths.companionBundle.path
    guard FileManager.default.fileExists(atPath: script) else {
      lastError = "Missing companion.bundle.cjs in app Resources. Rebuild the app."
      bridgeState = .error
      return
    }

    // Ensure log dir
    try? FileManager.default.createDirectory(
      at: AppPaths.logsDir,
      withIntermediateDirectories: true
    )

    // Kill stale process on our pid file if any
    stopBridge(silent: true)

    bridgeState = .starting
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: node)
    proc.arguments = [script, "--verbose", "--chatgpt"]
    proc.currentDirectoryURL = AppPaths.resources

    let logPath = AppPaths.companionLog.path
    FileManager.default.createFile(atPath: logPath, contents: nil)
    if let fh = try? FileHandle(forWritingTo: AppPaths.companionLog) {
      fh.seekToEndOfFile()
      proc.standardOutput = fh
      proc.standardError = fh
    }

    // Clean env: no ELECTRON_RUN_AS_NODE
    var env = ProcessInfo.processInfo.environment
    env.removeValue(forKey: "ELECTRON_RUN_AS_NODE")
    env.removeValue(forKey: "NODE_OPTIONS")
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
    proc.environment = env

    proc.terminationHandler = { [weak self] p in
      Task { @MainActor in
        guard let self else { return }
        if self.process === p || self.process == nil {
          self.process = nil
          if self.bridgeState != .stopped {
            self.bridgeState = .stopped
            self.chatgptLabel = "Unknown"
          }
          self.stopHealthPolling()
          try? FileManager.default.removeItem(at: AppPaths.pidFile)
        }
      }
    }

    do {
      try proc.run()
      process = proc
      try? String(proc.processIdentifier).write(
        to: AppPaths.pidFile,
        atomically: true,
        encoding: .utf8
      )
      bridgeState = .running
      startHealthPolling()
    } catch {
      lastError = error.localizedDescription
      bridgeState = .error
      process = nil
    }
  }

  func stopBridge(silent: Bool = false) {
    stopHealthPolling()
    if let proc = process, proc.isRunning {
      proc.terminate()
      // Give it a moment; force kill if needed
      DispatchQueue.global().asyncAfter(deadline: .now() + 1.5) {
        if proc.isRunning {
          proc.interrupt()
          kill(proc.processIdentifier, SIGKILL)
        }
      }
    }
    // Also kill by pid file
    if let pidStr = try? String(contentsOf: AppPaths.pidFile, encoding: .utf8),
       let pid = Int32(pidStr.trimmingCharacters(in: .whitespacesAndNewlines)),
       pid > 0
    {
      kill(pid, SIGTERM)
    }
    // Free port holders carefully — only our node companion if possible
    process = nil
    try? FileManager.default.removeItem(at: AppPaths.pidFile)
    if !silent {
      bridgeState = .stopped
      chatgptLabel = "Unknown"
    }
  }

  func launchChatGPTWithShim() {
    lastError = nil
    // Ensure bridge is up first
    if bridgeState != .running {
      startBridge()
      // Give socket a beat
      Thread.sleep(forTimeInterval: 0.8)
    }

    let script = AppPaths.launchChatGPT.path
    guard FileManager.default.isExecutableFile(atPath: script)
      || FileManager.default.fileExists(atPath: script)
    else {
      lastError = "launch-chatgpt.sh missing from Resources"
      bridgeState = bridgeState == .running ? .running : .error
      return
    }

    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: "/bin/bash")
    proc.arguments = [script]
    var env = ProcessInfo.processInfo.environment
    env.removeValue(forKey: "ELECTRON_RUN_AS_NODE")
    env.removeValue(forKey: "NODE_OPTIONS")
    env["PATH"] = "/usr/bin:/bin:/usr/sbin:/sbin"
    env["AGENTBUTTONS_PRELOAD"] = AppPaths.preload.path
    proc.environment = env
    proc.standardOutput = FileHandle.nullDevice
    proc.standardError = FileHandle.nullDevice
    do {
      try proc.run()
    } catch {
      lastError = "Failed to launch ChatGPT: \(error.localizedDescription)"
    }
  }

  func openLogs() {
    NSWorkspace.shared.activateFileViewerSelecting([AppPaths.companionLog])
  }

  func openDocs() {
    NSWorkspace.shared.open(AppPaths.docsURL)
  }

  func openReleases() {
    NSWorkspace.shared.open(AppPaths.releasesURL)
  }

  func showAbout() {
    let alert = NSAlert()
    alert.messageText = "Agent Buttons Companion"
    alert.informativeText = """
    Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0")

    Local bridge so Stream Deck can show ChatGPT Codex agent status (virtual Codex Micro protocol).

    • Listens on ws://127.0.0.1:19847 only
    • Optional shim: launches ChatGPT with a local preload (no ChatGPT files modified)
    • Input Monitoring is granted to ChatGPT, not this app

    Not affiliated with OpenAI, Work Louder, or Elgato.
    macOS only.
    """
    alert.alertStyle = .informational
    alert.addButton(withTitle: "OK")
    alert.runModal()
  }

  func setOpenAtLogin(_ enabled: Bool) {
    if #available(macOS 13.0, *) {
      do {
        if enabled {
          try SMAppService.mainApp.register()
        } else {
          try SMAppService.mainApp.unregister()
        }
        openAtLogin = enabled
      } catch {
        lastError = "Login item: \(error.localizedDescription)"
        refreshLoginItem()
      }
    }
  }

  private func refreshLoginItem() {
    if #available(macOS 13.0, *) {
      openAtLogin = SMAppService.mainApp.status == .enabled
    }
  }

  private func isPidAlive() -> Bool {
    guard let pidStr = try? String(contentsOf: AppPaths.pidFile, encoding: .utf8),
          let pid = Int32(pidStr.trimmingCharacters(in: .whitespacesAndNewlines)),
          pid > 0
    else { return false }
    return kill(pid, 0) == 0
  }

  private func startHealthPolling() {
    stopHealthPolling()
    healthTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
      Task { @MainActor in
        self?.probeHealth()
      }
    }
    if let healthTimer {
      RunLoop.main.add(healthTimer, forMode: .common)
    }
    probeHealth()
  }

  private func stopHealthPolling() {
    healthTimer?.invalidate()
    healthTimer = nil
  }

  private func probeHealth() {
    let portOpen = isPortOpen(port: UInt16(ipcPort))
    if !portOpen {
      if bridgeState == .running,
         process?.isRunning != true,
         !isPidAlive()
      {
        bridgeState = .stopped
        chatgptLabel = "Unknown"
      }
      return
    }
    if bridgeState != .running { bridgeState = .running }

    // Prefer JSON probe via embedded bundle: node companion.bundle.cjs --probe
    guard let node = AppPaths.findNode() else {
      chatgptLabel = chatgptLabel == "Unknown" ? "Waiting" : chatgptLabel
      return
    }
    let script = AppPaths.companionBundle.path
    guard FileManager.default.fileExists(atPath: script) else { return }

    DispatchQueue.global(qos: .utility).async {
      let proc = Process()
      proc.executableURL = URL(fileURLWithPath: node)
      proc.arguments = [script, "--probe", "--port", String(self.ipcPort)]
      let pipe = Pipe()
      proc.standardOutput = pipe
      proc.standardError = FileHandle.nullDevice
      var env = ProcessInfo.processInfo.environment
      env.removeValue(forKey: "ELECTRON_RUN_AS_NODE")
      env.removeValue(forKey: "NODE_OPTIONS")
      proc.environment = env
      do {
        try proc.run()
        proc.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        guard let line = String(data: data, encoding: .utf8)?
          .trimmingCharacters(in: .whitespacesAndNewlines),
          let jsonData = line.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any]
        else { return }
        let cg = (obj["chatgpt"] as? String)?.lowercased() ?? "unknown"
        let label: String
        switch cg {
        case "connected": label = "Connected"
        case "waiting", "waiting-for-chatgpt": label = "Waiting"
        case "disconnected": label = "Disconnected"
        default: label = cg.capitalized
        }
        DispatchQueue.main.async {
          self.chatgptLabel = label
          if (obj["ok"] as? Bool) == true {
            self.bridgeState = .running
          }
        }
      } catch {
        /* ignore probe failures */
      }
    }
  }

  private func isPortOpen(port: UInt16) -> Bool {
    let sock = socket(AF_INET, SOCK_STREAM, 0)
    guard sock >= 0 else { return false }
    defer { close(sock) }
    var addr = sockaddr_in()
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = port.bigEndian
    addr.sin_addr.s_addr = inet_addr("127.0.0.1")
    let result = withUnsafePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
      }
    }
    return result == 0
  }
}

// MARK: - UI

struct MenuContent: View {
  @ObservedObject var model: CompanionModel

  var body: some View {
    Text(model.statusTitle)
      .font(.headline)
    Divider()
    Button(model.bridgeState == .running || model.bridgeState == .starting ? "Stop Bridge" : "Start Bridge") {
      model.toggleBridge()
    }
    Button("Launch ChatGPT with Agent Keys") {
      model.launchChatGPTWithShim()
    }
    Divider()
    Button("Open Logs") { model.openLogs() }
    Button("Setup Guide…") { model.openDocs() }
    Button("Companion Releases…") { model.openReleases() }
    Divider()
    Toggle("Open at Login", isOn: Binding(
      get: { model.openAtLogin },
      set: { model.setOpenAtLogin($0) }
    ))
    Divider()
    Button("About Agent Buttons Companion") { model.showAbout() }
    Divider()
    Button("Quit") {
      model.stopBridge()
      NSApplication.shared.terminate(nil)
    }
    .keyboardShortcut("q")
  }
}

@main
struct AgentButtonsCompanionApp: App {
  @StateObject private var model = CompanionModel()

  var body: some Scene {
    MenuBarExtra {
      MenuContent(model: model)
    } label: {
      // SF Symbol in menu bar
      Image(systemName: model.statusSymbol)
    }
    .menuBarExtraStyle(.menu)
  }
}
