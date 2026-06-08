export const GAME_TURN_TOOL = {
  name: 'game_turn',
  description: '生成本回合的叙事、玩家可选选项、以及状态变更补丁。',
  input_schema: {
    type: 'object' as const,
    required: ['narrative', 'choices', 'statePatch'],
    properties: {
      narrative: {
        type: 'string',
        description: '本回合的叙事文本，80-200 字，第二人称。',
      },
      choices: {
        type: 'array',
        description: '玩家下一步可选的 3 个动作。每个选项是一句话动作描述。如果是结局回合，返回空数组。',
        items: { type: 'string' },
        minItems: 0,
        maxItems: 3,
      },
      statePatch: {
        type: 'object',
        description: '本回合产生的状态变更。所有数值字段都是 delta（变化量），不是绝对值。资源变化必须符合"每个动作必有代价"。',
        properties: {
          resources: {
            type: 'object',
            properties: {
              hp: { type: 'integer', minimum: -100, maximum: 10 },
              sanity: { type: 'integer', minimum: -100, maximum: 10 },
              food: { type: 'integer', minimum: -50, maximum: 30 },
              water: { type: 'integer', minimum: -50, maximum: 30 },
              ammo: { type: 'integer', minimum: -50, maximum: 20 },
            },
            additionalProperties: false,
          },
          inventoryAdd: {
            type: 'array',
            description: '本回合获得的物品。每个物品一个字符串。',
            items: { type: 'string' },
          },
          inventoryRemove: {
            type: 'array',
            description: '本回合消耗或失去的物品。',
            items: { type: 'string' },
          },
          memoryNote: {
            type: 'string',
            description: '本回合发生的关键事件，1-2 句，用于后续剧情记忆。可为空字符串。',
          },
          isGameOver: {
            type: 'boolean',
            description: '本回合是否触发死亡或结局。',
          },
          gameOverReason: {
            type: 'string',
            description: '若 isGameOver=true，简短说明死因或结局（"被丧尸咬伤感染"、"成功活到 Day 100"）。',
          },
          dayPassed: {
            type: 'boolean',
            description: '本回合是否结束了完整的一天（玩家入睡、熬过黑夜、或长时间转移等"足以让时间从今天跨到明天"的叙事）。默认 false——大多数回合是"同一天内的多个事件之一"。每天应有 3-7 个回合后才出现 dayPassed=true。',
          },
        },
        required: ['resources', 'inventoryAdd', 'inventoryRemove', 'memoryNote', 'isGameOver', 'dayPassed'],
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
} as const;

export type GameTurnInput = {
  narrative: string;
  choices: string[];
  statePatch: {
    resources: Partial<{
      hp: number;
      sanity: number;
      food: number;
      water: number;
      ammo: number;
    }>;
    inventoryAdd: string[];
    inventoryRemove: string[];
    memoryNote: string;
    isGameOver: boolean;
    gameOverReason?: string;
    dayPassed: boolean;
  };
};
