import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

const FILE = join(process.cwd(), ".supernova-notes.json");

type Store = { notes: Array<{ id: string; text: string; createdAt: string }> };

async function load(): Promise<Store> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.notes)) return { notes: [] };
    return { notes: parsed.notes.slice(0, 64) };
  } catch {
    return { notes: [] };
  }
}

async function save(store: Store) {
  await writeFile(FILE, JSON.stringify({ notes: store.notes.slice(0, 64) }, null, 2), "utf8");
}

export async function GET() {
  const store = await load();
  const speech =
    store.notes.length === 0
      ? "No sticky notes saved yet."
      : `You’ve got ${store.notes.length} note${store.notes.length === 1 ? "" : "s"} on screen.`;
  const summaryLines = store.notes.map((n, i) => `${i + 1}. ${n.text.slice(0, 112)}`).join("\n");
  return NextResponse.json({ notes: store.notes, speech, summaryLines });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    text?: string;
    id?: string;
  };
  const action = String(body.action ?? "list").toLowerCase();
  let store = await load();
  let speech = "";

  if (action === "append" || action === "add") {
    const t = typeof body.text === "string" ? body.text.trim().slice(0, 620) : "";
    if (!t) {
      return NextResponse.json({ error: "empty text", notes: store.notes, speech: "I need text to jot down." }, { status: 400 });
    }
    const row = { id: uid("sn"), text: t, createdAt: new Date().toISOString() };
    store = { notes: [row, ...store.notes].slice(0, 64) };
    await save(store);
    speech = `Saved to colony notes — ${t.slice(0, 240)}`;
  } else if (action === "clear") {
    store = { notes: [] };
    await save(store);
    speech = "Cleared every sticky on this workstation.";
  } else if (action === "delete" && body.id) {
    store = { notes: store.notes.filter((note) => note.id !== body.id) };
    await save(store);
    speech = "Removed that sticky.";
  } else if (action === "list") {
    speech =
      store.notes.length === 0
        ? "The notes shelf is empty—say jot down …"
        : `${store.notes.length} colony note${store.notes.length === 1 ? "" : "s"} ready below.`;
  } else {
    return NextResponse.json({ error: "unknown action", notes: store.notes }, { status: 400 });
  }

  const summaryLines = store.notes.map((n, i) => `${i + 1}. ${n.text.slice(0, 116)}`).join("\n");
  return NextResponse.json({ notes: store.notes, speech, summaryLines });
}
