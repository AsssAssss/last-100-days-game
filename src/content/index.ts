import { buildContent, type StoryContent } from './schema';
import { ACT01_NODES } from './acts/act01';
import { COMMON_EVENTS } from './events/common';
import { NIGHT_EVENTS } from './nights';

/** 全部剧本内容的单一入口（昼夜过场节点内置于引擎）。M2-M5 在此追加 acts/events。 */
export const STORY_CONTENT: StoryContent = buildContent(
  'act01/a1-awakening',
  [ACT01_NODES],
  [...COMMON_EVENTS, ...NIGHT_EVENTS]
);
