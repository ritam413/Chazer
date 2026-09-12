// dashboard/components/Sidebar.tsx
// Primary navigation sidebar for desktop and mobile bottom navigation

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
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
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-surface-base border-r border-border-subtle transition-all duration-300 ease-in-out select-none ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-chazer-purple to-chazer-purple-light flex items-center justify-center text-white shadow-purple-glow group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-lg text-white tracking-tight leading-none group-hover:text-chazer-purple-light transition-colors">
                  Chazer
                </span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                  Autonomous Collections
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
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
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
                } py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-chazer-purple/20 text-white border border-chazer-purple/40 shadow-purple-glow font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-card border border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-chazer-purple-light' : 'text-gray-400 group-hover:text-gray-300'
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
                        ? 'absolute -top-1 -right-1 w-5 h-5 text-[10px] bg-tier3 text-white border-2 border-surface-base'
                        : 'ml-auto px-2 py-0.5 text-xs bg-tier3/20 text-tier3 border border-tier3/40'
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
        <div className="p-3 border-t border-border-subtle bg-surface-card/40">
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-2 py-1.5'
            } rounded-lg bg-surface-elevated/60 border border-border-subtle/60`}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-800/50 flex items-center justify-center text-chazer-purple-light">
              <UserCheck className="w-4 h-4" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-gray-200 truncate">Demo Owner</span>
                <span className="text-[10px] text-gray-400 truncate">demo_owner</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <nav
        data-testid="mobile-bottom-bar"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-surface-base/95 backdrop-blur-lg border-t border-border-subtle flex items-center justify-around px-2"
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
                isActive ? 'text-chazer-purple-light' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-chazer-purple-light' : ''}`} />
                {link.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-bold bg-tier3 text-white rounded-full">
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
