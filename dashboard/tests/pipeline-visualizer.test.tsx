import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PipelineVisualizer } from '../components/PipelineVisualizer';

describe('FRONT-06: PipelineVisualizer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 4 pipeline stage cards with titles and badges', () => {
    render(<PipelineVisualizer />);

    expect(screen.getByTestId('pipeline-visualizer')).toBeInTheDocument();
    expect(screen.getByTestId('stage-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('stage-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('stage-card-3')).toBeInTheDocument();
    expect(screen.getByTestId('stage-card-4')).toBeInTheDocument();

    expect(screen.getAllByText(/Receivables Ingested/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tone & Risk Matrix/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dual-Lane Dispatch/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ledger & Audit Trail/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/8 Invoices · DB Seed/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule \+ LLM Guard/i)).toBeInTheDocument();
    expect(screen.getByText(/Resend \+ Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Immutable Telemetry/i)).toBeInTheDocument();
  });

  it('highlights the active stage (stage 1 by default or provided initialStage)', () => {
    const { rerender } = render(<PipelineVisualizer initialStage={1} />);

    const stage1 = screen.getByTestId('stage-card-1');
    expect(stage1).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('stage-card-2')).toHaveAttribute('data-active', 'false');

    rerender(<PipelineVisualizer initialStage={3} />);
    expect(screen.getByTestId('stage-card-3')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('stage-card-1')).toHaveAttribute('data-active', 'false');
  });

  it('updates the active stage and calls onStageChange when a stage card is clicked', () => {
    const onStageChange = vi.fn();
    render(<PipelineVisualizer onStageChange={onStageChange} />);

    const stage2 = screen.getByTestId('stage-card-2');
    fireEvent.click(stage2);

    expect(stage2).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('stage-card-1')).toHaveAttribute('data-active', 'false');
    expect(onStageChange).toHaveBeenCalledWith(2);

    const stage4 = screen.getByTestId('stage-card-4');
    fireEvent.click(stage4);
    expect(stage4).toHaveAttribute('data-active', 'true');
    expect(onStageChange).toHaveBeenCalledWith(4);
  });

  it('starts simulation loop and advances through stages sequentially', () => {
    render(<PipelineVisualizer />);

    const simulateBtn = screen.getByTestId('simulate-sweep-button');
    expect(simulateBtn).toBeInTheDocument();

    // Click simulate sweep to start simulation
    fireEvent.click(simulateBtn);
    expect(screen.getByTestId('stage-card-1')).toHaveAttribute('data-active', 'true');

    // Advance 2 seconds -> stage 2
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('stage-card-2')).toHaveAttribute('data-active', 'true');

    // Advance 2 seconds -> stage 3
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('stage-card-3')).toHaveAttribute('data-active', 'true');

    // Advance 2 seconds -> stage 4
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('stage-card-4')).toHaveAttribute('data-active', 'true');

    // Advance 2 seconds -> loops back to stage 1
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('stage-card-1')).toHaveAttribute('data-active', 'true');
  });

  it('pauses and resets the simulation correctly', () => {
    render(<PipelineVisualizer />);

    const simulateBtn = screen.getByTestId('simulate-sweep-button');
    fireEvent.click(simulateBtn);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('stage-card-2')).toHaveAttribute('data-active', 'true');

    // Pause
    const pauseBtn = screen.getByTestId('simulate-sweep-button');
    fireEvent.click(pauseBtn);

    // Advancing timers should not change stage while paused
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('stage-card-2')).toHaveAttribute('data-active', 'true');

    // Reset button
    const resetBtn = screen.getByTestId('reset-pipeline-button');
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('stage-card-1')).toHaveAttribute('data-active', 'true');
  });

  it('displays detailed metric breakdowns for the currently active stage', () => {
    render(<PipelineVisualizer initialStage={2} />);

    expect(screen.getByText(/4 Auto · 4 Escalated/i)).toBeInTheDocument();
    expect(screen.getByText(/72h & \$10k\+/i)).toBeInTheDocument();
    expect(screen.getByTestId('stage-detail-callout')).toBeInTheDocument();
  });
});
