import { GOTO_DIRECTOR, type EventCard, type StoryNode } from './schema';

/**
 * 昼夜系统的过场节点与夜晚事件卡。
 * - dusk-*：黄昏抉择（休整到天亮 / 进入夜晚行动），调度器在白天回合耗尽或玩家主动收工时插入
 * - dawn-*：黎明过场（夜晚回合耗尽时强制），睡到天亮
 * - night/quiet：夜晚卡池抽空时的兜底
 * - 夜晚事件卡（time: 'night'）：比白天凶险得多
 */

export const DUSK_NODES: readonly StoryNode[] = [
  {
    id: 'night/dusk-1',
    act: 0,
    narrative:
      '太阳沉到楼宇残骸的后面去了，天色像一块慢慢收紧的灰布。这是末日里最暧昧的时刻——白天的奔跑者开始变得迟钝，而那些更怕光的东西，正在地下车库和塌陷的地铁口里醒过来。你能听见这座城市换班的声音：白昼的死寂退场，夜晚的窸窣登台。\n\n你检查了一遍背包，又数了数自己今天受的伤。理智告诉你：找个能锁门的房间，把今晚交给睡眠。但黑夜也是穷人的机会——巡逻的人类会回营，许多白天不敢碰的地方，此刻只剩下黑暗本身在看守。\n\n问题只有一个：你确定你比黑暗里的那些东西更适应夜晚吗？',
    choices: [
      {
        label: '找个安全的角落，休整到天亮',
        effects: {
          resources: { hp: 3, sanity: 2 },
          dayPassed: true,
          memoryNote: '安稳休整了一夜',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '黑夜是另一张地图——今晚出去行动',
        effects: { setPhase: 'night', resources: { sanity: -2 } },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'night/dusk-2',
    act: 0,
    narrative:
      '黄昏来得悄无声息。先是影子变长，然后是温度跌下去，最后整条街的颜色像被人拧掉了饱和度。远处传来一声悠长的哭嚎，又一声应和——它们在天黑前互相确认位置，跟鸟群归巢前的鸣叫一个道理。这个认知让你胃里发冷。\n\n你蹲在一处断墙后面，就着最后的天光啃了两口东西。腿很沉，眼皮也很沉，今天积累的每一次心跳过速都在这一刻找上门来讨债。\n\n经验在你脑子里分成两派吵架：一派说，夜里行动是拿命换东西，蠢货才在天黑后出门；另一派说，你见过夜里的便利店，没有人排队，也没有人埋伏——只要你足够安静，黑暗对谁都是公平的。',
    choices: [
      {
        label: '不赌了，今晚好好睡一觉',
        effects: {
          resources: { hp: 3, sanity: 2 },
          dayPassed: true,
          memoryNote: '天黑前找到了过夜处',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '披上夜色出门——安静点，快进快出',
        effects: { setPhase: 'night', resources: { sanity: -2 } },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'night/dusk-3',
    act: 0,
    narrative:
      '你是在影子爬上自己的手背时才意识到天要黑了。末日的第几个黄昏？你已经数不清了，但身体记得规矩：天黑前的半小时是一天里最后的安全窗口，要么用它找到过夜的洞，要么用它武装自己迎接夜晚。\n\n街对面有一栋只烧了半边的居民楼，二层的窗户完整，楼道口窄得只容一人通过——是个能睡觉的地方。可你同时也注意到了别的：今晚没有月亮，云层厚得像棉被。对那些用耳朵看世界的东西来说，今晚和白天没有区别；但对任何想要避开人类视线的行动来说，这是一个月里最好的夜。\n\n风从巷子深处吹过来，带着凉意和一点若有若无的甜腐味。你把刀柄转到顺手的位置。',
    choices: [
      {
        label: '占下那栋半烧的楼，睡到天亮',
        effects: {
          resources: { hp: 3, sanity: 2 },
          dayPassed: true,
          memoryNote: '在半烧的居民楼里过夜',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '无月之夜是行动的好日子——出发',
        effects: { setPhase: 'night', resources: { sanity: -2 } },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
];

export const DAWN_NODES: readonly StoryNode[] = [
  {
    id: 'night/dawn-1',
    act: 0,
    narrative:
      '天边泛起一线脏兮兮的灰白时，你才发现自己的手一直是抖的——不是恐惧，是透支。整夜紧绷的神经像拉过头的弓弦，松下来的时候反而疼。夜晚的城市正在退潮：那些窸窣声、指甲刮过铁皮的声音、远处此起彼伏的哭嚎，随着光线一寸寸爬上街道而退回到阴影深处去了。\n\n你活过了这一夜。这句话在末日里从来不是废话。\n\n晨光里你找了个背风的角落瘫坐下来，让心跳慢慢落回正常的节奏。不管昨夜得到了什么、失去了什么，新的一天都不会等你缓完——它已经把太阳推上来了。',
    choices: [
      {
        label: '抓紧时间眯一会儿，然后迎接新的一天',
        effects: { dayPassed: true, memoryNote: '熬过了一整夜的行动' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'night/dawn-2',
    act: 0,
    narrative:
      '黎明是从声音里先到的：先是哭嚎声变得稀疏、迟疑，然后是某种几乎被你遗忘的东西——鸟叫。一只麻雀站在断掉的电线上叫了两声，理直气壮，仿佛这座城市还是它记忆里的那一座。\n\n你扶着墙站起来，浑身的关节像生了锈。夜里的每一步、每一次屏息、每一个躲进阴影的瞬间，都在天亮后变成了具体的酸痛找回来。你打了个长长的哈欠，眼泪都呛出来了。\n\n夜班结束了。这座城市最危险的时段把你还了回来，连本带利的疲惫是它收的过路费。接下来你需要一点睡眠，哪怕只有两个小时——然后，又是新的一天。',
    choices: [
      {
        label: '补个觉，开始新的一天',
        effects: { dayPassed: true, memoryNote: '夜行到天亮' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
];

/** 夜晚卡池抽空时的兜底。 */
export const NIGHT_QUIET_NODE: StoryNode = {
  id: 'night/quiet',
  act: 0,
  narrative:
    '这一夜出奇地安静。你贴着墙根移动了几条街，没有遇到任何活物——死物也没有。月光偶尔从云缝里漏下来，把空荡荡的街道照得像一张曝光过度的旧照片：歪斜的公交车、积灰的橱窗、十字路口中央那只不知道摆了多久的儿童雨靴。\n\n安静得让人发毛。在这座城市里，听不见声音不代表没有东西，只代表那些东西也在听。你在一家五金店的柜台后面蹲了很久，最终什么也没找到值得带走的。\n\n夜越深，气温越低。你呼出的白气提醒你：该做个决定了。',
  choices: [
    {
      label: '见好就收，找地方睡到天亮',
      effects: { resources: { sanity: 2 }, dayPassed: true, memoryNote: '一个安静无获的夜' },
      goto: GOTO_DIRECTOR,
    },
    {
      label: '夜还长，再走一段',
      effects: { resources: { sanity: -2 } },
      goto: GOTO_DIRECTOR,
    },
  ],
};

/** 夜晚事件卡——危险与机会都是白天的两倍。 */
export const NIGHT_EVENTS: readonly EventCard[] = [
  {
    id: 'evt/night-clicker-street',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '咔嗒。咔嗒咔嗒。\n\n这声音从街角传来的瞬间，你浑身的汗毛全部立正。月光下，一个轮廓从巷口拐出来——它走得不快，头部那团畸形的菌盖左右摆动，像盲人用手杖点地。循声者。它每走几步就停下来，喉咙里滚出一串密集的咔嗒声，声波扫过街道，扫过你藏身的邮筒。\n\n它在"看"。用声音看。\n\n你半蹲在阴影里，大腿肌肉开始酸胀地发抖。它还在逼近，七米，五米。你能闻到它身上那股甜腐味了，能看清菌盖裂缝里湿润的反光。你的脚边有一块松动的砖；你的身后三米是一扇虚掩的店门，门轴是否会响，你不知道。',
    choices: [
      {
        label: '纹丝不动，赌它"看"不见静止的你',
        goto: [
          { to: 'evt/night-clicker-pass', weight: 60 },
          { to: 'evt/night-clicker-close', weight: 40 },
        ],
      },
      {
        label: '把砖头扔向街对面，引开它',
        goto: [
          { to: 'evt/night-clicker-distracted', weight: 70 },
          { to: 'evt/night-clicker-close', weight: 30 },
        ],
      },
      {
        label: '慢慢退向身后的店门',
        goto: [
          { to: 'evt/night-clicker-slipaway', weight: 50 },
          { to: 'evt/night-clicker-close', weight: 50 },
        ],
      },
    ],
  },
  {
    id: 'evt/night-clicker-pass',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '它在离你两米的地方停下了。\n\n咔嗒声密集得像下雨，声波一遍遍刷过你的身体。你闭上眼睛，把呼吸压到几乎为零，肺在胸腔里烧。有什么东西轻轻碰了一下邮筒的另一侧——是它的手，那只指节肿胀、指甲翻裂的手，就贴着铁皮，离你的脸不到三十公分。\n\n一秒。两秒。十秒。\n\n它收回手，菌盖晃了晃，朝街的另一头去了。咔嗒声渐行渐远，最后混进夜风里。你滑坐在地上，后背全湿透了，这才发现自己的指甲在掌心掐出了四个月牙形的血印。今晚的课你记住了：在循声者面前，静止就是隐身。',
    choices: [
      {
        label: '缓过劲来，继续前进',
        effects: { resources: { sanity: -6 }, memoryNote: '与循声者擦肩而过' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-clicker-distracted',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '砖头砸在街对面的卷帘门上，哐的一声在死寂的夜里炸开。\n\n循声者的反应快得不像那具腐烂身体该有的——它整个转向，四肢压低，以一种令人作呕的灵活窜过街道，扑向声源处的卷帘门，指甲在铁皮上犁出刺耳的刮擦声。它没找到猎物，于是开始疯狂地撕扯卷帘门，咔嗒声变成了某种更尖锐的、几乎是愤怒的嘶鸣。\n\n你借着这片噪音的掩护贴墙快走，一口气拐过两个街角才敢直起腰。身后那个方向，撕扯铁皮的声音还在继续——它会在那里耗上半个钟头，而你已经在半个街区之外了。声东击西，老把戏，但老把戏能活命。',
    choices: [
      {
        label: '趁它纠缠卷帘门，赶路',
        effects: { resources: { sanity: -3 }, memoryNote: '用砖头声调开了循声者' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-clicker-slipaway',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '门轴没有响。\n\n你退进店里，是间理发店，镜子蒙着灰，转椅东倒西歪。你从镜子的反光里盯着街上那个轮廓——它在你刚才蹲过的邮筒边停了很久，菌盖几乎贴上铁皮，咔嗒声一阵密过一阵，像是在确认刚才那里"看"到过的什么东西去了哪里。\n\n然后它做了一件让你头皮炸开的事：它学了一声人的咳嗽。\n\n沙哑、走调、却无法否认是从人类喉咙里学来的咳嗽声，在空荡的街上响了两遍。引诱。这东西在用它杀死过的人的声音钓鱼。你死死捂住自己的嘴，从后门的缝隙里挤出去，穿过堆满垃圾的后巷，直到那声"咳嗽"彻底消失在三条街之外。',
    choices: [
      {
        label: '从后巷脱身',
        effects: { resources: { sanity: -8 }, memoryNote: '听见循声者模仿人的咳嗽' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-clicker-close',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '你不知道是哪里出了错——也许是一粒踩碎的玻璃碴，也许只是你咽了一下口水。\n\n它的菌盖猛地转向你，咔嗒声瞬间拔高成一声撕裂般的尖啸，然后它扑了过来。那不是奔跑，是炮弹出膛。你向侧面扑倒，它的指甲撕开你的外套和上臂，热辣辣的疼炸开。你抓起手边的转椅砸过去，趁它撕扯椅子的半秒钟翻出窗洞，落地、滚身、起跑，肺里的空气像火。\n\n它没有追出窗——循声者不爱离开自己的猎区。你跑出三条街才停下，撕开袖子检查：三道抓痕，深可见肉，但不是咬伤。不是咬伤。你靠着墙滑坐下去，又疼又庆幸，笑出了声，笑声又吓了自己一跳。',
    choices: [
      {
        label: '包扎伤口，惊魂未定地撤离',
        effects: { resources: { hp: -18, sanity: -10 }, memoryNote: '被循声者抓伤，死里逃生' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-runner-pack',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '先是一声哭嚎，远，但清晰。然后是第二声，近了些。然后整条街都活了。\n\n你趴在一辆侧翻的货车底下，看着它们从街口涌过来——七只，八只，也许十只。奔跑者成群移动的时候有种令人毛骨悚然的协调性，像一群被同一根线牵着的木偶，谁也不带头，谁也不掉队。它们半跑半爬地掠过街道，往城东的方向去，不知道是什么在召唤它们。\n\n其中一只在货车边突然停住了。\n\n它蹲下来，红色的眼睛贴近地面，鼻孔急促地翕动——你的气味。车底的阴影里，你和它的距离不到一臂。它的脸侧过来，几乎贴上车底的边缘。',
    choices: [
      {
        label: '屏住呼吸，一动不动',
        goto: [
          { to: 'evt/night-pack-pass', weight: 65 },
          { to: 'evt/night-pack-found', weight: 35 },
        ],
      },
      {
        label: '从车底另一侧悄悄滚出去，趁群体未停先走',
        goto: [
          { to: 'evt/night-pack-slip', weight: 55 },
          { to: 'evt/night-pack-found', weight: 45 },
        ],
      },
    ],
  },
  {
    id: 'evt/night-pack-pass',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '群体后方传来一声新的哭嚎，那只蹲着的奔跑者像被鞭子抽了一下，猛地直起身，丢下车底的气味追了上去。\n\n十几秒后，街道重新空了，只剩下它们跑过时踢翻的垃圾桶还在原地打转，哐啷、哐啷，慢慢停下。你在车底又趴了整整十分钟，数自己的心跳，数到第六百下才敢爬出来。\n\n膝盖和手肘全是机油和碎玻璃压出的印子。你回头看了一眼它们消失的方向——城东。明天的路线得改了，绕开那个方向，绕多远都值得。一群里只要有一只回头，今晚就是你的忌日。',
    choices: [
      {
        label: '记下兽群的去向，反方向撤离',
        effects: { resources: { sanity: -6 }, memoryNote: '车底躲过了奔跑者群' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pack-slip',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '你贴着地面从车底另一侧滚出去，像条鱼一样滑进路边的绿化带。荆棘划破了你的手背，你咬着牙没出声。\n\n群体的注意力还在前方，你借着灌木的掩护一路低姿快移，从一个花坛挪到下一个花坛，再钻进一条窄巷。背后的哭嚎声此起彼伏，但没有一声是冲着你来的。巷子尽头，你翻过一道半人高的砖墙，落进一个荒废的幼儿园，秋千架在夜风里轻轻晃。\n\n你蹲在滑梯的阴影里大口喘气。手背的划伤渗着血珠，不深，但火辣辣地疼。比起留在那辆车底赌运气，你更信自己的腿——至少今晚，你赌赢了。',
    choices: [
      {
        label: '在幼儿园里缓口气，再继续',
        effects: { resources: { hp: -5, sanity: -4 }, memoryNote: '从奔跑者群眼皮底下溜走' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pack-found',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '它叫了。\n\n那声哭嚎几乎贴着你的耳膜炸开，车底瞬间变成棺材。你从另一侧滚出去的时候，整个群体已经调头了——十只奔跑者转向的声音像一阵风暴擦着地面刮过来。你跑。纯粹的、不过脑子的跑。翻过引擎盖，撞开半掩的院门，迎面的晾衣绳差点把你放倒。\n\n身后的声音越来越近。你抓起院里的煤球炉朝身后砸去，听见至少一只被绊倒的闷响；冲出院子时肩膀重重撞在门框上，整条手臂都麻了。最后你是跳进一条排水沟、贴着涵洞的内壁才甩掉它们的——污水浸到大腿，冷得像刀子。\n\n你在涵洞里泡了半个小时，直到上面的脚步声彻底散尽。爬出来的时候，你浑身恶臭、瑟瑟发抖、丢了背包侧袋里的所有干粮——但四肢健全。今晚，这就算赢。',
    choices: [
      {
        label: '拧干裤腿，清点损失',
        effects: {
          resources: { hp: -12, sanity: -10, food: -4 },
          memoryNote: '被奔跑者群追进排水沟，狼狈逃生',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-looters',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '手电光柱扫过来的时候，你正在翻一家便利店的储物间。\n\n"别动。"声音从门口来，男的，年轻，发紧——紧到你立刻明白拿手电的人比你更紧张。光柱后面有两个人影：高的那个攥着一根钢管，矮的那个拿手电，另一只手里的东西看不清，可能是刀，也可能只是想让你以为是刀。\n\n"东西放下，人可以走。"高个子说。钢管在他手里转了半圈，像是壮胆。\n\n你的背包里是今天全部的收获。你的刀在腰后，三步距离。储物间只有一个门，他们堵着。你见过这种局面怎么收场——有时是各退一步，有时是地上多两具尸体，全看接下来三十秒里谁先犯蠢。',
    choices: [
      {
        label: '放下一半物资："一人一半，谁也别见血。"',
        effects: {
          resources: { food: -3, water: -2 },
          humanityDelta: 2,
          memoryNote: '夜里被劫，分了一半物资换平安',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '吹灭手里的蜡烛，黑暗里拼一把',
        goto: [
          { to: 'evt/night-looters-win', weight: 50 },
          { to: 'evt/night-looters-hurt', weight: 50 },
        ],
      },
      {
        label: '突然大声学一声循声者的咔嗒——赌他们怕',
        goto: [
          { to: 'evt/night-looters-bluff', weight: 60 },
          { to: 'evt/night-looters-hurt', weight: 40 },
        ],
      },
    ],
  },
  {
    id: 'evt/night-looters-win',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '黑暗是公平的——但你比他们先适应它。\n\n蜡烛熄灭的瞬间你已经移动了，钢管砸在你刚才站的位置，砸塌了一摞纸箱。你从货架的缝隙里撞出去，肩膀顶进高个子的肋下，听见他闷哼着摔进塑料筐堆里。手电的光柱疯狂地乱扫，矮个子在喊一个名字。你没有恋战，抄起背包从他们中间的空档冲出门，顺手拽倒了门口的杂志架挡路。\n\n夜风扑在脸上的时候，身后传来的不是追击的脚步，而是两个人互相埋怨的压低的吵架声。也是两个活不下去又下不去狠手的可怜人罢了。你摸摸肋骨，撞人那一下自己也疼——但东西一样没少。',
    choices: [
      {
        label: '带着全部物资消失在夜里',
        effects: { resources: { hp: -6, sanity: -4 }, memoryNote: '黑暗中突围，护住了物资' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-looters-hurt',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '你赌输了一半。\n\n混乱里钢管结结实实地抡在你的背上，疼得你眼前发白，跪倒的瞬间手电光罩住了你。"别逼我们！"高个子的声音劈了叉，钢管又举了起来——但没有落下。矮个子拽住了他："够了！拿东西，走！"\n\n他们扯走了你的背包，倒退着出门，手电光一直钉在你脸上直到他们消失在街角。你在储物间的地板上躺了很久，背上的疼一波一波地涌。最后你摸黑爬起来，在他们慌乱中掉落的东西里捡回了两个罐头——你自己的罐头。\n\n夜里的人比夜里的鬼更难防。这一课的学费，是你大半的家当。',
    choices: [
      {
        label: '咬牙爬起来，离开这里',
        effects: {
          resources: { hp: -15, sanity: -8, food: -5, water: -3 },
          memoryNote: '夜里被劫匪打伤，损失惨重',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-looters-bluff',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '"咔嗒。咔嗒咔嗒咔嗒——"\n\n你从喉咙深处挤出那串声音的瞬间，手电光柱猛地一抖。"操——"矮个子的声音劈了，光柱疯狂地转向门外的黑暗，高个子的钢管哐当掉在地上。"在哪？！在哪？！"\n\n"楼上。"你用气声说，"它们下来了。"\n\n这五个字干净利落地击溃了他们。两个人影撞着肩膀挤出门，脚步声往街北去了，连手电都顾不上关。你站在原地听着自己的心跳，慢慢把那串咔嗒声的余韵咽回去——学这个声音的时候，你后颈的汗毛也是竖着的。\n\n你迅速装好东西从反方向离开。这招用一次少一次，而且你在心里默默祈祷：永远不要在学这个声音的时候，听到真正的回应。',
    choices: [
      {
        label: '趁他们逃跑，反方向撤离',
        effects: { resources: { sanity: -5 }, memoryNote: '模仿循声者吓跑了劫匪' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cold',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '后半夜，气温毫无征兆地跳水。\n\n先是手指失去知觉，然后是脚趾。你呼出的气在围巾上凝成白霜，每一次呼吸都像吞冰碴。这种冷不是不舒服，是会死人的——末日的第一个冬天教过所有幸存者这一课：冻僵的人不会觉得冷，只会觉得困，然后在某个墙角"睡着"，再也不用醒。\n\n你需要立刻做出选择：找东西生火会暴露位置，但能活；不生火就得不停移动维持体温，消耗会很大。你摸了摸背包——如果里面有条毯子，现在就是它值回所有代价的时刻。',
    choices: [
      {
        label: '裹紧军毯，找个避风处撑过去',
        requires: [{ kind: 'item', item: '一条旧军毯', present: true }],
        effects: { resources: { sanity: 2 }, memoryNote: '军毯救了你一夜' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '冒险生一小堆火',
        goto: [
          { to: 'evt/night-cold-fire-ok', weight: 65 },
          { to: 'evt/night-cold-fire-bad', weight: 35 },
        ],
      },
      {
        label: '不停走动，用消耗换体温',
        effects: {
          resources: { hp: -8, food: -2, water: -1 },
          memoryNote: '靠不停走动熬过寒夜',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cold-fire-ok',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '你在一栋楼的天井里生了火——四面有墙挡光，头顶的天井把烟directly散进夜空。火苗舔上木柴的瞬间，那点橙色的光几乎让你落泪。\n\n你把冻僵的手凑到火边，看着知觉一寸寸地痛回来。怀里揣着的半瓶水也化开了。你烤热了一个罐头，热食下肚的瞬间，整个人从里到外活了过来。\n\n那一刻你忽然理解了一百万年前蹲在山洞里的祖先：火不是工具，火是神。你守着这位神到后半夜，确认没有任何东西被光和烟引来，才让它安静地熄灭。',
    choices: [
      {
        label: '靠着余烬的温度撑到天亮前',
        effects: { resources: { hp: 2, sanity: 4, food: -1 }, memoryNote: '天井里的一堆火救了你' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cold-fire-bad',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '火生起来十分钟后，你听见了指甲刮墙的声音。\n\n光。哪怕只是一小堆火，在彻底黑暗的城市里也亮得像灯塔。你一脚踩灭火堆抓起背包就走，身后的单元门已经传来撞击声。你在黑暗的楼道里深一脚浅一脚地爬，身后的东西循着热气和声音追，喉咙里咯咯作响。\n\n你从二楼的窗户跳进了隔壁楼的雨棚，再滚到地面，脚踝扭得钻心地疼。寒气立刻重新咬住你——刚烤热的身体散温更快，冷得加倍刻骨。你一瘸一拐地走了半夜才彻底甩掉那东西，天亮前的几个小时，是裹着发抖的自己硬熬过去的。',
    choices: [
      {
        label: '又冷又伤地熬到放弃行动',
        effects: {
          resources: { hp: -12, sanity: -8 },
          memoryNote: '生火引来了感染者，寒夜里负伤逃亡',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pharmacy-window',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    once: true,
    narrative:
      '一家社区药房，白天你路过时它门口蹲着两只奔跑者，像两尊门神。现在门口空了——夜里它们会游荡去别处。\n\n橱窗的玻璃上贴着褪色的促销海报，从缝隙看进去，货架翻得乱七八糟，但药房的好东西从来不在货架上：柜台后面那排抽屉，处方药、抗生素、止痛片，末日硬通货里的硬通货。\n\n问题是那扇橱窗。撬开侧门要十分钟，安静但慢；砸窗三秒钟进去，但那一声响在夜里能传出五百米——而你很清楚五百米内有什么在游荡。',
    choices: [
      {
        label: '撬侧门，慢工出细活',
        goto: [
          { to: 'evt/night-pharmacy-loot', weight: 70 },
          { to: 'evt/night-pharmacy-stalker', weight: 30 },
        ],
      },
      {
        label: '砸窗抢时间，赌它们离得远',
        goto: [
          { to: 'evt/night-pharmacy-loot', weight: 40 },
          { to: 'evt/night-pharmacy-swarm', weight: 60 },
        ],
      },
      {
        label: '太悬了，今晚不碰它',
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pharmacy-loot',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '你进来了，而且整条街还是安静的。\n\n手电用衣角罩着，只漏出一线昏光。柜台后的抽屉果然没让你失望：两板阿莫西林、半瓶止痛片、一卷真正的医用绷带——不是你平时用窗帘布撕的那种。最底层的抽屉里还有一盒胰岛素，对你没用，但你还是拿了：对某个素未谋面的人，这就是命。\n\n你把战利品分门别类塞好，从进来的路原样退出去，把侧门虚掩回原状——像从没有人来过。夜风里你回头看了一眼这家小药房：末日第几十天了，还能有这样兵不血刃的一夜，值得记进备忘录。',
    choices: [
      {
        label: '满载而归',
        effects: {
          addItems: ['一板抗生素', '医用绷带'],
          resources: { sanity: 3 },
          memoryNote: '夜探药房，兵不血刃满载而归',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pharmacy-stalker',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '侧门撬到一半，你闻到了那股味道。甜腐味。从药房里面渗出来的。\n\n你停下手里的动作，趴在门缝上往里看——储药间的方向，黑暗比别处更稠的地方，有什么东西极轻地动了一下。潜伏者。这家药房不是没人光顾，是光顾过的人没出来，而它就睡在自己的猎场里，等下一个。\n\n你一寸一寸地把撬棍收回来，倒退着离开门廊，每一步都踩在自己的影子里。直到隔了一条街，你才允许自己正常呼吸。药房里的抗生素很诱人——但它的主人显然也这么觉得。',
    choices: [
      {
        label: '放弃药房，留住性命',
        effects: { resources: { sanity: -5 }, memoryNote: '药房里盘着一只潜伏者，撤了' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-pharmacy-swarm',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '玻璃炸开的脆响还没落地，远处的夜色里就竖起了第一声哭嚎。\n\n你翻进橱窗直奔柜台，手在抽屉里疯狂地扒拉——抓到什么算什么，药板、纱布、一把塑料瓶，全往背包里塞。第二声哭嚎已经在两条街内了，伴着越来越清晰的赤脚拍地声。三十秒，你给自己三十秒。\n\n第一只奔跑者撞进橱窗的时候，你正从后门的门缝里挤出去。它在你身后的药房里横冲直撞，撞翻货架的轰响引来了更多同类。你在后巷狂奔，背包里的药瓶哗啦作响，像一路撒钱的逃犯。\n\n最后你蹲在一个屋顶水箱后面清点：拿到的不少，但代价是这片街区今夜彻底沸腾了——哭嚎声此起彼伏，到处都是循声而来的影子。',
    choices: [
      {
        label: '在屋顶躲到风头过去',
        effects: {
          addItems: ['一板抗生素'],
          resources: { hp: -6, sanity: -9 },
          memoryNote: '砸窗抢药，惊动了整片街区',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cry-help',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    once: true,
    narrative:
      '"救命——有人吗——"\n\n声音从街角那栋塌了半边的居民楼里传出来，女声，沙哑，绝望，每隔十几秒重复一次。在死寂的夜里，这声音传得很远，远到你怀疑整个街区的感染者都在朝它移动。\n\n你贴着墙根观察那栋楼：二楼的一扇窗里有微弱的光晃动，像手机屏幕。喊声就是从那里来的。\n\n你见过真的受困者，也见过用"救命"当鱼饵的猎人。真受困的人喊到第二天嗓子会哑掉；用饵的人，嗓子永远这么"恰到好处"地沙哑。这声音是哪种？你分不出来。你只知道两件事：声音还在继续，而循声者的耳朵比你灵敏十倍。',
    choices: [
      {
        label: '摸上二楼看看——做好是陷阱的准备',
        goto: [
          { to: 'evt/night-cry-real', weight: 50 },
          { to: 'evt/night-cry-trap', weight: 50 },
        ],
      },
      {
        label: '不冒这个险，绕开走',
        effects: { resources: { sanity: -4 }, memoryNote: '没有回应黑夜里的呼救' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '朝那扇窗扔块石头："闭嘴！你在引它们来！"',
        effects: { humanityDelta: -4, resources: { sanity: -2 }, memoryNote: '粗暴地喝止了呼救者' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cry-real',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '是真的。\n\n一个五十多岁的女人被困在塌陷的楼梯间里，一根预制板压住了她的脚踝，手机的最后一格电用来当手电。她看见你的瞬间哭出了声，又立刻死死捂住自己的嘴——她也知道声音意味着什么。\n\n你用半截钢管撬起预制板，她拖出来的脚踝肿得不成样子，但骨头没断。她从怀里掏出全部家当塞给你：小半袋米、一把水果糖、一张写着地址的纸条。"城南，我弟弟在城南的纺织厂宿舍，如果你……如果你路过。"\n\n她一瘸一拐地消失在巷子另一头。你看着手里那把水果糖——橘子味的，糖纸在月光下闪闪发亮，像另一个时代寄来的明信片。',
    choices: [
      {
        label: '收下谢礼，目送她离开',
        effects: {
          resources: { food: 4, sanity: 6 },
          humanityDelta: 8,
          setFlags: ['saved-night-woman'],
          memoryNote: '救出被困的女人，她留下了城南的地址',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'evt/night-cry-trap',
    pool: 'common',
    time: 'night',
    acts: [1, 10],
    narrative:
      '楼梯间确实有个女人——绑在椅子上，嘴被胶带封着，眼睛在看到你的瞬间疯狂地眨。\n\n喊声是录音，手机绑在她头顶的栏杆上循环播放。你反应过来的瞬间，身后的楼道里亮起了两支手电。\n\n"自己走进来的，省事。"\n\n你没等他们说完就动了——侧身撞碎楼梯间的窗户跳上雨棚，雨棚塌了半边，你顺着塌势滚到地面，肩膀着地，疼得眼前全是星星。头顶传来咒骂声和翻窗的动静，你爬起来钻进最窄的那条巷子，黑暗这次站在你这边。\n\n你逃掉了。但那个被绑着当诱饵的女人的眼睛，会在你今后很多个夜里睁着。',
    choices: [
      {
        label: '带着一身伤和那双眼睛逃离',
        effects: {
          resources: { hp: -14, sanity: -12 },
          setFlags: ['saw-bait-woman'],
          memoryNote: '呼救是猎人的陷阱，死里逃生',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
];

/** 全部夜晚系统节点（过场 + 兜底），由 buildContent 收录。 */
export const NIGHT_SYSTEM_NODES: readonly StoryNode[] = [
  ...DUSK_NODES,
  ...DAWN_NODES,
  NIGHT_QUIET_NODE,
];
