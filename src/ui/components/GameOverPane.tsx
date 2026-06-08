interface GameOverPaneProps {
  day: number;
  reason?: string;
  onRestart: () => void;
}

export function GameOverPane({ day, reason, onRestart }: GameOverPaneProps) {
  return (
    <div
      data-testid="game-over"
      className="border-t border-amber-900 px-8 py-6 bg-neutral-950 flex flex-col gap-3"
    >
      <div className="text-amber-500 text-lg tracking-wider">GAME OVER</div>
      <div className="text-neutral-400 text-sm">
        坚持到第 {day} 天。{reason ? `—— ${reason}` : ''}
      </div>
      <button
        type="button"
        data-testid="restart-button"
        onClick={onRestart}
        className="self-start px-4 py-2 border border-amber-700 text-amber-500 hover:bg-amber-950 rounded text-sm"
      >
        从头再来
      </button>
    </div>
  );
}
