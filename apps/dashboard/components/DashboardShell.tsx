'use client';

import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { useMetricsWebSocket } from '@/lib/useMetricsWebSocket';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { connected } = useMetricsWebSocket();

  return (
    <div className="min-h-screen bg-obs-bg text-obs-text">
      <Sidebar />
      <div className="pl-[240px]">
        <Topbar connected={connected} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
