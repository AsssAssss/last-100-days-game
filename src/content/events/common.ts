import { GOTO_DIRECTOR, type EventCard } from '../schema';

/**
 * 通用事件卡池（M1 先放 10 张验证系统，M5 扩到 80）。
 * 昼夜节奏下事件卡只消耗回合不消耗天数；只有"整天语义"的卡（雨天休整等）标 dayPassed。
 */
export const COMMON_EVENTS: readonly EventCard[] = [
  {
    id: 'evt/rain-harvest',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '凌晨下起了雨，砸在棚顶上的声音几乎盖过一切。你把能找到的盆盆罐罐全摆出去接水，顺便擦了擦好几天没洗的脸。雨幕里的城市安静得几乎像活着的时候。',
    choices: [
      {
        label: '收集雨水，趁雨声休整一天',
        effects: { resources: { water: 6, sanity: 3 }, dayPassed: true, memoryNote: '雨天接水休整' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '冒雨赶路——雨声能盖住你的脚步',
        effects: { resources: { water: 3, hp: -3 }, dayPassed: true, memoryNote: '冒雨赶路' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/stray-dog',
    pool: 'common',
    acts: [1, 8],
    once: true,
    narrative:
      '一条瘦脱了相的土狗远远跟了你半条街，保持着一个随时能跑掉的距离。它的眼睛在说它已经很多天没吃东西了——你也一样。',
    choices: [
      {
        label: '分它一点吃的',
        effects: {
          resources: { food: -2, sanity: 5 },
          humanityDelta: 4,
          memoryNote: '喂了一条流浪狗',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '挥手赶走它',
        goto: GOTO_DIRECTOR,
      },
      {
        label: '它也是肉',
        effects: {
          resources: { food: 6, sanity: -10 },
          humanityDelta: -10,
          memoryNote: '杀了那条跟着你的狗',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/corpse-loot',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '路边一辆轿车里坐着一具尸体，安全带还系着，副驾上放着一个鼓鼓的登山包。车窗完好，门没锁。死者头歪向一边，看不出死因——这年头，看不出死因才最可疑。',
    choices: [
      {
        label: '开门搜包',
        goto: [
          { to: 'evt/corpse-loot-good', weight: 65 },
          { to: 'evt/corpse-loot-bad', weight: 35 },
        ],
      },
      {
        label: '太蹊跷了，绕开走',
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/corpse-loot-good',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '包里是真东西：未开封的压缩饼干、一瓶电解质水、一把多功能钳。死者口袋里还有一张全家福。你把照片放回他的胸口口袋，拉好他的外套拉链。',
    choices: [
      {
        label: '带上物资离开',
        effects: {
          resources: { food: 5, water: 3 },
          memoryNote: '搜刮了车中死者的登山包',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/corpse-loot-bad',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '你拉开车门的瞬间，"尸体"的眼睛睁开了——浑浊的红。安全带勒着它，它够不到你，但它的嚎叫像警报一样炸开。街区深处立刻有了回应。你抓起登山包就跑，跑出去半条街才发现包底是破的，东西漏了一路。',
    choices: [
      {
        label: '不要回头，一直跑',
        effects: {
          resources: { food: 2, sanity: -6, hp: -4 },
          memoryNote: '车里的"尸体"是活的，狼狈逃脱',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/nightmare',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '你梦见了末日之前的最后一个周末。梦里所有人都还活着，阳光晒得阳台发烫，楼下有小孩在尖叫着追逐——你惊醒了，因为现实里的尖叫和梦里的不是同一种。你在黑暗里坐了很久，直到分清自己在哪。',
    choices: [
      {
        label: '睡不着了，提前出发',
        effects: { resources: { sanity: -5 }, memoryNote: '被噩梦惊醒的一天' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/radio-static',
    pool: 'common',
    acts: [1, 9],
    once: true,
    narrative:
      '你在一间值班室里找到一台手摇收音机。摇了五分钟，整个波段只有雪花噪音——但在 101.7 兆赫，杂音深处似乎有人声的碎片，重复着什么。你听不清内容，只听清那是个活人。',
    choices: [
      {
        label: '记下频率，带走收音机',
        effects: {
          addItems: ['手摇收音机'],
          resources: { sanity: 4 },
          setFlags: ['heard-broadcast'],
          memoryNote: '捡到收音机，101.7 上有活人的声音',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '太重了，不带',
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/quiet-rest',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '难得平静的一天。你找了个二楼采光好的房间，把袜子晾在窗台上，用半罐水擦了身体，给刀开了刃。下午你甚至睡了一个没有梦的午觉。末日里的奢侈就是这么便宜。',
    choices: [
      {
        label: '好好休整一天',
        effects: {
          resources: { hp: 6, sanity: 6, food: -1 },
          dayPassed: true,
          memoryNote: '平静的休整日',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/trader-cart',
    pool: 'common',
    acts: [1, 9],
    narrative:
      '一个推着改装三轮车的中年人远远摇铃铛——这年头还做买卖的人，要么有依仗，要么疯了。他车上挂着水桶、罐头和几把砍刀。"以物易物，童叟无欺。水换吃的，吃的换水，不收尸体上扒的。"',
    choices: [
      {
        label: '用水换些吃的',
        requires: [{ kind: 'resource', resource: 'water', min: 6 }],
        effects: {
          resources: { water: -5, food: 6 },
          memoryNote: '和行脚商人换了补给',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '用吃的换些水',
        requires: [{ kind: 'resource', resource: 'food', min: 6 }],
        effects: {
          resources: { food: -5, water: 6 },
          memoryNote: '和行脚商人换了水',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '点头致意，各走各路',
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/runner-alley',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '转过巷口，一只奔跑者背对着你蹲在垃圾堆前，肩膀一耸一耸——它在进食。巷子另一头是你要去的方向。风从你背后吹向它。',
    choices: [
      {
        label: '原路退回，绕远路',
        effects: { resources: { sanity: -2 }, memoryNote: '绕开了巷子里的奔跑者' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '趁它背对，摸上去解决它',
        goto: [
          { to: 'evt/runner-alley-kill', weight: 70 },
          { to: 'evt/runner-alley-hurt', weight: 30 },
        ],
      },
    ],
  },
  {
    id: 'evt/runner-alley-kill',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '你的刀从它后颈进去，它连转身的机会都没有。它倒下后你看见它在吃的东西——是只猫。你在它外套里摸到一个打火机和小半包烟。烟你不抽，但这年头烟是硬通货。',
    choices: [
      {
        label: '收好战利品，穿过巷子',
        effects: {
          resources: { sanity: -3 },
          addItems: ['小半包香烟'],
          memoryNote: '背刺解决了巷中的奔跑者',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/runner-alley-hurt',
    pool: 'common',
    acts: [1, 10],
    narrative:
      '踩到的玻璃碴出卖了你。它旋身扑来的速度超出你的预判，你们在垃圾堆里滚作一团，它的牙关在你小臂的护具上越收越紧。你用刀柄砸碎它的太阳穴，第三下它才松口。护具裂了，你的手臂淤青一片——但没破皮。这次没破皮。',
    choices: [
      {
        label: '检查伤口，心有余悸地离开',
        effects: {
          resources: { hp: -10, sanity: -8 },
          memoryNote: '偷袭失手，差点被咬',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
];
