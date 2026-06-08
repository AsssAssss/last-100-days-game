import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FreeInputBox } from './FreeInputBox';

describe('FreeInputBox', () => {
  it('disables submit button when input is empty', () => {
    render(<FreeInputBox disabled={false} onSubmit={() => {}} />);
    expect(screen.getByTestId('free-input-submit')).toBeDisabled();
  });

  it('enables submit button when input has content', () => {
    render(<FreeInputBox disabled={false} onSubmit={() => {}} />);
    fireEvent.change(screen.getByTestId('free-input'), {
      target: { value: '冲出去' },
    });
    expect(screen.getByTestId('free-input-submit')).not.toBeDisabled();
  });

  it('calls onSubmit with trimmed text', () => {
    const onSubmit = vi.fn();
    render(<FreeInputBox disabled={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('free-input'), {
      target: { value: '  冲出去  ' },
    });
    fireEvent.submit(screen.getByTestId('free-input-form'));
    expect(onSubmit).toHaveBeenCalledWith('冲出去');
  });

  it('clears input after successful submit', () => {
    render(<FreeInputBox disabled={false} onSubmit={() => {}} />);
    const input = screen.getByTestId('free-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '逃跑' } });
    fireEvent.submit(screen.getByTestId('free-input-form'));
    expect(input.value).toBe('');
  });

  it('ignores submit when disabled', () => {
    const onSubmit = vi.fn();
    render(<FreeInputBox disabled={true} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('free-input'), {
      target: { value: '冲' },
    });
    fireEvent.submit(screen.getByTestId('free-input-form'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores submit when input is only whitespace', () => {
    const onSubmit = vi.fn();
    render(<FreeInputBox disabled={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('free-input'), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByTestId('free-input-form'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables input field when disabled prop is true', () => {
    render(<FreeInputBox disabled={true} onSubmit={() => {}} />);
    expect(screen.getByTestId('free-input')).toBeDisabled();
  });
});
