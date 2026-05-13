"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useVeilStore } from "@/store/use-veil-store";

interface BrowserPreviewProps {
  onNavigate?: (url: string) => void;
}

export function BrowserPreview({ onNavigate }: BrowserPreviewProps) {
  const [url, setUrl] = useState("about:blank");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const startAgentBrowser = async () => {
      try {
        const { spawn } = await import("child_process");
        
        const dashboard = spawn("agent-browser", ["dashboard", "start", "--port", "4849"], {
          stdio: "pipe",
          shell: true,
        });

        dashboard.stdout.on("data", (data) => {
          const output = data.toString();
          console.log("agent-browser:", output);
          if (output.includes("http://localhost:4849")) {
            setDashboardUrl("http://localhost:4849");
          }
        });

        dashboard.stderr.on("data", (data) => {
          console.error("agent-browser error:", data.toString());
        });

        setTimeout(() => {
          if (!dashboardUrl) {
            setDashboardUrl("http://localhost:4849");
          }
        }, 3000);
      } catch (err) {
        console.error("Failed to start agent-browser:", err);
      }
    };

    startAgentBrowser();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const openUrl = useCallback(async (targetUrl: string) => {
    setIsLoading(true);
    setError(null);
    setUrl(targetUrl);
    
    if (onNavigate) {
      onNavigate(targetUrl);
    }

    try {
      const response = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", url: targetUrl }),
      });
      
      if (response.ok) {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, [onNavigate]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => openUrl("https://www.google.com")}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Google
        </button>
        <button
          onClick={() => openUrl("https://www.youtube.com")}
          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white"
        >
          YouTube
        </button>
        <button
          onClick={() => openUrl("https://github.com")}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          GitHub
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                openUrl(url.startsWith("http") ? url : `https://${url}`);
              }
            }}
            className="w-full px-3 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-white"
            placeholder="Enter URL..."
          />
        </div>
        {isLoading && <span className="text-xs text-yellow-400">Loading...</span>}
      </div>

      <div className="flex-1 relative">
        {dashboardUrl ? (
          <iframe
            ref={iframeRef}
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Browser Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🌐</div>
              <p>Starting browser...</p>
              <p className="text-sm mt-2">Run: agent-browser install</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>

      <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <span className="text-green-400">●</span> Agent Browser Connected | URL: {url}
      </div>
    </div>
  );
}