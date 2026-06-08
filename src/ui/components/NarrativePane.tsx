import { useEffect, useState } from 'react';

interface NarrativePaneProps {
  /** 本回合叙事文本。 */
  text: string;
  /** 当前是否在等待 LLM。 */
  loading: boolean;
  /** 是否启用打字机效果。测试中设为 false 以避免假定时间。 */
  typewriter?: boolean;
}

const TYPEWRITER_MS_PER_CHAR = 18;

export function NarrativePane({ text, loading, typewriter = true }: NarrativePaneProps) {
  const [displayed, setDisplayed] = useState(typewriter ? '' : text);

  useEffect(() => {
    if (!typewriter) {
      setDisplayed(text);
      return;
    }
    setDisplayed('');
    if (!text) return;
    let timerId = 0 as ReturnType<typeof setTimeout> | number;
    let i = 0;
    const tick = () => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        timerId = setTimeout(tick, TYPEWRITER_MS_PER_CHAR);
      }
    };
    timerId = setTimeout(tick, TYPEWRITER_MS_PER_CHAR);
    return () => clearTimeout(timerId);
  }, [text, typewriter]);

  return (
    <section
      data-testid="narrative-pane"
      className="flex-1 p-8 overflow-y-auto leading-relaxed text-neutral-200 text-base whitespace-pre-wrap"
    >
      {text === '' && loading ? (
        <span data-testid="narrative-loading" className="text-neutral-500">
          ……
        </span>
      ) : (
        <>
          <span data-testid="narrative-text">{displayed}</span>
          {loading && (
            <span data-testid="narrative-loading" className="text-neutral-500 ml-2">
              ……
            </span>
          )}
        </>
      )}
    </section>
  );
}
