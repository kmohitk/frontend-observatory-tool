'use client';

export function Topbar({ connected }: { connected: boolean }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-obs-border bg-obs-bg/80 px-6 backdrop-blur">
      <h1 className="text-sm font-medium text-obs-text">Live session</h1>
      <div className="flex items-center gap-2 text-xs text-obs-muted">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
          }`}
          aria-hidden
        />
        <span>{connected ? 'WebSocket connected' : 'Disconnected — start ws server (port 3001)'}</span>
      </div>
    </header>
  );
}
