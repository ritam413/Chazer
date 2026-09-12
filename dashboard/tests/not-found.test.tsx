import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '../app/not-found';

describe('404 Not Found Page', () => {
  it('renders 404 error code and domain recovery messaging', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Uncollectible Route|Ledger Entry Missing/i)).toBeInTheDocument();
  });

  it('renders navigation links to return to dashboard and decisions', () => {
    render(<NotFound />);
    const dashboardLink = screen.getByRole('link', { name: /Return to Dashboard|Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.getAttribute('href')).toBe('/dashboard');

    const decisionsLink = screen.getByRole('link', { name: /Decision Queue|Decisions/i });
    expect(decisionsLink).toBeInTheDocument();
    expect(decisionsLink.getAttribute('href')).toBe('/decisions');
  });

  it('renders themed invoice receipt card with missing route details', () => {
    render(<NotFound />);
    expect(screen.getByText(/INV-404-NOT-FOUND|404-NOT-FOUND/i)).toBeInTheDocument();
  });
});
