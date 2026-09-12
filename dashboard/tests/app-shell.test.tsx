import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from '../components/AppShell';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useChazerStore } from '../lib/store';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('FRONT-01: AppShell, Sidebar, and TopBar Component Suite', () => {
  beforeEach(() => {
    useChazerStore.setState({
      isSidebarCollapsed: false,
      isSweeping: false,
      lastSweepAt: '2026-09-12T14:00:00Z',
      summary: {
        total_overdue_amount: 83890,
        count_by_tier: { TIER_1: 2, TIER_2: 2, TIER_3: 4 },
        pending_decisions: 3,
        sent_this_week: 4,
      },
    });
  });

  describe('Sidebar Component', () => {
    it('renders Chazer brand logo and navigation links', () => {
      render(<Sidebar />);
      expect(screen.getByText('Chazer')).toBeInTheDocument();
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Decisions').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Audit Log').length).toBeGreaterThan(0);
    });

    it('displays the pending decisions badge count from store', () => {
      render(<Sidebar />);
      // Pending decisions count is 3
      const badges = screen.getAllByText('3');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('highlights the active route based on pathname', () => {
      render(<Sidebar />);
      const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard/i });
      expect(dashboardLinks.length).toBeGreaterThan(0);
      const desktopDashboardLink = dashboardLinks[0];
      expect(desktopDashboardLink.getAttribute('href')).toBe('/dashboard');
      expect(desktopDashboardLink.className).toMatch(/chazer-purple|bg-surface-card|active/);
    });

    it('supports collapsing and expanding via collapse toggle', () => {
      render(<Sidebar />);
      const toggleBtn = screen.getByLabelText(/Collapse sidebar|Toggle sidebar/i);
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(useChazerStore.getState().isSidebarCollapsed).toBe(true);
    });

    it('renders mobile navigation links in bottom tab bar', () => {
      const { container } = render(<Sidebar />);
      const mobileNav = container.querySelector('[data-testid="mobile-bottom-bar"]');
      expect(mobileNav).toBeInTheDocument();
    });
  });

  describe('TopBar Component', () => {
    it('renders the sweep status indicator and run sweep button', () => {
      render(<TopBar />);
      expect(screen.getByText(/Last sweep:/i)).toBeInTheDocument();
      const runBtn = screen.getByRole('button', { name: /Run Sweep/i });
      expect(runBtn).toBeInTheDocument();
      expect(runBtn).not.toBeDisabled();
    });

    it('triggers a sweep when clicking Run Sweep button', async () => {
      render(<TopBar />);
      const runBtn = screen.getByRole('button', { name: /Run Sweep/i });
      fireEvent.click(runBtn);
      expect(useChazerStore.getState().isSweeping).toBe(true);
    });

    it('shows loading state on Run Sweep button when sweeping', () => {
      useChazerStore.setState({ isSweeping: true });
      render(<TopBar />);
      const runBtn = screen.getByRole('button', { name: /Sweeping|Running/i });
      expect(runBtn).toBeDisabled();
      expect(screen.getByText(/Sweep running/i)).toBeInTheDocument();
    });
  });

  describe('AppShell Component', () => {
    it('renders full shell layout with sidebar, topbar, and child content', () => {
      render(
        <AppShell>
          <div data-testid="test-content">Dashboard Main Content</div>
        </AppShell>
      );
      expect(screen.getByText('Chazer')).toBeInTheDocument();
      expect(screen.getByText(/Last sweep:/i)).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Main Content')).toBeInTheDocument();
    });
  });
});
