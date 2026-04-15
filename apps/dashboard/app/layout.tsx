import type { Metadata } from 'next';
import './globals.css';
import { DashboardShell } from '@/components/DashboardShell';

export const metadata: Metadata = {
  title: 'Frontend Performance Observatory',
  description: 'Live Core Web Vitals and resource timing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-obs-bg text-obs-text">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
