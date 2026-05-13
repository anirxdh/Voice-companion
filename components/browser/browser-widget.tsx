"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useSuperNovaStore } from "@/store/use-supernova-store";

function safeHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").replace(/^www\./, ""); }
}

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}


function toIframeSrc(url: string): { src: string; isYoutube: boolean } {
  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/i);
  if (ytWatch?.[1]) {
    return {
      src: `https://www.youtube-nocookie.com/embed/${ytWatch[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      isYoutube: true,
    };
  }
  const ytEmbed = url.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]+)/i);
  if (ytEmbed?.[1]) {
    const sep = url.includes("?") ? "&" : "?";
    return {
      src: `${url}${sep}autoplay=1&rel=0&modestbranding=1`,
      isYoutube: true,
    };
  }
  return { src: url, isYoutube: false };
}

export function BrowserWidget() {
  const browserModalUrl   = useSuperNovaStore((s) => s.browserModalUrl);
  const openBrowserModal  = useSuperNovaStore((s) => s.openBrowserModal);
  const closeBrowserModal = useSuperNovaStore((s) => s.closeBrowserModal);
  const ambientPreview    = useSuperNovaStore((s) => s.ambientPreview);
  const relayPreview      = useSuperNovaStore((s) => s.relayPreview);

  const [minimized, setMinimized]       = useState(false);
  const [loadError, setLoadError]       = useState(false);
  const [urlInput, setUrlInput]         = useState("");
  const [isHoveringFrame, setHovering]  = useState(false);
  const [history, setHistory]           = useState<string[]>([]);
  const iframeRef                        = useRef<HTMLIFrameElement>(null);
  const urlInputRef                      = useRef<HTMLInputElement>(null);

  const isOpen        = browserModalUrl !== null;
  const hasLeftPanel  = Boolean(ambientPreview);
  const hasRightPanel = Boolean(relayPreview);

  const handleClose = useCallback(() => closeBrowserModal(), [closeBrowserModal]);

  useEffect(() => {
    if (browserModalUrl) {
      setMinimized(false);
      setLoadError(false);
      setUrlInput(browserModalUrl);
      setHistory((h) => (h[h.length - 1] === browserModalUrl ? h : [...h, browserModalUrl]));
    }
  }, [browserModalUrl]);

  // Escape key closes the browser
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  const navigateTo = useCallback((raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return;
    openBrowserModal(url);
  }, [openBrowserModal]);

  const goBack = useCallback(() => {
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    setHistory((h) => h.slice(0, -1));
    openBrowserModal(prev);
  }, [history, openBrowserModal]);

  const reload = useCallback(() => {
    if (!browserModalUrl) return;
    setLoadError(false);
    // Force iframe reload by toggling key via re-opening same URL
    openBrowserModal(browserModalUrl + (browserModalUrl.includes("?") ? "&_r=" : "?_r=") + Date.now());
    setTimeout(() => openBrowserModal(browserModalUrl), 50);
  }, [browserModalUrl, openBrowserModal]);

  if (!isOpen || !browserModalUrl) return null;

  const { src, isYoutube } = toIframeSrc(browserModalUrl);
  const hostname = safeHostname(browserModalUrl);

  const PANEL_OFFSET = "calc(min(34vw, 400px) + 8px)";

  const containerStyle: React.CSSProperties = minimized
    ? {
        position: "fixed",
        top: 0,
        left: hasLeftPanel ? `calc(min(34vw, 400px) + 16px)` : "50%",
        transform: hasLeftPanel ? "none" : "translateX(-50%)",
        zIndex: 86,
        width: "auto",
        minWidth: 240,
      }
    : {
        position: "fixed",
        top: "clamp(36px, 4vh, 60px)",
        bottom: "clamp(120px, 14vh, 160px)",
        left: hasLeftPanel ? PANEL_OFFSET : "clamp(16px, 2vw, 40px)",
        right: hasRightPanel ? PANEL_OFFSET : "clamp(16px, 2vw, 40px)",
        zIndex: 86,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)",
      };

  return (
    <div style={containerStyle}>
      <div
        className="colony-panel flex flex-col overflow-hidden"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: minimized ? "0 0 10px 10px" : 14,
          background: "rgba(4,5,14,0.96)",
        }}
      >
        {/* ── Title / traffic-light bar ─────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center gap-2 px-3 select-none"
          style={{
            height: 32,
            background: "rgba(4,5,14,0.92)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            aria-label="Close browser"
            style={{ background: "#ff5f57", width: 12, height: 12, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          />
          {/* Minimise */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}
            aria-label={minimized ? "Restore" : "Minimise"}
            style={{ background: minimized ? "#28c840" : "rgba(40,200,64,0.4)", width: 12, height: 12, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          />

          {/* Site label */}
          <span
            className="ml-1 font-mono text-[10px] shrink-0"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            {isYoutube ? "youtube" : hostname}
          </span>

          {/* Open in new tab */}
          <a
            href={browserModalUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 font-mono text-[9px]"
            style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)")}
          >
            <ExternalLink size={10} />
          </a>
        </div>

        {/* ── Address bar ───────────────────────────────────────────────── */}
        {!minimized && (
          <div
            className="flex shrink-0 items-center gap-1.5 px-2"
            style={{
              height: 34,
              background: "rgba(8,10,22,0.90)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Back */}
            <button
              type="button"
              onClick={goBack}
              disabled={history.length < 2}
              aria-label="Back"
              style={{
                background: "none", border: "none", cursor: history.length < 2 ? "default" : "pointer",
                padding: "2px 4px", borderRadius: 4, flexShrink: 0,
                color: history.length < 2 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)",
              }}
              onMouseEnter={(e) => { if (history.length >= 2) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = history.length < 2 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)"; }}
            >
              <ArrowLeft size={13} />
            </button>

            {/* Reload */}
            <button
              type="button"
              onClick={reload}
              aria-label="Reload"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "2px 4px", borderRadius: 4, flexShrink: 0,
                color: "rgba(255,255,255,0.4)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              <RefreshCw size={12} />
            </button>

            {/* URL input */}
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); navigateTo(urlInput); urlInputRef.current?.blur(); }
                if (e.key === "Escape") { setUrlInput(browserModalUrl); urlInputRef.current?.blur(); }
              }}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 min-w-0 font-mono text-[11px] rounded-md px-2.5"
              style={{
                height: 24,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.78)",
                outline: "none",
              }}
              onFocusCapture={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.55)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              placeholder="Search or enter URL…"
            />
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────────────── */}
        {!minimized && (
          <div
            className="flex-1 relative overflow-hidden"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {!loadError ? (
              <>
                <iframe
                  ref={iframeRef}
                  key={src}
                  src={src}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none", background: "#000" }}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write"
                  allowFullScreen
                  title={hostname}
                  onError={() => setLoadError(true)}
                />
                {/* Live indicator — fades in on hover, shows iframe is interactive */}
                {isHoveringFrame && (
                  <div
                    className="pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px]"
                    style={{
                      background: "rgba(4,5,14,0.72)",
                      border: "1px solid rgba(99,220,155,0.28)",
                      color: "rgba(99,220,155,0.72)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(99,220,155,0.88)", display: "inline-block", boxShadow: "0 0 5px rgba(99,220,155,0.6)" }} />
                    live
                  </div>
                )}
              </>
            ) : (
              /* Fallback when site blocks iframe embedding */
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ background: "rgba(4,5,14,0.97)" }}
              >
                <p className="font-mono text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                  This site blocks embedding
                </p>
                <a
                  href={browserModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-mono text-[11px] underline"
                  style={{ color: "rgba(99,102,241,0.9)" }}
                >
                  <ExternalLink size={12} />
                  Open {hostname} in new tab
                </a>
                <button
                  type="button"
                  onClick={() => { setLoadError(false); navigateTo(`https://www.google.com/search?q=${encodeURIComponent(urlInput.trim())}`); }}
                  className="font-mono text-[10px]"
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "4px 10px", color: "rgba(255,255,255,0.44)", cursor: "pointer" }}
                >
                  Search Google instead
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
