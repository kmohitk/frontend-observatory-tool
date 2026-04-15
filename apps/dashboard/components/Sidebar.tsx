'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/resources', label: 'Resources' },
  { href: '/insights', label: 'Insights' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[240px] flex-col border-r border-obs-border bg-[#0d1524]">
      <div className="border-b border-obs-border px-5 py-4">
        <div className="text-sm font-semibold text-obs-text">Observatory</div>
        <div className="text-xs text-obs-muted">Performance</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-obs-card text-obs-text'
                  : 'text-obs-muted hover:bg-obs-card/60 hover:text-obs-text'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
