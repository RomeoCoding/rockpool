# rockpool

Peer in on every Claude Code agent: who is working, on what, and who needs you.

When Claude Code sends out subagents, it is hard to tell from the terminal which one is doing what. rockpool opens a page in your browser that shows each session as a pool of small pixel creatures: the lead agent (wearing the crown) and every subagent it sent out. Each one shows the task it was given and what it is doing right now. Agents waiting on you turn pink and move to the front; finished ones shrink onto a shelf.

It costs **zero tokens**. rockpool listens to Claude Code's hooks, not to the model, so watching never adds to your context or slows a session down.

## Install

You need **Claude Code**, **Node.js** (Claude Code already requires it) and **Python 3** on your PATH.

Inside Claude Code, run these two commands:

```
/plugin marketplace add RomeoCoding/rockpool
/plugin install rockpool@rockpool
```

Then **restart Claude Code** so the hooks load.

## Use it

1. Start a Claude Code session and send any message. The first session starts the rockpool server for you.
2. Open **http://localhost:7777**. Bookmark it or pin the tab; it updates live.

Every session you start from then on shows up automatically, across all your projects. Click a creature to see what it was asked and its last few actions. The browser tab title tells you when something needs you, e.g. `(1) needs you · rockpool`.

## Troubleshooting

**The page doesn't load.** The server starts on the first event of a session. Send a message in Claude Code, then refresh. Or start it yourself: `python server.py` from the plugin folder (`/plugin` shows where it lives).

**The page loads but stays empty.** Check the hooks are active: run `/hooks` in Claude Code and look for `hook.js` entries. If they are missing, restart Claude Code.

**Port 7777 is taken.** Set `ROCKPOOL_PORT` to another port in your environment before starting Claude Code, and open that port instead.

**Python isn't found.** rockpool tries `python3`/`python` (and `pythonw`/`py` on Windows). Install Python 3 from python.org and make sure it is on your PATH.

## Privacy

Everything stays on your machine. The server only listens on 127.0.0.1. It keeps the last 5000 events in `~/.rockpool/events.jsonl`, which includes short previews of your prompts and tool calls. **Clear history** on the page deletes it. Set `ROCKPOOL_DATA` to keep the file somewhere else.

## Uninstall

```
/plugin uninstall rockpool@rockpool
```

Then delete `~/.rockpool` if you want the history gone too.

## How it works

- `hooks/hooks.json` registers `hook.js` for SessionStart, UserPromptSubmit, Pre/PostToolUse, SubagentStart/Stop, Stop, Notification and SessionEnd. The hook prints nothing and always exits cleanly, so it can never block a tool call. It takes about 0.1 s per call.
- `server.py` is a standard-library Python server that streams events to the page over Server-Sent Events.
- `index.html` is the whole page: no build step and no dependencies apart from Google Fonts.

<details>
<summary>Manual install without the plugin system</summary>

Clone the repo, then add this command hook to `~/.claude/settings.json` for each event listed above:

```json
{ "type": "command", "command": "node \"/absolute/path/to/rockpool/hook.js\"", "timeout": 5 }
```

</details>

rockpool is an unofficial fan project and is not affiliated with Anthropic.
