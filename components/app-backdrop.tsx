"use client";

import { useMemo } from "react";

export function AppBackdrop({ muted }: { muted: boolean }) {
  const image = useMemo(() => (muted ? "/backgrounds/night-video-reference.png" : "/backgrounds/colony-office-3d.png"), [muted]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: [
            "linear-gradient(135deg, rgba(3,4,10,.62), rgba(8,8,14,.20) 38%, rgba(3,4,10,.72))",
            `url(${image})`
          ].join(",")
        }}
      />
    </div>
  );
}
