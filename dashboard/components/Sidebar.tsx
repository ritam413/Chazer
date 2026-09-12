// dashboard/components/Sidebar.tsx
// Primary navigation sidebar for desktop and mobile bottom navigation in Monad Editorial Style

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useChazerStore } from '../lib/store';
import { NavLinkItem } from '../lib/types';

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, summary } = useChazerStore();
  const pendingDecisions = summary?.pending_decisions ?? 0;

  const navLinks: NavLinkItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Decisions',
      href: '/decisions',
      icon: AlertTriangle,
      badge: pendingDecisions > 0 ? pendingDecisions : undefined,
    },
    {
      label: 'Audit Log',
      href: '/audit',
      icon: History,
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r transition-all duration-300 ease-in-out select-none ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: 'var(--text-main)' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-mint"></span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-editorial text-2xl tracking-serif-tight leading-none" style={{ color: 'var(--text-main)' }}>
                  Chazer
                </span>
                <span className="text-[10px] font-mono uppercase tracking-mono-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Autonomous A/R
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-full border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto font-mono">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href === '/dashboard' && pathname === '/') ||
              (pathname && pathname.startsWith(link.href) && link.href !== '/dashboard');

            return (
              <Link
                key={link.href}
                href={link.href}
                title={isSidebarCollapsed ? link.label : undefined}
                className={`group flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-4'
                } py-3 rounded-pill text-xs uppercase tracking-mono-wide font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'active bg-chazer-purple text-white shadow-sm font-semibold'
                    : 'text-graphite hover:text-off-black hover:bg-surface-card border border-transparent'
                }`}
                style={isActive ? { backgroundColor: 'var(--text-main)', color: 'var(--bg-page)' } : { color: 'var(--text-sub)' }}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-parchment' : 'opacity-70 group-hover:opacity-100'
                  }`}
                />

                {!isSidebarCollapsed && (
                  <span className="ml-3 truncate">{link.label}</span>
                )}

                {/* Badge for pending decisions */}
                {link.badge !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center font-bold rounded-full ${
                      isSidebarCollapsed
                        ? 'absolute -top-1 -right-1 w-5 h-5 text-[10px] bg-coral text-off-black border-2'
                        : 'ml-auto px-2 py-0.5 text-[10px] bg-coral/30 text-off-black border border-coral font-mono'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Account Section */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-3 py-2'
            } rounded-card border`}
            style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--chip-bg)', color: 'var(--text-main)' }}>
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 font-mono">
                <span className="text-xs font-medium truncate" style={{ color: 'var(--text-main)' }}>Demo Owner</span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>demo_owner</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <nav
        data-testid="mobile-bottom-bar"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 backdrop-blur-lg border-t flex items-center justify-around px-2 font-mono"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href === '/dashboard' && pathname === '/') ||
            (pathname && pathname.startsWith(link.href) && link.href !== '/dashboard');

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                isActive ? 'text-lake-blue font-bold' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ color: isActive ? 'var(--btn-primary)' : 'var(--text-sub)' }}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {link.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-bold bg-coral text-off-black rounded-full font-mono">
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-mono-tight mt-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
