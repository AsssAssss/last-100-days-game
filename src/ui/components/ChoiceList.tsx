interface ChoiceListProps {
  choices: readonly string[];
  disabled: boolean;
  onChoose: (choice: string) => void;
}

export function ChoiceList({ choices, disabled, onChoose }: ChoiceListProps) {
  if (choices.length === 0) return null;
  return (
    <ul data-testid="choice-list" className="flex flex-col gap-2 px-8 pb-3">
      {choices.map((c, i) => (
        <li key={`${i}-${c}`}>
          <button
            type="button"
            data-testid={`choice-${i}`}
            disabled={disabled}
            onClick={() => onChoose(c)}
            className="w-full text-left px-4 py-2 border border-neutral-800 hover:border-amber-500 hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm text-neutral-200"
          >
            <span className="text-amber-500 mr-2">{i + 1}.</span>
            {c}
          </button>
        </li>
      ))}
    </ul>
  );
}
