// Claude Code hook -> rockpool server.
// Node, not Python: it runs on every tool call and Python cold-starts ~10x slower on this machine.
// Prints nothing and always exits 0, so it adds zero tokens to Claude's context and can never block a tool call.
const fs = require('fs'), http = require('http'), net = require('net'), path = require('path'), { spawn } = require('child_process');

const PORT = +(process.env.ROCKPOOL_PORT || 7777);
const KEEP = ['session_id', 'hook_event_name', 'cwd', 'tool_name', 'tool_use_id', 'agent_id', 'agent_type',
  'source', 'reason', 'notification_type'];
// Short preview of the argument that tells you what a tool call is doing.
const MAIN_ARG = { Bash: 'command', PowerShell: 'command', Read: 'file_path', Edit: 'file_path', Write: 'file_path',
  NotebookEdit: 'notebook_path', Grep: 'pattern', Glob: 'pattern', WebFetch: 'url', WebSearch: 'query',
  Skill: 'skill', ToolSearch: 'query' };

const clip = (v, n) => { const s = typeof v === 'string' ? v : JSON.stringify(v) ?? ''; return s.length <= n ? s : s.slice(0, n) + '…'; };
// Agent results arrive as {content:[{type:'text',text}]}; flatten so the UI shows prose.
const textOf = r => r && Array.isArray(r.content) ? r.content.map(c => c && c.text || '').join('\n') : r;

// Session name: Claude Code appends {"type":"ai-title"} / {"type":"custom-title"} records to the transcript.
// Read only the tail so this stays ~1ms on multi-MB transcripts; a /rename (customTitle) wins over the AI title.
function sessionTitle(file) {
  try {
    const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size, len = Math.min(size, 512 * 1024);
    const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
    const tail = buf.toString('utf8'), last = re => { let m, v; while ((m = re.exec(tail))) v = m[1]; return v; };
    const t = last(/"customTitle":"((?:[^"\\]|\\.)*)"/g) || last(/"aiTitle":"((?:[^"\\]|\\.)*)"/g);
    return t && JSON.parse('"' + t + '"');
  } catch { return undefined; }
}

const serverUp = () => new Promise(res => {
  const s = net.connect(PORT, '127.0.0.1', () => { s.destroy(); res(true); });
  s.on('error', () => res(false)); s.setTimeout(200, () => { s.destroy(); res(false); });
});

function startServer() {
  const py = process.platform === 'win32' ? 'pythonw' : 'python3';  // pythonw: no console window flashing up
  spawn(py, [path.join(__dirname, 'server.py')], { cwd: __dirname, detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

function post(ev) {
  return new Promise(res => {
    const body = JSON.stringify(ev);
    const req = http.request({ host: '127.0.0.1', port: PORT, path: '/event', method: 'POST', timeout: 500,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, r => { r.resume(); r.on('end', res); });
    req.on('error', res); req.on('timeout', () => { req.destroy(); res(); });
    req.end(body);
  });
}

async function main(raw) {
  const d = JSON.parse(raw || '{}'), ev = {};
  for (const k of KEEP) if (k in d) ev[k] = d[k];
  const name = d.tool_name, ti = d.tool_input || {};
  if (name === 'Agent' || name === 'Task')
    ev.input = { description: ti.description || '', subagent_type: ti.subagent_type || '', prompt: clip(ti.prompt || '', 600) };
  else if (name) ev.input = clip(ti[MAIN_ARG[name]] ?? ti, 240);
  if ('tool_response' in d) ev.response = clip(textOf(d.tool_response), 800);
  for (const [k, n] of [['prompt', 600], ['message', 300], ['last_assistant_message', 800], ['error', 300]])
    if (d[k]) ev[k] = clip(d[k], n);

  if (['UserPromptSubmit', 'Stop', 'SessionStart'].includes(ev.hook_event_name) && d.transcript_path) {
    const t = sessionTitle(d.transcript_path); if (t) ev.title = clip(t, 120);
  }

  if (ev.hook_event_name === 'SessionStart' && !(await serverUp())) {
    startServer();
    for (let i = 0; i < 15 && !(await serverUp()); i++) await new Promise(r => setTimeout(r, 200));  // let it bind so this event isn't lost
  }
  await post(ev);
}

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => main(raw).catch(() => {}).finally(() => process.exit(0)));  // fail open
