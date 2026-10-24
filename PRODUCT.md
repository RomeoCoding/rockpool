# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Claude Code users who run multi-agent work (subagents, workflows, parallel sessions) and lose track of which agent is doing what. They keep the page open in a side tab or second monitor and glance at it mid-task. Distributed as an open-source repo, so the page must explain itself to a stranger on first open.

## Product Purpose
A live, local board of every Claude Code agent: the main agent of each session plus every subagent it spawns. Success is a single glance answering "who is working on what right now", with finished work receding.

## Positioning
Zero-token observability: data comes from Claude Code hooks, never from the model, so watching costs nothing and cannot affect the session.

## Operating Context
Runs on localhost:7777, served by a stdlib Python server that a SessionStart hook auto-starts. Events stream over SSE. Several sessions (different project folders) can be live at once. Users run it beside a terminal; sessions last minutes to hours.

## Capabilities and Constraints
- Events: SessionStart, UserPromptSubmit, Pre/PostToolUse, SubagentStart/Stop, Stop, Notification, SessionEnd. Payloads are clipped previews (tool input ≤240 chars, Agent prompt ≤600, results ≤800).
- Agent identity: main agent per session; subagents identified by Agent/Task tool_use_id, bound to agent_id on SubagentStart. Whether subagent tool calls carry agent_id is unverified for the installed Claude Code version.
- Single self-contained index.html, no build step, no external runtime dependencies required to function.
- Terminology: session, main agent, subagent, tool call, turn.

## Brand Commitments
- Name: rockpool (lowercase wordmark). Unofficial fan project, not affiliated with Anthropic; say so in the README.
- Visual world: risograph print. Paper #F3EEE3, Riso Black #1F1D1A, Orange #FF6C2F (lead agent, mark), Teal #00838A (working), Fluorescent Pink #FF48B0 (needs you), Yellow #FFE800, Federal Blue #3D5588. Type: Young Serif, Schibsted Grotesk, Chivo Mono, Silkscreen (stamps only). Source of truth: Figma file YWREgYiXFMqZRndhYPiGzl.
- Each agent is represented by a Clawd-style pixel creature (in the spirit of Claude Code's startup mascot) with randomised but deterministic personalisation per agent (colour, eyes, accessory), so the same agent always looks the same.
- Less text: titles and current action over transcripts.

## Evidence on Hand
Live event log at rockpool/events.jsonl. No users, testimonials or screenshots yet; do not fabricate any.

## Product Principles
1. Glanceable first: the current action of every running agent is readable in under two seconds.
2. Finished work recedes; active and waiting work advances.
3. Detail on demand, never by default.
4. Free to watch: nothing the page does may cost tokens or slow the session.
