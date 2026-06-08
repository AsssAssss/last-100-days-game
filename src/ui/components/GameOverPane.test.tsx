import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameOverPane } from './GameOverPane';

describe('GameOverPane', () => {
  it('shows the day reached', () => {
    render(<GameOverPane day={42} reason="伤重不治" onRestart={() => {}} />);
    expect(screen.getByText(/第 42 天/)).toBeInTheDocument();
    expect(screen.getByText(/伤重不治/)).toBeInTheDocument();
  });

  it('renders without reason gracefully', () => {
    render(<GameOverPane day={7} onRestart={() => {}} />);
    expect(screen.getByText(/第 7 天/)).toBeInTheDocument();
  });

  it('calls onRestart when restart button is clicked', () => {
    const onRestart = vi.fn();
    render(<GameOverPane day={1} reason="x" onRestart={onRestart} />);
    fireEvent.click(screen.getByTestId('restart-button'));
    expect(onRestart).toHaveBeenCalledOnce();
  });
});
