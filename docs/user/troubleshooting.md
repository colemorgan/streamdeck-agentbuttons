# Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Keys gray / Offline | Companion not running | Start `node companion/dist/cli.js --chatgpt` |
| Keys Off forever | ChatGPT not linked via shim | Run `./companion/scripts/launch-chatgpt.sh` with companion already up |
| Connection Connected but Input Monitoring Not granted | ChatGPT launched with polluted env (`ELECTRON_RUN_AS_NODE`) | Fully quit ChatGPT; launch only via companion script (clean Launch Services) |
| Focus does nothing | Companion/ChatGPT down, or no chat on that Micro slot | Check PI health badges; re-assign agent keys in ChatGPT |
| Wrong thread on a key | Thread assignment is in ChatGPT, not Stream Deck | ChatGPT → Codex Micro → Agent keys |
| Slot won’t stick | Old plugin / PI context bug | Update plugin; reopen property inspector; change slot again |
| Broken after ChatGPT update | Shim / fuse change | Check GitHub issues; demo mode still works: `--demo` |
| Blue forever / stuck Busy | Agent still running or status not cleared | Confirm in ChatGPT UI; restart companion if needed |
| PI shows Companion Not running | IPC port 19847 free? | Only one companion; check `~/Library/Logs/agentbuttons-companion.log` |

## Logs

| Log | Path |
|-----|------|
| Companion | `~/Library/Logs/agentbuttons-companion.log` |
| Shim | `$TMPDIR/agentbuttons-shim.log` |
| Plugin | Stream Deck plugin logs under the `.sdPlugin/logs/` folder |

## Demo without ChatGPT

```bash
node companion/dist/cli.js --verbose --demo
```

Slots cycle states so you can verify key faces without the shim.
