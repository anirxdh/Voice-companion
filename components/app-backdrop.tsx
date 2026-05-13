"use client";

export function AppBackdrop({ muted }: { muted: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/backgrounds/animate_202605112133.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{ opacity: muted ? 0.28 : 0.72 }}
      />

      {}
      <div
        className="absolute inset-0"
        style={{
          background: muted
            ? "linear-gradient(135deg, rgba(3,4,10,.88), rgba(5,6,16,.78))"
            : "linear-gradient(135deg, rgba(3,4,10,.42), rgba(8,8,14,.14) 38%, rgba(3,4,10,.52))",
        }}
      />

      {}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,8,0.62) 100%)",
        }}
      />
    </div>
  );
}
