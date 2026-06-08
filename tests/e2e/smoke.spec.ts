import { test, expect, type Route } from '@playwright/test';

/** 模拟 Anthropic /v1/messages 的响应；按测试用例返回不同 content。 */
function mockAnthropic(route: Route, payload: unknown) {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

const FIRST_TURN_RESPONSE = {
  id: 'msg_test_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-6',
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
  content: [
    {
      type: 'tool_use',
      id: 'toolu_1',
      name: 'game_turn',
      input: {
        narrative: 'Day 1。天空被烟雾染成铁灰色。你蜷在地下车库的角落，听见远处的玻璃碎裂声。',
        choices: ['向出口爬过去', '继续蜷缩等待', '检查身上的物品'],
        statePatch: {
          resources: { water: -1, sanity: -2 },
          inventoryAdd: [],
          inventoryRemove: [],
          memoryNote: '在地下车库醒来',
          isGameOver: false,
        },
      },
    },
  ],
};

test('loads the game and shows the first turn', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    mockAnthropic(route, FIRST_TURN_RESPONSE);
  });

  await page.goto('/');

  await expect(page.getByText('末日 100 天')).toBeVisible();
  await expect(page.getByText('DAY 1')).toBeVisible();
  await expect(page.getByTestId('narrative-text')).toContainText('Day 1。', {
    timeout: 10_000,
  });
});

test('clicking a choice triggers another turn', async ({ page }) => {
  let callCount = 0;
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    callCount += 1;
    const second = {
      ...FIRST_TURN_RESPONSE,
      id: `msg_test_${callCount}`,
      content: [
        {
          ...FIRST_TURN_RESPONSE.content[0],
          input: {
            narrative: callCount === 1
              ? FIRST_TURN_RESPONSE.content[0].input.narrative
              : '你爬向出口，听见身后传来低吼。',
            choices: callCount === 1
              ? ['向出口爬过去', '继续蜷缩等待', '检查身上的物品']
              : ['加速', '回头看', '屏住呼吸'],
            statePatch: {
              resources: { water: -1, sanity: -2 },
              inventoryAdd: [],
              inventoryRemove: [],
              memoryNote: '出口尝试',
              isGameOver: false,
            },
          },
        },
      ],
    };
    mockAnthropic(route, second);
  });

  await page.goto('/');
  await page.getByTestId('choice-0').waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByTestId('choice-0').click();
  await expect(page.getByTestId('narrative-text')).toContainText('爬向出口', {
    timeout: 10_000,
  });
  expect(callCount).toBeGreaterThanOrEqual(2);
});
