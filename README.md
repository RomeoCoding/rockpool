# rockpool

Peer in on every Claude Code agent: who is working, on what, and who needs you.
Open http://localhost:7777 while you work.

Every agent shows up as a small pixel pal: the lead agent of each session (it wears the crown) and every subagent it sends out. Each card shows what the agent was asked to do and what it is doing right now. Finished agents move to a shelf; agents waiting on you turn pink and move to the front.

## How it works

- `hook.js` is registered as a Claude Code hook (SessionStart, UserPromptSubmit, Pre/PostToolUse, SubagentStart/Stop, Stop, Notification, SessionEnd). It prints nothing and fails open, so it adds **zero tokens** to Claude's context and never blocks a tool call (~0.1s per call).
- `server.py` is a stdlib-only HTTP + SSE server on 127.0.0.1:7777. The SessionStart hook starts it automatically; you can also run `python server.py`.
- `events.jsonl` keeps the last 5000 events and replays them on page load. "Clear history" wipes it.

## Setup

Add `"<node>" "<path>/rockpool/hook.js"` as a command hook for each event above in `~/.claude/settings.json`. Port: set `ROCKPOOL_PORT`. To uninstall, delete those hook entries.

rockpool is an unofficial fan project and is not affiliated with Anthropic.
