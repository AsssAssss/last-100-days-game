import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { PassphraseGate } from './PassphraseGate';

const STORAGE_KEY = 'last-100-days:passphrase-ok';

function withCleanStorage() {
  window.localStorage.removeItem(STORAGE_KEY);
}

describe('PassphraseGate', () => {
  it('renders children directly when no passphrase is configured', () => {
    withCleanStorage();
    render(
      <PassphraseGate expected={undefined}>
        <div data-testid="protected">secret</div>
      </PassphraseGate>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.queryByTestId('passphrase-gate')).not.toBeInTheDocument();
  });

  it('shows the gate when passphrase is required and not yet unlocked', () => {
    withCleanStorage();
    render(
      <PassphraseGate expected="secret123">
        <div data-testid="protected">x</div>
      </PassphraseGate>
    );
    expect(screen.getByTestId('passphrase-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('unlocks when correct passphrase is submitted', () => {
    withCleanStorage();
    render(
      <PassphraseGate expected="secret123">
        <div data-testid="protected">x</div>
      </PassphraseGate>
    );
    fireEvent.change(screen.getByTestId('passphrase-input'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(screen.getByTestId('passphrase-form'));
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('rejects wrong passphrase and clears the input', () => {
    withCleanStorage();
    render(
      <PassphraseGate expected="secret123">
        <div data-testid="protected">x</div>
      </PassphraseGate>
    );
    const input = screen.getByTestId('passphrase-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByTestId('passphrase-form'));
    expect(input.value).toBe('');
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('clears shake state after the timeout fires (rejection feedback)', () => {
    vi.useFakeTimers();
    try {
      withCleanStorage();
      render(
        <PassphraseGate expected="x">
          <div data-testid="protected">x</div>
        </PassphraseGate>
      );
      fireEvent.change(screen.getByTestId('passphrase-input'), {
        target: { value: 'wrong' },
      });
      fireEvent.submit(screen.getByTestId('passphrase-form'));
      const form = screen.getByTestId('passphrase-form');
      expect(form.className).toContain('animate-pulse');
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(form.className).not.toContain('animate-pulse');
    } finally {
      vi.useRealTimers();
    }
  });

  it('remembers unlock in localStorage so subsequent mounts skip the gate', () => {
    withCleanStorage();
    const { unmount } = render(
      <PassphraseGate expected="secret123">
        <div data-testid="protected">x</div>
      </PassphraseGate>
    );
    fireEvent.change(screen.getByTestId('passphrase-input'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(screen.getByTestId('passphrase-form'));
    unmount();

    render(
      <PassphraseGate expected="secret123">
        <div data-testid="protected">x</div>
      </PassphraseGate>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.queryByTestId('passphrase-gate')).not.toBeInTheDocument();
  });

  it('falls back gracefully when localStorage throws on read', () => {
    withCleanStorage();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      render(
        <PassphraseGate expected="secret">
          <div data-testid="protected">x</div>
        </PassphraseGate>
      );
      expect(screen.getByTestId('passphrase-gate')).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it('falls back gracefully when localStorage throws on write', () => {
    withCleanStorage();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      render(
        <PassphraseGate expected="ok">
          <div data-testid="protected">x</div>
        </PassphraseGate>
      );
      fireEvent.change(screen.getByTestId('passphrase-input'), {
        target: { value: 'ok' },
      });
      expect(() =>
        fireEvent.submit(screen.getByTestId('passphrase-form'))
      ).not.toThrow();
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
