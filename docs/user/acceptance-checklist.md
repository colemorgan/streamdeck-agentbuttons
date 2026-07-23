# Acceptance checklist (polish / 1.0)

Author soak after Phase A–C. Check boxes when verified on hardware.

## Cold start

- [ ] Fresh reboot or full quit of Stream Deck + ChatGPT + companion  
- [ ] Start **Agent Buttons Companion** → Start Bridge  
- [ ] Launch ChatGPT with Agent Keys  
- [ ] ChatGPT Codex Micro: Connection **Connected**, Input Monitoring **granted**  
- [ ] Stream Deck keys leave Offline within a few seconds  

## Faces & labels

- [ ] Offline / Off / Idle look different  
- [ ] Busy (blue), Done (green), Wait (orange), Err (red) readable at arm’s length  
- [ ] Default labels A1–A6  
- [ ] Custom display name shows on face (e.g. Ship)  
- [ ] No double title text under the image  

## Property Inspector

- [ ] Companion badge reflects bridge up/down  
- [ ] ChatGPT badge reflects connected / waiting  
- [ ] Slot change auto-saves and rebinds face  
- [ ] Slot vs thread copy is clear  

## Focus & status

- [ ] Running agent paints Busy on assigned slot  
- [ ] Key press focuses that agent in ChatGPT  
- [ ] Stop companion → Offline faces (not stale Idle)  

## Companion app

- [ ] Menu Start/Stop Bridge works without terminal  
- [ ] Launch ChatGPT keeps Input Monitoring granted  
- [ ] Open Logs finds `~/Library/Logs/agentbuttons-companion.log`  
- [ ] About shows non-affiliation text  
- [ ] Open at Login toggles without crash  

## Packaging

- [ ] `npm test` green  
- [ ] `./plugin/scripts/pack-release.sh` validate + pack succeeds  
- [ ] `.streamDeckPlugin` installs cleanly  
- [ ] Companion `./companion/scripts/build-macos-app.sh` produces runnable app  

## Docs

- [ ] `docs/user/setup.md` alone is enough for cold start  
- [ ] Thread reassignment described (ChatGPT Micro, not PI slot)  
