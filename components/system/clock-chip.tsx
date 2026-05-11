"use client";

import { useEffect, useState } from "react";

export function ClockChip() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full border border-white/12 bg-black/32 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
      {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
      {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
    </div>
  );
}
