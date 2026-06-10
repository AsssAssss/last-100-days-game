import { GOTO_DIRECTOR, type StoryNode } from '../schema';

/**
 * 第一幕「崩塌」Day 1-10
 * 公寓沦陷出逃 → 超市教学 → 陈伯事件（善恶定调）→ 夜袭 → 幕末启程。
 * 善恶分叉通过 humanityDelta 累积，关键 flag：saved-chenbo / doomed-chenbo / map-warning。
 */
export const ACT01_NODES: readonly StoryNode[] = [
  // ───────────────────────── Scene A：Day 1 公寓沦陷 ─────────────────────────
  {
    id: 'act01/a1-awakening',
    act: 1,
    dayAnchor: 1,
    narrative:
      '哭嚎声把你从浅眠里拽出来。不是风——是楼道里的声音，混着指甲刮墙的锐响。你贴到猫眼上：402 的老周倒在楼梯口，三个影子伏在他身上，肩胛骨以不可能的角度耸动着。其中一个突然直起脖子，朝你的门"看"过来。它们进楼了。这栋你苟了很久的公寓，今天塌了。',
    choices: [
      {
        label: '从厨房窗户爬消防梯，立刻走',
        effects: { memoryNote: '公寓沦陷，从消防梯出逃' },
        goto: 'act01/a1-fire-escape',
      },
      {
        label: '赌楼道还没被堵死，走正门下楼',
        goto: [
          { to: 'act01/a1-corridor-clear', weight: 55 },
          { to: 'act01/a1-corridor-runner', weight: 45 },
        ],
      },
      {
        label: '先把家里能带的全收拾上，再走',
        effects: { resources: { food: 4, water: 3 }, memoryNote: '冒险收拾物资后出逃' },
        goto: [
          { to: 'act01/a1-corridor-runner', weight: 60 },
          { to: 'act01/a1-fire-escape', weight: 40 },
        ],
      },
    ],
  },
  {
    id: 'act01/a1-fire-escape',
    act: 1,
    narrative:
      '消防梯比记忆里更烂。爬到三楼，一截锈梯在你脚下整个脱开，你抓住栏杆才没摔下去，铁条在掌心拉开一道口子。落地时楼上传来玻璃碎裂声——它们进了你的家。你贴着墙根往巷子深处走，不敢跑：跑步声会把它们引下来。',
    choices: [
      {
        label: '压住呼吸，慢慢离开这个街区',
        effects: { resources: { hp: -5 }, memoryNote: '消防梯受了点伤，安全离开' },
        goto: 'act01/a1-street',
      },
    ],
  },
  {
    id: 'act01/a1-corridor-clear',
    act: 1,
    narrative:
      '你数到三，拧开门冲向楼梯。楼道里只剩老周——已经不动了，半边脸贴着地砖。三个影子不知去了哪层。你跨过他时他的手机还亮着，屏幕上是没发出去的"快跑"。你一口气下到一楼，初春的冷空气像一巴掌拍醒了你：从今天起，没有家了。',
    choices: [
      {
        label: '离开这条街',
        effects: { resources: { sanity: -3 }, memoryNote: '跨过邻居的尸体逃出公寓' },
        goto: 'act01/a1-street',
      },
    ],
  },
  {
    id: 'act01/a1-corridor-runner',
    act: 1,
    narrative:
      '你拉开门的瞬间就知道错了。一个奔跑者正趴在二楼半的转角啃食什么，听见门轴响，它的头"咔"地拧过来——那是 501 的女孩，红色的眼睛里没有任何东西。它发出一声不像人的哭嚎，四肢着地朝你冲上来。',
    choices: [
      {
        label: '握紧小刀，迎上去',
        effects: {
          resources: { hp: -15, sanity: -10 },
          memoryNote: '在楼道里第一次杀死奔跑者',
        },
        goto: 'act01/a1-first-kill',
      },
      {
        label: '侧身把它撞下楼梯，夺路就跑',
        effects: { resources: { hp: -5, sanity: -5 } },
        goto: 'act01/a1-street-chase',
      },
      {
        label: '退回屋里反锁房门',
        goto: 'act01/a1-trapped',
      },
    ],
  },
  {
    id: 'act01/a1-first-kill',
    act: 1,
    narrative:
      '刀进去的时候没有你想象的阻力，拔出来的时候有。它抽搐着滑下墙，红眼睛慢慢失焦——有那么半秒，你觉得那里面有什么东西回来了，像是解脱。你的手在抖，刀柄上全是滑腻的温热。你在它身上摸到半包压缩饼干。这曾经是个会在电梯里跟你点头的姑娘。',
    choices: [
      {
        label: '把刀擦干净，下楼',
        effects: { resources: { food: 2 }, memoryNote: '杀死了 501 的女孩——她已经不是她了' },
        goto: 'act01/a1-street',
      },
    ],
  },
  {
    id: 'act01/a1-street-chase',
    act: 1,
    narrative:
      '你冲出单元门，身后的哭嚎引来了更多回应——左边巷口、对面天台，此起彼伏。你在垃圾站翻身钻进一辆没了轮子的面包车，从后窗的破洞里看着三个影子从车边掠过去。你在车里趴了两个小时，背包侧袋的水瓶不知什么时候摔丢了。',
    choices: [
      {
        label: '等声音散尽，从另一头出去',
        effects: { resources: { water: -3, sanity: -5 }, memoryNote: '被追逐，躲进废面包车脱身' },
        goto: 'act01/a1-street',
      },
    ],
  },
  {
    id: 'act01/a1-trapped',
    act: 1,
    narrative:
      '反锁、顶柜子、退到窗边——一气呵成。门板很快开始震，指甲刮在防盗门上的声音让你头皮发麻。这扇门撑不了一夜。窗外是四楼，楼下隔两米是邻楼的空调外机阵，再往下是雨棚。你这辈子没干过这种事。',
    choices: [
      {
        label: '爬出窗台，从空调外机下去',
        goto: [
          { to: 'act01/a1-climb-down', weight: 70 },
          { to: 'act01/death-fall', weight: 30 },
        ],
      },
    ],
  },
  {
    id: 'act01/a1-climb-down',
    act: 1,
    narrative:
      '第二台外机的支架在你脚下弯了一下，你整个人荡在四楼外侧，听见自己心跳如鼓。最后两米你是摔在雨棚上滚下来的，手肘擦掉一块皮。但你活着。楼上你的房间里传来柜子倒地的巨响——它们进去了。那里已经不属于你了。',
    choices: [
      {
        label: '忍着痛离开',
        effects: { resources: { hp: -10 }, memoryNote: '从四楼外墙爬下来逃生' },
        goto: 'act01/a1-street',
      },
    ],
  },
  {
    id: 'act01/death-fall',
    act: 1,
    narrative:
      '支架断裂的瞬间你甚至来不及喊。世界翻转了一圈，雨棚边缘擦过你的视野，然后是地面。你躺在巷子里，感觉不到腿，只看见自己呼出的白气越来越淡。楼道里的哭嚎声渐渐近了——至少，你不会知道后面发生的事。',
    choices: [],
    ending: { reason: '从四楼坠落' },
  },
  {
    id: 'act01/a1-street',
    act: 1,
    narrative:
      '天黑得很快。这座城市没有灯，只有西边什么地方烧起来的火光把云染成脏橙色。你需要一个过夜的地方——便利店的卷帘门留着半人高的缝；地下车库黑得像一张嘴；桥洞底下有一小堆篝火的微光，火边坐着一个裹军大衣的老人。',
    choices: [
      {
        label: '钻进便利店仓库过夜',
        effects: { dayPassed: true, memoryNote: '在便利店仓库过了第一夜' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '摸黑进地下车库',
        effects: { resources: { sanity: -5 }, dayPassed: true, memoryNote: '在阴冷的地下车库过夜' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '走向桥洞的火光',
        goto: 'act01/a1-bridge-man',
      },
    ],
  },
  {
    id: 'act01/a1-bridge-man',
    act: 1,
    narrative:
      '老人没有抬头，只是把火边的位置往旁边让了让。"坐吧。第一天？"他看了一眼你抖个不停的手，"都看得出来。"他的全部家当是一条毯子、一个铁皮罐和半袋花生米。火光里你们都没再说话。后半夜风大了，老人在睡梦里咳得很厉害。',
    choices: [
      {
        label: '把自己的饼干分他一半',
        effects: {
          resources: { food: -2 },
          humanityDelta: 6,
          dayPassed: true,
          memoryNote: '与桥洞老人分食，第一夜有了火光',
        },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '天没亮就走，谁也不欠谁',
        effects: { dayPassed: true, memoryNote: '在桥洞蹭了一夜火' },
        goto: GOTO_DIRECTOR,
      },
      {
        label: '趁他熟睡，抽走他的毯子',
        effects: {
          humanityDelta: -8,
          addItems: ['一条旧军毯'],
          resources: { sanity: -3 },
          dayPassed: true,
          memoryNote: '偷走了桥洞老人的毯子',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },

  // ───────────────────────── Scene B：Day 3 超市（声音规则教学） ─────────────────────────
  {
    id: 'act01/b1-supermart',
    act: 1,
    dayAnchor: 3,
    narrative:
      '城南的"惠民超市"门口横着一辆撞歪的购物车。卷帘门被撬开过，里面货架东倒西歪，但深处的货品区看着还有东西。你站在门口听了一分钟：里面有响动——很轻，不规律，像是什么东西碰倒了罐头，在地上滚。',
    choices: [
      {
        label: '蹲低，贴着货架慢慢摸进去',
        goto: 'act01/b1-sneak',
      },
      {
        label: '快进快出，抓到什么算什么',
        goto: [
          { to: 'act01/b1-grab-success', weight: 40 },
          { to: 'act01/b1-grab-runner', weight: 60 },
        ],
      },
      {
        label: '太冒险了，去别处碰运气',
        effects: { memoryNote: '放弃了可疑的超市' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-sneak',
    act: 1,
    narrative:
      '你贴着冰柜挪过去，心跳声大得像要出卖你。转过货架——一只瘦得露骨的猫从罐头堆上跳下来，冲你呲牙，又消失在阴影里。你长出一口气，这才注意到收银台后面有一扇虚掩的内仓门，门缝里透出一股甜腐味，像烂掉的水果混着泥土。',
    choices: [
      {
        label: '推开内仓门看看',
        goto: 'act01/b1-stockroom',
      },
      {
        label: '只拿外面货架的，见好就收',
        effects: {
          resources: { food: 5, water: 4 },
          memoryNote: '超市外场搜到一批物资',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-stockroom',
    act: 1,
    narrative:
      '内仓没有窗，黑得彻底。甜腐味浓得发稠，墙角好像有什么东西在极轻地、湿润地呼吸。你想起桥洞老人咳嗽间说过的话："闻到烂水果味就退出来，那是它们睡觉的味道。"你的打火机就在兜里。',
    choices: [
      {
        label: '点亮打火机',
        goto: [
          { to: 'act01/b1-stalker-ambush', weight: 50 },
          { to: 'act01/b1-stock-loot', weight: 50 },
        ],
      },
      {
        label: '听话，倒退着出去',
        effects: {
          resources: { food: 3, water: 2 },
          memoryNote: '内仓有怪味，搜了外场就撤',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-stock-loot',
    act: 1,
    narrative:
      '火苗照亮的瞬间你差点叫出来——墙角蜷着一具半融进菌毯的尸体，胸腔里长满了灰白色的伞盖。但它是死的，死透了。仓库另一头码着整箱的矿泉水和方便面，还有一个药品周转箱。你搬东西的时候手一直在抖，但你没有空手离开。',
    choices: [
      {
        label: '满载而归，今天够本了',
        effects: {
          resources: { food: 8, water: 6 },
          addItems: ['一瓶医用酒精'],
          memoryNote: '超市内仓大丰收，也第一次看见菌毯',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-stalker-ambush',
    act: 1,
    narrative:
      '火光亮起的刹那，"墙角的尸体"动了。菌丝从它破开的脸颊里支棱着，半边身体却快得不可思议——潜伏者。它贴着货架弹射过来，你只来得及侧身，肩膀被它的指甲犁开三道口子。打火机滚进黑暗里，整个世界只剩它湿润的呼吸声。',
    choices: [
      {
        label: '抽刀，朝呼吸声捅过去',
        effects: {
          resources: { hp: -20, sanity: -10 },
          memoryNote: '在黑暗的内仓里杀死一只潜伏者',
        },
        goto: 'act01/b1-stalker-killed',
      },
      {
        label: '丢下背包侧袋的口粮，滚出门外',
        effects: {
          resources: { food: -4, hp: -8, sanity: -8 },
          memoryNote: '被潜伏者伏击，丢了口粮才脱身',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-stalker-killed',
    act: 1,
    narrative:
      '你不知道捅了多少下，直到那东西不再动。你瘫坐在地上摸回打火机，火光里看清了它的脸——半张是菌盖，另外半张还戴着超市的工牌：值班经理，王伟。你包扎肩膀的时候在想：他是不是就一直没敢离开自己的超市。仓库里的物资现在是你的了。',
    choices: [
      {
        label: '搜刮完毕，离开这里',
        effects: {
          resources: { food: 8, water: 6 },
          addItems: ['一瓶医用酒精'],
          memoryNote: '杀死潜伏者后清空了超市内仓',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-grab-success',
    act: 1,
    narrative:
      '你像抢银行一样冲进去，双臂横扫货架，把所有还有包装的东西全划进背包。深处传来什么东西被惊动的窸窣声，你没有回头，抱着背包冲出卷帘门，一路跑过两个街口才停下来。收获不算多，但一根头发都没少。',
    choices: [
      {
        label: '找个安全处清点收获',
        effects: {
          resources: { food: 4, water: 2 },
          memoryNote: '速抢超市得手',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-grab-runner',
    act: 1,
    narrative:
      '你扫倒第二排货架的时候，整面墙的玻璃罐哗啦砸在地上。深处的黑暗里立刻竖起三声哭嚎——奔跑者，至少三只，朝你冲过来的脚步声像鼓点。卷帘门在十米外，货架顶在头顶两米。',
    choices: [
      {
        label: '赌速度，冲向卷帘门',
        goto: [
          { to: 'act01/b1-grab-escape', weight: 60 },
          { to: 'act01/death-runners', weight: 40 },
        ],
      },
      {
        label: '爬上货架顶，等它们失去兴趣',
        effects: {
          resources: { sanity: -8 },
          dayPassed: true,
          memoryNote: '在超市货架顶熬过一夜',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/b1-grab-escape',
    act: 1,
    narrative:
      '你贴着卷帘门的缝挤出去时，一只手抓住了你的背包带。你整个人被拽得撞在铁门上，情急之下挥刀向后乱捅，那只手松开了。你滚到街上连滚带爬地跑，背包侧面被撕开一道口子，一路漏着东西。你不敢停下来捡。',
    choices: [
      {
        label: '跑到安全处，检查伤势',
        effects: {
          resources: { hp: -12, food: 2, sanity: -6 },
          memoryNote: '从奔跑者爪下抢出超市，挂了彩',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/death-runners',
    act: 1,
    narrative:
      '距离卷帘门还有三米的时候，第一只奔跑者撞上你的后背。你和它一起砸进购物车堆里，第二只咬住了你的小腿。你还在挥刀，可是第三只来了，然后是第四只——黑暗里到处都是红色的眼睛。最后你听见的，是自己的声音也变成了那种哭嚎。',
    choices: [],
    ending: { reason: '死于奔跑者群' },
  },

  // ───────────────────────── Scene C：Day 5 陈伯（善恶定调） ─────────────────────────
  {
    id: 'act01/c1-pharmacy',
    act: 1,
    dayAnchor: 5,
    narrative:
      '仁济药房的卷帘门半开着，里面传来玻璃碎裂声。你贴墙看进去：一个穿白褂的老头被三只奔跑者堵在柜台后面，正用货架当盾牌死撑，柜台上摊着一个塞满药品的铁皮箱。老头瞥见门口的你，没呼救，只是用口型说了两个字：侧门。',
    choices: [
      {
        label: '冲进去，帮他打',
        effects: {
          resources: { hp: -15, sanity: -5 },
          humanityDelta: 10,
          setFlags: ['saved-chenbo'],
          memoryNote: '冲进药房救下陈伯',
        },
        goto: 'act01/c1-chenbo-thanks',
      },
      {
        label: '守在门口，看情况再说',
        goto: 'act01/c1-watch',
      },
      {
        label: '绕去侧门——但目标是那箱药',
        goto: 'act01/c1-steal',
      },
    ],
  },
  {
    id: 'act01/c1-chenbo-thanks',
    act: 1,
    narrative:
      '最后一只奔跑者倒下时，老头扶着柜台喘了很久，然后给你倒了一杯真正的热水。"陈守仁，原来是这儿的坐堂医师。"他给你处理了伤口，又在你的地图上画了一条线，"东郊有个安全区，走环城铁路最稳。记住：听见「咔嗒咔嗒」就趴下别动，那种东西看不见你，只听得见你。"临走他塞给你两盒压缩干粮，和半张手绘地图。',
    choices: [
      {
        label: '谢过陈伯，记下他教的一切',
        effects: {
          resources: { food: 5, water: 3, hp: 8 },
          addItems: ['陈伯的手绘地图'],
          setFlags: ['has-map', 'knows-clicker-rule'],
          memoryNote: '陈伯赠图授课："听见咔嗒声就趴下别动"',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/c1-watch',
    act: 1,
    narrative:
      '你按住了自己的脚。老头撑不住的瞬间做了一件疯狂的事：他把整瓶酒精泼在货架上点了火。三只奔跑者扑进火里嘶嚎，他自己也被燎着了半边身子，连滚带爬地撞出卷帘门，倒在你脚边的人行道上，烧伤的手里还死死攥着那半张地图。',
    choices: [
      {
        label: '扑灭他身上的火，救人',
        effects: {
          humanityDelta: 6,
          setFlags: ['saved-chenbo'],
          memoryNote: '在药房门口救下重伤的陈伯',
        },
        goto: 'act01/c1-chenbo-dying',
      },
      {
        label: '等火停了，拿走他手里的东西',
        effects: {
          humanityDelta: -10,
          resources: { sanity: -12 },
          addItems: ['陈伯的手绘地图', '一个铁皮药箱'],
          setFlags: ['map-warning'],
          memoryNote: '看着老医师断气，拿走了他的地图和药箱',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/c1-chenbo-dying',
    act: 1,
    narrative:
      '你把他拖到街角，用他自己药箱里的烫伤膏处理他的背。他撑过了那个下午，却没撑过那个夜。后半夜他清醒了一阵，把地图塞进你手里，又用指甲在背面划了五个字："别信穿制服的"。天亮前他停止了呼吸——平静得像是终于下班了。你埋不了他，只能用货架的篷布把他盖好。',
    choices: [
      {
        label: '带上地图和他的告诫上路',
        effects: {
          resources: { sanity: -10 },
          addItems: ['陈伯的手绘地图'],
          setFlags: ['has-map', 'map-warning'],
          dayPassed: true,
          memoryNote: '陈伯死前留下地图与遗言："别信穿制服的"',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/c1-steal',
    act: 1,
    narrative:
      '侧门没锁。你猫进配药间，那个铁皮药箱就在手边的柜台上——抗生素、止痛药、绷带，末日里的硬通货。外面货架的撞击声越来越急，老头的声音从缝隙里挤过来，这次不是口型了："小友……搭把手！"你的手已经搭在药箱上。',
    choices: [
      {
        label: '抱起药箱，从侧门离开',
        effects: {
          humanityDelta: -12,
          addItems: ['一个铁皮药箱'],
          resources: { sanity: -8 },
          memoryNote: '抱走药箱，扔下被围的老医师',
        },
        goto: 'act01/c1-steal-leave',
      },
      {
        label: '……该死的。回头帮他',
        effects: {
          resources: { hp: -15, sanity: -5 },
          humanityDelta: 10,
          setFlags: ['saved-chenbo'],
          memoryNote: '差点偷了药箱，最后还是救了陈伯',
        },
        goto: 'act01/c1-chenbo-thanks',
      },
      {
        label: '推倒配药柜堵住通道——既挡住怪，也断了他的退路',
        effects: {
          humanityDelta: -18,
          addItems: ['一个铁皮药箱', '陈伯的手绘地图'],
          resources: { sanity: -5 },
          setFlags: ['doomed-chenbo', 'map-warning'],
          memoryNote: '为了脱身堵死了老医师的退路，拿走了一切',
        },
        goto: 'act01/c1-steal-dark',
      },
    ],
  },
  {
    id: 'act01/c1-steal-leave',
    act: 1,
    narrative:
      '你抱着药箱走出两条街，还能听见那个方向传来的动静，然后是安静。安静比声音更响。你蹲在路边清点战利品：药品够你撑过整个冬天。你发现自己的手这次没有抖。你不确定这算是变强了，还是变成了别的什么东西。',
    choices: [
      {
        label: '收好药箱，继续赶路',
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/c1-steal-dark',
    act: 1,
    narrative:
      '柜子倒下的轰响盖住了所有声音——包括他最后喊的那句什么。你从侧门出来，绕到正面：卷帘门里火光摇曳，三个影子围着柜台。你低头看手里的地图，背面有几个旧字迹："别信穿制服的"。看来他早就想把这个交给什么人了。现在它是你的了。你转身离开，步子很稳。',
    choices: [
      {
        label: '把这条街甩在身后',
        goto: GOTO_DIRECTOR,
      },
    ],
  },

  // ───────────────────────── Scene D：Day 8 夜袭 ─────────────────────────
  {
    id: 'act01/d1-night-sweep',
    act: 1,
    dayAnchor: 8,
    narrative:
      '你在一栋写字楼六层过夜。后半夜，楼下传来连绵的脚步声——不是一只，是一群，伴着哭嚎在楼道里炸开回声。奔跑者在扫楼，一层一层往上。你吹灭蜡烛：门是玻璃的，窗外是天台连廊，桌上还有你来不及收的打火机和半瓶酒精。',
    choices: [
      {
        label: '顶住门，屏住呼吸赌它们路过',
        effects: { resources: { sanity: -10 } },
        goto: [
          { to: 'act01/d1-hold-pass', weight: 75 },
          { to: 'act01/d1-break-in', weight: 25 },
        ],
      },
      {
        label: '从天台连廊跳去邻楼',
        goto: [
          { to: 'act01/d1-roof-ok', weight: 65 },
          { to: 'act01/death-roof', weight: 35 },
        ],
      },
      {
        label: '点燃酒精棉扔下天井，引开它们',
        goto: [
          { to: 'act01/d1-fire-ok', weight: 60 },
          { to: 'act01/d1-fire-bad', weight: 40 },
        ],
      },
    ],
  },
  {
    id: 'act01/d1-hold-pass',
    act: 1,
    narrative:
      '它们在你这层停留了四十分钟。你抵着门背，听一只奔跑者的鼻尖几乎贴着玻璃门嗅探，它呼出的雾气在玻璃上凝成一小片白。你的大腿肌肉抖到几乎抽筋，但你一动没动。天亮之前，脚步声潮水一样退去了。你瘫在地上，发现自己咬破了嘴唇。',
    choices: [
      {
        label: '天亮后撤离这栋楼',
        effects: { dayPassed: true, memoryNote: '屏息熬过奔跑者扫楼' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/d1-break-in',
    act: 1,
    narrative:
      '玻璃门炸开的瞬间你被气浪一样的身体撞翻。黑暗里全是抓挠和嘶嚎，你的刀捅进什么东西又被压住，牙齿擦着你的护臂咬下来。你抓起桌上的酒精瓶砸在最近那只的脸上，趁它们退缩的半秒翻出窗口，吊在连廊边缘荡了过去。',
    choices: [
      {
        label: '连夜逃离，不敢回头',
        effects: {
          resources: { hp: -25, sanity: -12 },
          dayPassed: true,
          memoryNote: '门被攻破，血战后从连廊脱身',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/d1-roof-ok',
    act: 1,
    narrative:
      '两栋楼之间一米八的空隙，你这辈子没跳过这么远。落地时脚踝传来一声闷响，疼得你眼前发黑，但你死死咬住没出声。对面楼里的哭嚎声此起彼伏地搜过每一层，没有谁想到猎物已经在隔壁楼的水箱后面蜷成一团。',
    choices: [
      {
        label: '处理脚踝，等天亮',
        effects: { resources: { hp: -8 }, dayPassed: true, memoryNote: '跳楼逃生，扭伤了脚踝' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/death-roof',
    act: 1,
    narrative:
      '起跳的瞬间你就知道距离不够。手指擦过对面的女儿墙，差了十公分。下坠的六层里你想到的居然是很多年前体育课上，你也是全班跳远最差的那个。这次没有沙坑。',
    choices: [],
    ending: { reason: '夜逃时坠楼' },
  },
  {
    id: 'act01/d1-fire-ok',
    act: 1,
    narrative:
      '火球落在天井的旧沙发上，轰地烧起来。整栋楼的哭嚎声瞬间转向，它们扑向火光的样子像是扑向猎物——或者像扑向什么它们还记得的东西。你从消防梯反方向下楼，背后的火光把你的影子拉得很长。',
    choices: [
      {
        label: '趁乱撤走',
        effects: { dayPassed: true, memoryNote: '用火引开扫楼的奔跑者群' },
        goto: GOTO_DIRECTOR,
      },
    ],
  },
  {
    id: 'act01/d1-fire-bad',
    act: 1,
    narrative:
      '火没有落进天井——它砸在五楼的窗台上弹了回来，窗帘轰然引燃。十分钟后整层楼都在烧，你夹在浓烟和楼下的哭嚎声之间，从消防梯半摔半爬地逃出来，背包带烧断了一根，掉了不少东西在火场里。',
    choices: [
      {
        label: '在街角清点损失',
        effects: {
          resources: { hp: -6, food: -3, water: -2, sanity: -5 },
          dayPassed: true,
          memoryNote: '引火失手烧了自己的藏身楼，损失惨重',
        },
        goto: GOTO_DIRECTOR,
      },
    ],
  },

  // ───────────────────────── Scene E：Day 10 幕末 ─────────────────────────
  {
    id: 'act01/e1-act-end',
    act: 1,
    dayAnchor: 10,
    narrative:
      '十天。你用十天从一个守着冰箱过日子的人，变成了现在这个蹲在天桥底下、听见风声都会按住刀柄的东西。城西已经空了，往东，所有传闻都指向同一个词：安全区。你摸出地图——不管它是谁给你的——背面那行字在晨光里很清楚：别信穿制服的。东郊，环城铁路。该上路了。',
    choices: [
      {
        label: '出发，沿环城铁路向东',
        effects: {
          resources: { sanity: 5 },
          dayPassed: true,
          setFlags: ['act01-complete'],
          memoryNote: '第一幕终：离开城西，向东郊安全区进发',
        },
        goto: 'act02/placeholder',
      },
      {
        label: '再花一天搜罗补给，明天出发',
        effects: { dayPassed: true, memoryNote: '出发前最后一轮搜刮' },
        goto: [
          { to: 'act01/e1-last-scavenge', weight: 60 },
          { to: 'act01/e1-empty-handed', weight: 40 },
        ],
      },
    ],
  },
  {
    id: 'act01/e1-last-scavenge',
    act: 1,
    narrative:
      '运气不错：一辆翻倒的小货车货厢里有半箱没人动过的瓶装水和几袋米。你装满背包，把剩下的藏回原处——说不定有别人需要，或者说不定你还会回来。这座城市再没什么可留恋的了。',
    choices: [
      {
        label: '满载出发，向东',
        effects: {
          resources: { food: 5, water: 6 },
          dayPassed: true,
          setFlags: ['act01-complete'],
          memoryNote: '第一幕终：补给充足，向东郊进发',
        },
        goto: 'act02/placeholder',
      },
    ],
  },
  {
    id: 'act01/e1-empty-handed',
    act: 1,
    narrative:
      '你翻了一整天，只找到几个被撬空的储物柜和一地碎玻璃。这一带能搜的早被搜干净了——留在原地只会饿死。天黑前你回到天桥下，把明天的路线又记了一遍。',
    choices: [
      {
        label: '明早出发，不再回头',
        effects: {
          dayPassed: true,
          setFlags: ['act01-complete'],
          memoryNote: '第一幕终：空手而归后向东郊进发',
        },
        goto: 'act02/placeholder',
      },
    ],
  },

  // ───────────────────────── 第二幕占位（M2 替换） ─────────────────────────
  {
    id: 'act02/placeholder',
    act: 2,
    narrative:
      '你踏上环城铁路的枕木，朝东方走去。铁轨在晨雾里伸向看不见的远方——猎人的地盘、孢子弥漫的地铁、铁丝网后的"安全区"，都在前面等着你。\n\n（测试版到此为止——第二幕《饥饿》即将到来。）',
    choices: [],
    ending: { reason: '第一幕完（测试版）' },
  },
];
