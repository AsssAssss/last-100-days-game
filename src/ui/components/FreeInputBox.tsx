import { useState, type FormEvent } from 'react';

interface FreeInputBoxProps {
  disabled: boolean;
  onSubmit: (text: string) => void;
}

export function FreeInputBox({ disabled, onSubmit }: FreeInputBoxProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form
      data-testid="free-input-form"
      onSubmit={handleSubmit}
      className="border-t border-neutral-800 px-8 py-4 flex gap-2"
    >
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="或者，输入你自己的动作……"
        className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none disabled:opacity-50"
        data-testid="free-input"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="px-4 py-2 border border-neutral-800 hover:border-amber-500 hover:bg-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm text-amber-500"
        data-testid="free-input-submit"
      >
        执行
      </button>
    </form>
  );
}
