"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuperNovaStore } from "@/store/use-supernova-store";

function safeHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").replace(/^www\./, ""); }
}

type Status = "loading" | "ready" | "offline";

export function BrowserModal() {
  const browserModalUrl = useSuperNovaStore((s) => s.browserModalUrl);
  const closeBrowserModal = useSuperNovaStore((s) => s.closeBrowserModal);
  const [inputUrl, setInputUrl] = useState("");
  const [displayUrl, setDisplayUrl] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const inputRef = useRef<HTMLInputElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOpen = browserModalUrl !== null;

  
  useEffect(() => {
    if (!isOpen || !browserModalUrl) return;
    setDisplayUrl(browserModalUrl);
    setInputUrl(browserModalUrl);
    setStatus("loading");
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    
    fetch("/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dashboard" }),
    })
      .then(() =>
        fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open", url: browserModalUrl }),
        })
      )
      .then(() => {
        
        loadTimerRef.current = setTimeout(() => setStatus("ready"), 2200);
      })
      .catch(() => {
        loadTimerRef.current = setTimeout(() => setStatus("offline"), 800);
      });

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [isOpen, browserModalUrl]);

  
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBrowserModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeBrowserModal]);

  const navigate = useCallback(
    (raw: string) => {
      const url = raw.trim().startsWith("http")
        ? raw.trim()
        : raw.includes(".") && !raw.includes(" ")
          ? `https://${raw.trim()}`
          : `https://www.google.com/search?q=${encodeURIComponent(raw.trim())}`;

      setDisplayUrl(url);
      setInputUrl(url);
      setStatus("loading");

      fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", url }),
      })
        .then(() => {
          if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
          loadTimerRef.current = setTimeout(() => setStatus("ready"), 1800);
        })
        .catch(() => setStatus("offline"));
    },
    []
  );

  if (!isOpen) return null;

  const hostname = safeHostname(displayUrl);
  const quickLinks = [
    { label: "Google", url: "https://www.google.com" },
    { label: "YouTube", url: "https://www.youtube.com" },
    { label: "GitHub", url: "https://github.com" },
    { label: "Reddit", url: "https://www.reddit.com" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,8,0.78)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) closeBrowserModal(); }}
    >
      <div
        className="colony-panel relative flex flex-col overflow-hidden"
        style={{ width: "min(92vw,1120px)", height: "min(90vh,820px)" }}
      >
        {}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0 select-none"
          style={{
            background: "rgba(0,0,0,0.35)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {}
          <button
            onClick={closeBrowserModal}
            aria-label="Close browser"
            className="w-3 h-3 rounded-full transition-opacity hover:opacity-75 focus:outline-none"
            style={{ background: "#ff5f57" }}
          />
          <div className="w-3 h-3 rounded-full opacity-30" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full opacity-30" style={{ background: "#28c840" }} />

          <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />

          {}
          {quickLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => navigate(l.url)}
              className="hidden sm:block px-2 py-0.5 rounded text-xs font-mono transition-colors hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {l.label}
            </button>
          ))}

          {}
          <div className="flex-1 flex items-center gap-2 min-w-0 mx-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-1 rounded-md min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                ⬤
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(inputUrl); }}
                className="flex-1 bg-transparent text-xs font-mono outline-none min-w-0"
                style={{ color: "rgba(255,255,255,0.72)", caretColor: "rgba(155,200,255,0.9)" }}
                placeholder="URL or search…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              onClick={() => navigate(inputUrl)}
              className="shrink-0 px-3 py-1 rounded text-xs font-mono transition-opacity hover:opacity-80"
              style={{
                background: "rgba(99,102,241,0.22)",
                border: "1px solid rgba(99,102,241,0.28)",
                color: "rgba(180,183,255,0.9)",
              }}
            >
              Go
            </button>
          </div>

          {}
          {status === "loading" && (
            <span className="shrink-0 text-xs font-mono" style={{ color: "rgba(255,176,90,0.65)" }}>
              ● loading
            </span>
          )}

          <span
            className="hidden md:block shrink-0 text-xs font-mono truncate max-w-[110px]"
            style={{ color: "rgba(255,255,255,0.22)" }}
            title={displayUrl}
          >
            {hostname}
          </span>
        </div>

        {}
        <div className="flex-1 relative overflow-hidden">
          {}
          {status === "ready" && (
            <iframe
              src="http://localhost:4849"
              className="absolute inset-0 w-full h-full border-0"
              title="Agent Browser"
              allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
            />
          )}

          {}
          {status === "loading" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-5"
              style={{ background: "rgba(4,5,14,0.97)" }}
            >
              <div
                className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(99,102,241,0.3)",
                  borderTopColor: "rgba(99,102,241,0.85)",
                }}
              />
              <div className="text-center">
                <p className="text-sm font-mono mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Navigating to{" "}
                  <span style={{ color: "rgba(167,170,255,0.85)" }}>{hostname}</span>
                </p>
                <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
                  agent-browser · http:
                </p>
              </div>
            </div>
          )}

          {}
          {status === "offline" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-6"
              style={{ background: "rgba(4,5,14,0.97)" }}
            >
              <div className="text-6xl select-none">🌐</div>
              <div className="text-center space-y-1">
                <p className="text-base font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Agent Browser not running
                </p>
                <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Install with:{" "}
                  <code
                    className="px-1 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    npm install -g agent-browser
                  </code>
                </p>
              </div>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-sm font-mono transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.32)",
                  color: "rgba(167,170,255,0.92)",
                }}
              >
                Open {hostname} in system browser ↗
              </a>
              <button
                onClick={() => { setStatus("loading"); navigate(displayUrl); }}
                className="text-xs font-mono underline"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {}
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 shrink-0"
          style={{
            background: "rgba(0,0,0,0.22)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background:
                status === "ready" ? "#28c840" : status === "loading" ? "#febc2e" : "#ff5f57",
            }}
          />
          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
            {status === "ready"
              ? "Agent Browser · connected"
              : status === "loading"
                ? "Agent Browser · starting"
                : "Agent Browser · offline"}
          </span>
          <span className="flex-1" />
          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.14)" }}>
            ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}
