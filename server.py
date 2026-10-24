"""rockpool: tiny local server that relays Claude Code hook events to a browser page over SSE.

Run: python server.py   ->  http://localhost:7777   (stdlib only, binds to 127.0.0.1)
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("ROCKPOOL_PORT", "7777"))
HERE = os.path.dirname(os.path.abspath(__file__))
# History lives outside the code folder: plugin updates replace that folder, and it keeps prompts out of the repo.
DATA = os.environ.get("ROCKPOOL_DATA") or os.path.join(os.path.expanduser("~"), ".rockpool")
LOG = os.path.join(DATA, "events.jsonl")
MAX = 5000  # events kept in memory and replayed to new browser tabs

events, gen, cond = [], 0, threading.Condition()


def load():
    if not os.path.exists(LOG):
        return
    with open(LOG, encoding="utf-8") as f:
        lines = f.readlines()[-MAX:]
    events.extend(json.loads(l) for l in lines if l.strip())
    for n, e in enumerate(events):  # renumber so seq is contiguous and list index = seq - events[0].seq
        e["seq"] = n
    with open(LOG, "w", encoding="utf-8") as f:  # trim the file so it never grows unbounded
        f.writelines(lines)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body=b"", ctype="text/plain"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                self.send(200, f.read(), "text/html; charset=utf-8")
        elif self.path == "/stream":
            self.stream()
        else:
            self.send(404)

    def do_POST(self):
        global gen
        n = int(self.headers.get("Content-Length", 0))
        if self.path == "/event":
            try:
                ev = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self.send(400)  # a malformed event must not take the handler thread down noisily
            ev["ts"] = time.time()
            with cond:
                ev["seq"] = events[-1]["seq"] + 1 if events else 0
                events.append(ev)
                del events[:-MAX]
                with open(LOG, "a", encoding="utf-8") as f:
                    f.write(json.dumps(ev, ensure_ascii=False) + "\n")
                cond.notify_all()
            self.send(204)
        elif self.path == "/clear":
            with cond:
                events.clear()
                gen += 1
                open(LOG, "w").close()
                cond.notify_all()
            self.send(204)
        else:
            self.send(404)

    def stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        nxt, my_gen = 0, gen  # next seq this client needs
        try:
            while True:
                with cond:
                    if (not events or nxt > events[-1]["seq"]) and my_gen == gen:
                        cond.wait(15)
                    reset = my_gen != gen
                    if reset:
                        nxt, my_gen = 0, gen
                    base = events[0]["seq"] if events else 0
                    batch = events[max(0, nxt - base):]
                    if batch:
                        nxt = batch[-1]["seq"] + 1
                out = "event: reset\ndata: {}\n\n" if reset else ""
                out += "".join(f"data: {json.dumps(e, ensure_ascii=False)}\n\n" for e in batch)
                self.wfile.write((out or ": ping\n\n").encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


if __name__ == "__main__":
    os.makedirs(DATA, exist_ok=True)
    load()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    srv.daemon_threads = True
    print(f"rockpool on http://localhost:{PORT}")
    srv.serve_forever()
