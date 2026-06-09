import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginScreen } from './LoginScreen';

function noop() {
  return undefined as unknown as Promise<never>;
}

describe('LoginScreen', () => {
  it('renders the title and form fields', () => {
    render(<LoginScreen onLogin={noop} animate={false} />);
    expect(screen.getByText('末日 100 天')).toBeInTheDocument();
    expect(screen.getByTestId('login-username')).toBeInTheDocument();
    expect(screen.getByTestId('login-pin')).toBeInTheDocument();
  });

  it('disables submit until both fields are valid', () => {
    render(<LoginScreen onLogin={noop} animate={false} />);
    const submit = screen.getByTestId('login-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'xiao' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
    expect(submit.disabled).toBe(false);
  });

  it('strips non-digits from PIN field', () => {
    render(<LoginScreen onLogin={noop} animate={false} />);
    const pin = screen.getByTestId('login-pin') as HTMLInputElement;
    fireEvent.change(pin, { target: { value: '1a2b3c4d' } });
    expect(pin.value).toBe('1234');
  });

  it('calls onLogin with trimmed inputs on submit', async () => {
    const onLogin = vi.fn(async () => ({
      ok: true as const,
      userId: 'u',
      token: 't',
      created: true,
    }));
    render(<LoginScreen onLogin={onLogin} animate={false} />);
    fireEvent.change(screen.getByTestId('login-username'), { target: { value: '  xiaoxue  ' } });
    fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('login-form'));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('xiaoxue', '1234'));
  });

  it('shows wrong-pin error when login fails with wrong_pin', async () => {
    const onLogin = vi.fn(async () => ({ ok: false as const, error: 'wrong_pin' as const }));
    render(<LoginScreen onLogin={onLogin} animate={false} />);
    fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('login-form'));
    await waitFor(() =>
      expect(screen.getByTestId('login-error').textContent).toMatch(/PIN 不对/)
    );
  });

  it.each([
    ['invalid_input', /用户名或 PIN 格式不对/],
    ['network', /网络错误/],
    ['server', /服务器错误/],
  ] as const)(
    'shows %s error message',
    async (errorCode, expectedMatch) => {
      const onLogin = vi.fn(async () => ({
        ok: false as const,
        error: errorCode,
        message: 'detail',
      }));
      render(<LoginScreen onLogin={onLogin} animate={false} />);
      fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'x' } });
      fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
      fireEvent.submit(screen.getByTestId('login-form'));
      await waitFor(() =>
        expect(screen.getByTestId('login-error').textContent).toMatch(expectedMatch)
      );
    }
  );

  it('disables form while submitting', async () => {
    let resolve: ((v: { ok: false; error: 'wrong_pin' }) => void) | null = null;
    const onLogin = vi.fn(
      () =>
        new Promise<{ ok: false; error: 'wrong_pin' }>((r) => {
          resolve = r;
        })
    );
    render(<LoginScreen onLogin={onLogin} animate={false} />);
    fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('login-form'));
    await waitFor(() =>
      expect((screen.getByTestId('login-submit') as HTMLButtonElement).disabled).toBe(true)
    );
    expect((screen.getByTestId('login-submit') as HTMLButtonElement).textContent).toMatch(/验证中/);
    (resolve as ((v: { ok: false; error: 'wrong_pin' }) => void) | null)?.(
      { ok: false, error: 'wrong_pin' }
    );
    await waitFor(() =>
      expect((screen.getByTestId('login-submit') as HTMLButtonElement).disabled).toBe(false)
    );
  });

  it('ignores submit while busy (re-entry guard)', async () => {
    let resolve: ((v: { ok: false; error: 'wrong_pin' }) => void) | null = null;
    const onLogin = vi.fn(
      () =>
        new Promise<{ ok: false; error: 'wrong_pin' }>((r) => {
          resolve = r;
        })
    );
    render(<LoginScreen onLogin={onLogin} animate={false} />);
    fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('login-pin'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('login-form'));
    fireEvent.submit(screen.getByTestId('login-form'));
    fireEvent.submit(screen.getByTestId('login-form'));
    (resolve as ((v: { ok: false; error: 'wrong_pin' }) => void) | null)?.(
      { ok: false, error: 'wrong_pin' }
    );
    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
  });
});
