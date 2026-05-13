import { NextRequest, NextResponse } from "next/server";
import { spawn, spawnSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import Groq from "groq-sdk";

function runSync(cmd: string, args: string[], timeoutMs = 8000): string {
  const result = spawnSync(cmd, args, { encoding: "utf8", timeout: timeoutMs, shell: true });
  return (result.stdout ?? "") + (result.stderr ?? "");
}

const SNAP_DIR = join(tmpdir(), "supernova-browser-snaps");
const SNAP_FILE = join(SNAP_DIR, "viewport.jpg");

let currentSession: string = "default";

async function runAgentBrowser(args: string[]): Promise<NextResponse> {
  return new Promise((resolve) => {
    const proc = spawn("agent-browser", args, { shell: true });
    
    let output = "";
    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", () => {
      resolve(NextResponse.json({ success: true, output }));
    });

    proc.on("error", (err) => {
      resolve(NextResponse.json({ 
        error: err.message,
        hint: "Make sure agent-browser is installed: npm install -g agent-browser"
      }, { status: 500 }));
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, url, command, session } = body;
    const sessionName = session || currentSession;

    switch (action) {
      case "open": {
        if (!url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
        }
        
        return new Promise((resolve) => {
          const proc = spawn("agent-browser", 
            ["--session-name", sessionName, "open", url, "--headed"],
            { shell: true }
          );

          let output = "";
          proc.stdout?.on("data", (data) => { output += data.toString(); });
          proc.stderr?.on("data", (data) => { output += data.toString(); });

          proc.on("close", () => {
            resolve(NextResponse.json({ success: true, output, url }));
          });

          proc.on("error", (err) => {
            resolve(NextResponse.json({ 
              error: err.message,
              hint: "Run: npm install -g agent-browser"
            }, { status: 500 }));
          });
        });
      }

      case "snapshot": {
        return runAgentBrowser(["--session-name", sessionName, "snapshot"]);
      }

      case "click": {
        if (!command) {
          return NextResponse.json({ error: "Click command required" }, { status: 400 });
        }
        return runAgentBrowser(["--session-name", sessionName, "click", command]);
      }

      case "dashboard": {
        spawn("agent-browser", ["dashboard", "start", "--port", "4849"], 
          { shell: true, detached: true }).unref();
        
        return NextResponse.json({ 
          success: true, 
          dashboardUrl: "http://localhost:4849" 
        });
      }

      case "close": {
        return runAgentBrowser(["--session-name", sessionName, "close"]);
      }

      case "screenshot": {
        try {
          if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
          runSync(
            "agent-browser",
            ["--session-name", sessionName, "screenshot", SNAP_FILE,
             "--screenshot-format", "jpeg", "--screenshot-quality", "82"],
            5000
          );
          if (!existsSync(SNAP_FILE)) {
            return NextResponse.json({ error: "no screenshot — is a page open?" }, { status: 404 });
          }
          const buf = readFileSync(SNAP_FILE);
          const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
          return NextResponse.json({ dataUrl });
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : "screenshot failed" }, { status: 500 });
        }
      }

      case "click_xy": {
        const { x, y } = body as { action: string; x: number; y: number };

        // ── Fast path: try JS evaluate (dispatches real mouse events) ──────────
        const js = [
          `(function(){`,
          `var cx=window.innerWidth*${x.toFixed(4)},cy=window.innerHeight*${y.toFixed(4)};`,
          `var el=document.elementFromPoint(cx,cy);`,
          `if(!el)return "no-element";`,
          `var opts={bubbles:true,cancelable:true,view:window,clientX:cx,clientY:cy};`,
          `el.dispatchEvent(new MouseEvent("mousedown",opts));`,
          `el.dispatchEvent(new MouseEvent("mouseup",opts));`,
          `el.dispatchEvent(new MouseEvent("click",opts));`,
          `if(typeof el.click==="function")el.click();`,
          `return el.tagName+":"+(el.id||el.textContent?.trim().slice(0,30)||"?");`,
          `})()`,
        ].join("");

        const evalOut = runSync("agent-browser", ["--session-name", sessionName, "eval", js], 4000);
        const evalOk = !evalOut.toLowerCase().includes("unknown command")
          && !evalOut.toLowerCase().includes("unrecognized")
          && !evalOut.toLowerCase().includes("error: unknown");

        if (evalOk) {
          return NextResponse.json({ ok: true, method: "evaluate", detail: evalOut.slice(0, 120) });
        }

        // ── Slow path: snapshot → Groq → @eN click ──────────────────────────
        const apiKey = process.env.GROQ_API_KEY?.trim();
        if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

        let snapshot = "";
        try {
          snapshot = runSync("agent-browser", ["--session-name", sessionName, "snapshot", "-i"], 8000);
        } catch {
          return NextResponse.json({ ok: false, error: "snapshot failed" });
        }

        const groq = new Groq({ apiKey });
        const hit = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Given a browser page snapshot and a click position (percentage of viewport), return ONLY a compact JSON object: " +
                '{"cmd":"click","arg":"@eN"} for the element most likely at that position. ' +
                "Output raw JSON only — no markdown, no explanation.",
            },
            {
              role: "user",
              content: `Snapshot:\n${snapshot.slice(0, 3500)}\n\nClick at: ${(x * 100).toFixed(0)}% from left, ${(y * 100).toFixed(0)}% from top.`,
            },
          ],
          max_tokens: 32,
          temperature: 0.1,
        });

        const raw = (hit.choices[0]?.message?.content ?? "{}").trim()
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        try {
          const step = JSON.parse(raw) as { cmd?: string; arg?: string };
          if (step.cmd === "click" && step.arg?.match(/^@e\d+$/)) {
            const out = runSync("agent-browser", ["--session-name", sessionName, "click", step.arg], 5000);
            return NextResponse.json({ ok: true, method: "snapshot+groq", ref: step.arg, out: out.slice(0, 150) });
          }
        } catch { /* ignore JSON parse errors */ }

        return NextResponse.json({ ok: false, note: "could not resolve element at coordinates" });
      }

      case "scroll_page": {
        const { direction } = body as { action: string; direction: string };
        const dir = direction === "up" ? "up" : "down";
        const out = runSync("agent-browser", ["--session-name", sessionName, "scroll", dir], 5000);
        return NextResponse.json({ ok: true, out: out.slice(0, 80) });
      }

      case "task": {
        if (!command) {
          return NextResponse.json({ error: "command required" }, { status: 400 });
        }

        // 1. Grab a snapshot of the current page
        let snapshot = "";
        try {
          snapshot = runSync("agent-browser", ["--session-name", sessionName, "snapshot", "-i"], 8000);
        } catch {
          return NextResponse.json({ error: "Could not take page snapshot — is a page open?" }, { status: 500 });
        }

        // 2. Ask Groq to translate the natural-language command into agent-browser CLI commands
        const apiKey = process.env.GROQ_API_KEY?.trim();
        if (!apiKey) {
          return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });
        }
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: [
                "You are a browser-automation planner. Given a page snapshot and a natural-language instruction,",
                "output ONLY a JSON array of agent-browser commands to execute, e.g.:",
                '[{"cmd":"click","arg":"@e5"},{"cmd":"type","sel":"@e3","text":"hello"},{"cmd":"press","key":"Enter"},{"cmd":"scroll","dir":"down"}]',
                "Allowed cmd values: click, dblclick, type, fill, press, scroll, wait, screenshot.",
                "For click/type/fill: use the @eN ref from the snapshot.",
                "For press: use key name (Enter, Escape, Tab, ArrowDown, etc).",
                "For scroll: dir is up/down/left/right.",
                "For wait: arg is a CSS selector or milliseconds as a string.",
                "Output ONLY the raw JSON array, no markdown, no explanation.",
              ].join(" "),
            },
            {
              role: "user",
              content: `Page snapshot:\n${snapshot.slice(0, 4000)}\n\nInstruction: ${command}`,
            },
          ],
          max_tokens: 512,
          temperature: 0.1,
        });

        const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
        let steps: Array<{ cmd: string; arg?: string; sel?: string; text?: string; key?: string; dir?: string }> = [];
        try {
          // Strip markdown code fences if present
          const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          steps = JSON.parse(cleaned) as typeof steps;
        } catch {
          return NextResponse.json({ error: "Failed to parse Groq plan", raw }, { status: 500 });
        }

        // 3. Execute each step
        const results: string[] = [];
        for (const step of steps) {
          try {
            let args: string[];
            if (step.cmd === "click" && step.arg) {
              args = ["--session-name", sessionName, "click", step.arg];
            } else if ((step.cmd === "type" || step.cmd === "fill") && step.sel && step.text) {
              args = ["--session-name", sessionName, step.cmd, step.sel, step.text];
            } else if (step.cmd === "press" && step.key) {
              args = ["--session-name", sessionName, "press", step.key];
            } else if (step.cmd === "scroll" && step.dir) {
              args = ["--session-name", sessionName, "scroll", step.dir];
            } else if (step.cmd === "wait" && step.arg) {
              args = ["--session-name", sessionName, "wait", step.arg];
            } else if (step.cmd === "dblclick" && step.arg) {
              args = ["--session-name", sessionName, "dblclick", step.arg];
            } else {
              continue;
            }
            const out = runSync("agent-browser", args, 6000);
            results.push(out.trim());
          } catch (err) {
            results.push(`step failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        return NextResponse.json({ success: true, steps: steps.length, results });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ 
    status: "Browser API ready",
    note: "Use POST to control browser. Install agent-browser: npm install -g agent-browser"
  });
}