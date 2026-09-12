// dashboard/components/AppShell.tsx
// Core application layout shell combining Sidebar, TopBar, and responsive viewport

'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useChazerStore } from '../lib/store';
import { AppShellProps } from '../lib/types';

export function AppShell({ children }: AppShellProps) {
  const { isSidebarCollapsed } = useChazerStore();

  return (
    <div className="min-h-screen bg-surface-base text-[#F0F0F5] flex flex-col selection:bg-chazer-purple selection:text-white">
      {/* Primary Sidebar (Desktop & Tablet + Mobile Tab Bar) */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Operational Header */}
        <TopBar />

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
