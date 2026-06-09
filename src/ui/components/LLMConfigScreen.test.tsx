import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LLMConfigScreen } from './LLMConfigScreen';

const DEFAULTS = {
  baseURL: 'https://onehub.akacm.com/claude',
  model: 'claude-sonnet-4-6',
};

describe('LLMConfigScreen', () => {
  it('renders title and fields', () => {
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={() => {}} />);
    expect(screen.getByText('LLM 设置')).toBeInTheDocument();
    expect(screen.getByTestId('llm-key')).toBeInTheDocument();
    expect(screen.getByTestId('llm-base-url')).toBeInTheDocument();
    expect(screen.getByTestId('llm-model')).toBeInTheDocument();
  });

  it('shows username when provided', () => {
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={() => {}} username="xiaoxue" />);
    expect(screen.getByText('xiaoxue')).toBeInTheDocument();
  });

  it('uses defaults for baseURL and model when no initial', () => {
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={() => {}} />);
    expect((screen.getByTestId('llm-base-url') as HTMLInputElement).value).toBe(DEFAULTS.baseURL);
    expect((screen.getByTestId('llm-model') as HTMLInputElement).value).toBe(DEFAULTS.model);
  });

  it('prefills from initial config', () => {
    render(
      <LLMConfigScreen
        defaults={DEFAULTS}
        initial={{ apiKey: 'sk-existing', baseURL: 'http://x', model: 'claude-opus' }}
        onSave={() => {}}
      />
    );
    expect((screen.getByTestId('llm-key') as HTMLInputElement).value).toBe('sk-existing');
    expect((screen.getByTestId('llm-base-url') as HTMLInputElement).value).toBe('http://x');
    expect((screen.getByTestId('llm-model') as HTMLInputElement).value).toBe('claude-opus');
  });

  it('save button disabled until all fields are non-empty', () => {
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={() => {}} />);
    const save = screen.getByTestId('llm-config-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('llm-key'), { target: { value: 'sk-test' } });
    expect(save.disabled).toBe(false);
  });

  it('calls onSave with trimmed values and stripped trailing slash on baseURL', () => {
    const onSave = vi.fn();
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={onSave} />);
    fireEvent.change(screen.getByTestId('llm-key'), { target: { value: ' sk-test ' } });
    fireEvent.change(screen.getByTestId('llm-base-url'), { target: { value: 'https://onehub.akacm.com/claude/' } });
    fireEvent.submit(screen.getByTestId('llm-config-form'));
    expect(onSave).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://onehub.akacm.com/claude',
      model: 'claude-sonnet-4-6',
    });
  });

  it('shows cancel button when onCancel provided and calls it', () => {
    const onCancel = vi.fn();
    render(
      <LLMConfigScreen
        defaults={DEFAULTS}
        initial={{ apiKey: 'k', baseURL: 'b', model: 'm' }}
        onSave={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('llm-config-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('hides cancel button when onCancel is undefined (first-time setup)', () => {
    render(<LLMConfigScreen defaults={DEFAULTS} onSave={() => {}} />);
    expect(screen.queryByTestId('llm-config-cancel')).not.toBeInTheDocument();
  });
});
