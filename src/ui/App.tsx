import { useEffect } from 'react';
import { ChoiceList } from './components/ChoiceList';
import { FreeInputBox } from './components/FreeInputBox';
import { GameOverPane } from './components/GameOverPane';
import { NarrativePane } from './components/NarrativePane';
import { SlotSelectScreen } from './components/SlotSelectScreen';
import { StatusBar } from './components/StatusBar';
import { useGameEngine, type GameEngineDeps } from './hooks/useGameEngine';

interface AppProps {
  deps: GameEngineDeps;
  /** 关掉入场动画，便于 DOM 测试。 */
  disableIntroAnimation?: boolean;
}

export function App({ deps, disableIntroAnimation = false }: AppProps) {
  const engine = useGameEngine(deps);

  // 选完 slot 进入游戏后，如果还没有任何叙事（空槽位的全新游戏），自动拉第一回合
  useEffect(() => {
    if (
      engine.hasStarted &&
      !engine.loading &&
      !engine.state.isGameOver &&
      engine.state.lastNarrative === '' &&
      engine.state.choices.length === 0 &&
      engine.error === null
    ) {
      engine.play(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    engine.hasStarted,
    engine.state.lastNarrative,
    engine.state.isGameOver,
    engine.loading,
    engine.error,
  ]);

  if (!engine.hasStarted) {
    return (
      <SlotSelectScreen
        slots={engine.slots}
        onSelect={engine.selectSlot}
        onDelete={engine.deleteSlot}
        animate={!disableIntroAnimation}
      />
    );
  }

  return (
    <div className="h-screen flex bg-black text-neutral-200">
      <StatusBar state={engine.state} />

      <main className="flex-1 flex flex-col h-full">
        <header className="border-b border-neutral-800 px-8 py-3 flex items-center justify-between text-amber-500 tracking-widest text-sm">
          <span>末日 100 天</span>
          <button
            type="button"
            data-testid="exit-to-menu"
            onClick={engine.exitToSlotMenu}
            className="text-neutral-500 hover:text-amber-400 text-xs tracking-wider px-2 py-1 transition-colors"
          >
            ← 回到存档列表
          </button>
        </header>

        <NarrativePane
          text={engine.state.lastNarrative}
          loading={engine.loading}
        />

        {engine.error !== null && (
          <div
            data-testid="engine-error"
            className="mx-8 mb-3 px-4 py-2 border border-red-900 bg-red-950 text-red-300 rounded text-sm"
          >
            出错：{engine.error}
          </div>
        )}

        {engine.state.isGameOver ? (
          <GameOverPane
            day={engine.state.day}
            reason={engine.state.gameOverReason}
            onRestart={engine.restart}
          />
        ) : (
          <>
            <ChoiceList
              choices={engine.state.choices}
              disabled={engine.loading}
              onChoose={(c) => engine.play(c)}
            />
            <FreeInputBox
              disabled={engine.loading}
              onSubmit={(t) => engine.play(t)}
            />
          </>
        )}
      </main>
    </div>
  );
}
