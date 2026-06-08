import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NarrativePane } from './NarrativePane';

describe('NarrativePane', () => {
  it('renders full text immediately when typewriter is off', () => {
    render(<NarrativePane text="你站在废墟里。" loading={false} typewriter={false} />);
    expect(screen.getByTestId('narrative-text')).toHaveTextContent('你站在废墟里。');
  });

  it('shows loading indicator when text is empty and loading', () => {
    render(<NarrativePane text="" loading={true} typewriter={false} />);
    expect(screen.getByTestId('narrative-loading')).toBeInTheDocument();
  });

  it('shows trailing loading indicator alongside text when both present', () => {
    render(<NarrativePane text="你看见远处的火光。" loading={true} typewriter={false} />);
    expect(screen.getByTestId('narrative-text')).toBeInTheDocument();
    expect(screen.getByTestId('narrative-loading')).toBeInTheDocument();
  });

  it('renders no text and no loading when empty and not loading', () => {
    render(<NarrativePane text="" loading={false} typewriter={false} />);
    expect(screen.queryByTestId('narrative-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('narrative-text')).toHaveTextContent('');
  });

  it('starts typewriter empty and progresses through the text', () => {
    const { rerender } = render(
      <NarrativePane text="你站在废墟里。" loading={false} typewriter={true} />
    );
    expect(screen.getByTestId('narrative-text').textContent).toBe('');
    rerender(<NarrativePane text="另一段话。" loading={false} typewriter={true} />);
    expect(screen.getByTestId('narrative-text').textContent).toBe('');
  });

  it('handles empty text in typewriter mode without crashing', () => {
    render(<NarrativePane text="" loading={false} typewriter={true} />);
    expect(screen.getByTestId('narrative-text').textContent).toBe('');
  });
});
