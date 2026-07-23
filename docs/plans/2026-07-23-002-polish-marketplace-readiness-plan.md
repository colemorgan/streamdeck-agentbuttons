# Codex Agent Buttons — Polish & Marketplace Readiness Plan

**Date:** 2026-07-23  
**Status:** Planning (MVP works end-to-end on personal Mac)  
**Goal:** Turn a working personal stack into a **polished Stream Deck Marketplace plugin** + **required companion**, with clear deck labels, trustworthy setup, and a path through Elgato review.

---

## 0. Current state (honest baseline)

| Area | Today | Gap vs polished |
|------|--------|------------------|
| Core loop | Live status + focus works via companion shim | Reliability & packaging, not protocol |
| Deck key face | Solid color + `A1`–`A6` SVG; title also dumps raw state | Looks prototype; double-label noise |
| Property Inspector | Slot dropdown + Apply + short help | No health, no companion link, no first-run |
| Companion | Manual CLI + shell launch script | Not installable; agent-shell env pitfalls |
| Cold start | Multi-step, expert-only | Marketplace users will bounce |
| Branding assets | Placeholder marketplace / category icons | Need real 1×/2× kit |
| OS support | macOS only in manifest | Correct for v1; must be explicit in listing |
| Legal | README disclaimer | Needs listing + PI + companion surface |
| Versioning | `0.1.0.0` | Need release train + changelog |

**Product truth for Marketplace:** the plugin is the store surface; the companion is a **required external dependency**. Elgato will expect the plugin to work as a Stream Deck citizen (stable, clear PI, good icons, no crashes) and will scrutinize anything that looks like malware, injection, or hidden network. Disclosure + clean UX is the strategy.

---

## 1. Product positioning (decide once, use everywhere)

### 1.1 Naming (recommended)

| Surface | String |
|---------|--------|
| Marketplace / plugin Name | **Codex Agent Buttons** |
| Category | **Codex Agent Buttons** (or **AI Agents** if Elgato prefers generic categories) |
| Action name | **Agent Slot** (keep short in the action list) |
| Deck default label | **A1…A6** (slot id) — not Micro hardware jargon |
| Companion product name | **Agent Buttons Companion** |
| GitHub repo / releases | Match companion name; link from plugin |

Avoid Work Louder / “Codex Micro” in **title marks**. Use Micro only in body copy as *protocol compatibility* (“works with ChatGPT’s Codex Micro agent keys protocol”).

### 1.2 One-sentence listing pitch

> Live ChatGPT Codex agent status on your Stream Deck — colors and one-tap focus without a Codex Micro. Requires free macOS companion.

### 1.3 Non-affiliation (required on all user surfaces)

Short legal line on: Marketplace description, PI footer, companion `--help`/About, README, GitHub release notes:

> Not affiliated with OpenAI, Work Louder, or Elgato. Unofficial interoperability tool.

---

## 2. Deck visual design (what the user stares at all day)

This is the highest leverage polish after reliability.

### 2.1 Key face system

Replace the flat SVG rectangle with a **small design system**:

| Element | Spec |
|---------|------|
| Canvas | 144×144 (and @2x-quality vectors) |
| Shape | Rounded tile matching Stream Deck family (consistent corner radius) |
| Slot id | Large, centered or top: `A1`–`A6` |
| State cue | Color field **plus** optional icon glyph (not color-only for accessibility) |
| Secondary text | Optional short state word: `Idle`, `Busy`, `Done`, `Wait`, `Err`, `Off`, `—` (offline) |
| User title | Prefer **baked image text** OR Stream Deck title — not both fighting. Recommendation: bake slot+state into image; set `UserTitleEnabled: false` or leave title empty by default |

### 2.2 State palette (keep Micro-aligned, polish names)

| Internal | Deck color (approx) | Label | Glyph idea |
|----------|---------------------|-------|------------|
| `offline` | dim gray / hatch | `—` or `Offline` | unplugged / dashed ring |
| `off` | near-black | `Off` | empty ring |
| `idle` | white / soft gray border | `Idle` | solid ring |
| `working` | blue | `Busy` | pulse / spinner static |
| `complete` | green | `Done` | check |
| `awaiting` | orange | `Wait` | `?` or hand |
| `error` | red | `Err` | `!` |

**Rules**

- Offline ≠ Off ≠ Idle (three different faces).
- Never leave a key on a “healthy” color when IPC is down (already mostly true).
- Prefer high contrast text on each fill (current idle/complete dark text is good).

### 2.3 Labels policy

| Question | Decision |
|----------|----------|
| Show AG00 hardware ids on deck? | **No** — PI only if needed for power users |
| Show thread/chat title on key? | **v1.1+** if protocol exposes names; not in protocol today → skip |
| Custom key label in PI? | Nice polish: optional “Display name” override (`“Ship”` instead of `A1`) |
| Title field from Stream Deck UI | Allow advanced users; default empty so image owns the story |

### 2.4 Multi-device layouts

| Device | Approach |
|--------|----------|
| Stream Deck XL | Profile template: row or block of 6 Agent Slots pre-assigned A1–A6 |
| Standard / MK.2 | 6 keys or subset + page 2 |
| Neo / mini | Document “use slots you need”; ship a 2–3 key starter profile |
| Mobile / Studio | Keypad-only action is fine; no dials in v1 |

Deliverable: **one prebuilt `.streamDeckProfile` (or layout export)** for XL + one for standard, linked from README/PI.

### 2.5 Feedback on press

- Success: brief `showOk` or subtle title flash (optional).
- Companion down: `showAlert` (already) + offline face.
- Don’t spam logs at info for every paint in production (`debug` when `Nodejs.Debug` off).

---

## 3. Property Inspector (setup surface)

Today’s PI is a slot picker. Polished PI should feel like a **mini control panel**.

### 3.1 Layout (top → bottom)

1. **Connection**  
   - Companion: Connected / Not running  
   - ChatGPT Micro: Connected / Waiting / Unknown  
   - Refresh on interval via `sendToPropertyInspector` from plugin health messages  

2. **Agent slot**  
   - Dropdown: `Slot 1` … `Slot 6` (drop AG00 from primary UI; optional advanced footnote)  
   - Auto-save on change (Apply as secondary or remove if auto-save is solid)  

3. **Display** (optional v1)  
   - Custom label  
   - Show state text on/off  

4. **Setup**  
   - Link: “Install companion…” → GitHub releases  
   - Link: “Open setup guide…” → hosted docs or `https://github.com/.../wiki`  
   - Button: “Copy launch command” / “Reveal companion” if installed in standard path  

5. **Footer**  
   - Version, legal one-liner, “macOS only”  

### 3.2 Use Elgato’s PI components where possible

Prefer Stream Deck’s modern PI SDPI / toolkit patterns over raw dark CSS so the plugin matches Marketplace norms (native-feeling controls, accessibility).

### 3.3 First-run empty state

When companion is down, PI shows a **checklist**, not only “Waiting for Stream Deck…”:

1. Install Agent Buttons Companion  
2. Start companion  
3. Launch ChatGPT with companion’s launcher (for live status)  
4. Assign chats to agent keys in ChatGPT Codex Micro settings  
5. Drop Agent Slot keys and set slots  

---

## 4. Companion productization (Marketplace blocker if ignored)

Marketplace users will not run `node companion/dist/cli.js`. Plan companion as a real app.

### 4.1 Distribution shape (v1)

| Artifact | Purpose |
|----------|---------|
| **Signed macOS `.app` or `.pkg`** | Double-click start; menu bar preferred |
| **GitHub Release** | Versioned DMG/ZIP + SHA; linked from plugin |
| **Optional Homebrew cask** later | Power users |

Not bundled inside `.streamDeckPlugin` for v1 (review + signing complexity).

### 4.2 Menu bar companion (target UX)

- Status item icon: idle / connected / error  
- Menu: Start/Stop bridge, Open logs, Launch ChatGPT with shim, Open docs, Quit  
- Auto-start at login (optional checkbox)  
- IPC always `127.0.0.1` only  
- Clean Launch Services ChatGPT launch (**already fixed**: strip `ELECTRON_RUN_AS_NODE`, `env -i` + `open --env`)  

### 4.3 Install paths

| Item | Path |
|------|------|
| App | `/Applications/Agent Buttons Companion.app` |
| Logs | `~/Library/Logs/agentbuttons-…` |
| Socket | `$TMPDIR/agentbuttons-codex-micro.sock` |
| IPC | `ws://127.0.0.1:19847` (document; allow override for power users only) |

### 4.4 Shim honesty

PI + companion UI must state clearly:

- Live status uses a **local preload** so ChatGPT sees a virtual Micro.  
- No ChatGPT files are modified.  
- ChatGPT updates may break detection.  
- Input Monitoring grant is **ChatGPT’s**, not the companion’s.  
- Personal / advanced users; not an official OpenAI product.  

This transparency is both ethical and Marketplace-protective.

### 4.5 Windows

Out of scope for v1. Manifest already mac-only — keep it that way until a real Windows detection path exists.

---

## 5. Plugin engineering polish

### 5.1 Stability

- [ ] No crash loops (already learned: CJS under `.sdPlugin`, `ws` polyfill for Node 20)  
- [ ] Cap log volume in production; rotate logs  
- [ ] Backoff on IPC reconnect (exists) + surface health to PI  
- [ ] `streamdeck validate` + `streamdeck pack` green  
- [ ] Disable `Nodejs.Debug: enabled` for release builds  

### 5.2 Settings model

```ts
type AgentSlotSettings = {
  slot: number;          // 0..5 required
  customLabel?: string;  // optional polish
  showStateText?: boolean;
};
```

Migrate safely if older keys only have `slot`.

### 5.3 Actions set (v1 vs later)

| Action | v1 | Later |
|--------|----|-------|
| Agent Slot | Yes | — |
| Companion Status (single key showing bridge health) | Optional nice-to-have | — |
| Approve / Reject / Mic / Submit | No | v2 command keys |
| Dial / encoder | No | v2 |

### 5.4 Profiles & default layout

Ship in repo or release assets:

- `profiles/xl-six-agents.streamDeckProfile`  
- `profiles/standard-six-agents.streamDeckProfile`  

Each key pre-set to slots 0–5 with sensible order (left→right A1–A6).

### 5.5 i18n

English only for v1 Marketplace submission is acceptable; structure strings for later.

---

## 6. Branding & asset kit (Marketplace checklist)

Elgato expects complete iconography. Produce a real kit (not placeholder):

| Asset | Notes |
|-------|--------|
| Marketplace icon | Plugin store tile (`marketplace.png` + @2x) |
| Category icon | Action list category |
| Action icon | Agent Slot in catalog |
| Default key image | Static fallback before first paint |
| Companion app icon | macOS `.icns` |
| Optional animated GIF | Listing media: idle→busy→done on a key |

**Design direction:** developer tool, calm, high contrast; avoid cloning Micro hardware product shots or OpenAI logos.

---

## 7. Documentation set (what Marketplace users need)

### 7.1 User-facing (short)

| Doc | Audience | Length |
|-----|----------|--------|
| Marketplace long description | Store | ~200–400 words + bullets |
| Setup guide (hosted) | First run | 1 page, screenshots |
| Troubleshooting | Stuck users | Table of symptoms |
| Companion release notes | Upgraders | Per version |

### 7.2 Setup guide outline (canonical)

1. Install plugin from Marketplace  
2. Download & install companion; open it (menu bar)  
3. Grant nothing extra for companion; **ChatGPT** may need Input Monitoring for key presses  
4. In companion: **Launch ChatGPT with agent keys**  
5. In ChatGPT: confirm Codex Micro **Connected**; assign chats to agent keys  
6. In Stream Deck: add 6× Agent Slot (or import profile); set slots 1–6  
7. Run an agent → key turns blue/busy  

### 7.3 Troubleshooting matrix (publish)

| Symptom | Fix |
|---------|-----|
| Keys gray Offline | Start companion |
| Keys off forever | Launch ChatGPT via companion launcher; check Micro Connected |
| Input Monitoring not granted | Launch via companion (clean LS); enable ChatGPT in System Settings |
| Focus does nothing | Companion+ChatGPT connected; re-assign agent keys |
| Slot won’t save | Update plugin; re-open PI |
| Broken after ChatGPT update | Check GitHub issues; may need shim update |

### 7.4 Developer docs

Keep README for contributors; separate **USER.md** / wiki so Marketplace copy doesn’t drown in monorepo noise.

---

## 8. Security, privacy, review narrative

Prepare a short **“What this plugin does”** for reviewers:

| Topic | Answer |
|-------|--------|
| Network | Localhost WebSocket only; no cloud |
| ChatGPT | Optional local interoperability via companion; plugin never injects |
| Data | No account system; no telemetry in v1 (or opt-in only later) |
| Permissions | Companion: none special; ChatGPT Input Monitoring is ChatGPT’s own feature |
| Code signing | Plugin per Elgato process; companion Developer ID + notarization |

**Review risk:** companion “shim” language. Mitigate with plain English, open source, no persistence in ChatGPT app bundle, easy off switch (quit companion / launch ChatGPT normally).

---

## 9. Release engineering

### 9.1 Versioning

- Plugin: `major.minor.patch.build` (Elgato 4-part) e.g. `1.0.0.0` for first store  
- Companion: semver aligned, e.g. `1.0.0`  
- Protocol IPC: keep `v: 1`; document compatibility matrix  

### 9.2 Pipelines

| Step | Tooling |
|------|---------|
| Test | `npm test` monorepo |
| Build plugin | rollup → `.sdPlugin` |
| Validate | `streamdeck validate` |
| Pack | `streamdeck pack` → `.streamDeckPlugin` |
| Companion | notarized DMG/app |
| Tag | `plugin-v1.0.0` / `companion-v1.0.0` |
| Release | GitHub Releases + Marketplace upload |

### 9.3 Support channel

- GitHub Issues as primary  
- Link from PI and listing  
- Template: OS version, Stream Deck model, plugin version, companion version, logs paths  

---

## 10. Marketplace listing content (draft structure)

**Title:** Codex Agent Buttons  

**Subtitle:** Live ChatGPT Codex agent status on Stream Deck  

**Description sections:**

1. What it does (status colors + focus)  
2. Requirements (macOS, ChatGPT desktop Codex, free companion)  
3. Setup in 5 steps  
4. States legend (colors)  
5. Disclaimer  

**Screenshots:**

1. Six keys showing mixed states  
2. PI with Connected health  
3. Companion menu bar  
4. ChatGPT Micro Connected panel  
5. XL profile layout  

**Category:** Productivity / Developer Tools (per Elgato taxonomy)  

**Support URL / Website / Source:** GitHub  

---

## 11. Phased delivery plan

### Phase A — “Daily driver polish” (1–3 days)

Goal: you enjoy using it without cringing.

1. Redesign key faces (state + glyph + clean labels; kill double title noise)  
2. PI: connection health + clearer copy + auto-save slot  
3. Default profile JSON/layout for XL  
4. Quiet production logging  
5. USER setup one-pager in `docs/user/`  

### Phase B — “Companion as product” (3–7 days)

1. Menu bar macOS app wrapper (or `pkg` + LaunchAgent) around existing Node CLI  
2. “Launch ChatGPT with shim” menu item using **clean env** script  
3. Login item optional  
4. Notarized release artifact + install docs  
5. Health IPC fields exposed cleanly to PI  

### Phase C — “Store packaging” (2–4 days)

1. Final icon kit  
2. `streamdeck pack` release build, debug off  
3. Marketplace copy + screenshots  
4. Legal/disclaimer pass  
5. Version 1.0.0.0 freeze + GitHub release  

### Phase D — “Marketplace submit & harden” (ongoing)

1. Submit to Elgato; respond to review feedback  
2. Crash/analytics only if needed  
3. Watch ChatGPT updates; shim compatibility tests  
4. Optional: custom key labels, companion status action, Windows research  

---

## 12. Acceptance criteria for “polished enough to submit”

- [ ] Cold start from zero: new Mac user path documented in ≤10 steps, works in <10 minutes for author  
- [ ] Six keys: offline / off / idle / busy / done / wait / error all visually distinct  
- [ ] Labels: `A1`–`A6` readable at arm’s length; no raw `working` dual-title clutter  
- [ ] PI shows companion + ChatGPT link state without opening logs  
- [ ] Companion installable without Node toolchain for end users  
- [ ] ChatGPT launch path never sets `ELECTRON_RUN_AS_NODE`  
- [ ] `streamdeck validate` + pack succeeds; plugin stable for 1 hour soak  
- [ ] Listing + PI + companion all carry non-affiliation + macOS requirement  
- [ ] Focus + live status verified on XL after clean reboot  

---

## 13. Explicit non-goals for this polish pass

- Official OpenAI partnership or trademarked Micro branding  
- Windows companion  
- Command keys / dials  
- Thread title scraping beyond protocol  
- Bundling companion inside the Marketplace plugin zip (v1)  
- Auto-granting Input Monitoring (impossible; document only)  

---

## 14. Recommended immediate next step

**Phase A item 1–2:** redesign key faces + PI health. Highest user-visible polish per hour, and it doesn’t block companion packaging.

If you want execution next, order of attack:

1. Key face design system + label rules  
2. PI health + setup links  
3. Companion menu bar packaging  
4. Marketplace asset + listing pack  

---

## 15. Traceability to original requirements

| Original | Polish plan coverage |
|----------|----------------------|
| R1 Marketplace-shaped | §8–11 packaging & listing |
| R2 Companion required | §4 productization, PI setup |
| R4–R7 slots / states / focus | §2 deck design, §5 actions |
| R8 multi-model | §2.4 profiles |
| R9 first-run docs | §7 setup guide |
| R10 offline indication | §2.2 offline face + PI health |
| S3 cold-start minutes | Phase B launcher + Phase A docs |
| S4 validate/pack | §9 release engineering |
