import { KnowledgeEntry } from './types'

export const fallbackKnowledgeEntries: KnowledgeEntry[] = [
  {
    id: 'spaced-repetition',
    title: '间隔重复',
    type: 'concept',
    oneLiner: '通过不断增加复习的时间间隔，来对抗遗忘曲线并建立长期记忆的学习技巧。',
    whatItIs: '间隔重复（Spaced Repetition）是一种利用心理学上的间隔效应（Spacing Effect）来提高记忆效果的技术。它的核心思想是：与其在短时间内集中复习多次（临时抱佛脚），不如将复习时间分散在几周、几个月甚至几年中。每次你即将遗忘某个知识点时，进行复习，这样能够最大化地加强记忆。\n\n这种方法通常与闪卡（Flashcards）结合使用，通过算法（如SuperMemo的SM-2算法或Anki使用的算法）根据你对知识的掌握程度动态计算下一次复习的最佳时间。如果你觉得某个卡片很难，它就会很快再次出现；如果你觉得很容易，它的下一次复习时间就会被推迟。',
    whyItMatters: '在知识爆炸的时代，我们获取信息的速度远大于内化的速度。很多时候我们感觉自己"学到了"，但实际上只是短期的熟悉感。间隔重复将学习从一种被动的输入变成了一种可量化、可预测的长期资产积累。\n\n它不仅能极大地提高学习效率，减少不必要的重复学习，还能让人建立起真正的"知识复利"。掌握了核心概念和基础事实，高级的创造性思维和复杂问题解决才成为可能。',
    deepDive: '间隔重复的有效性背后是大脑神经可塑性的机制。每次我们在即将遗忘时努力回想一个信息（Retrieval Practice），都会加强神经元之间的突触连接。这不仅巩固了记忆本身，还使得相关信息更容易被提取。\n\n在现代工具（如Anki）的加持下，间隔重复不仅仅可以用来背单词，还可以用来记忆代码片段、设计模式、思维模型等。高级用户甚至会将复杂的概念拆解成多个简单的闪卡，这本身就是一种深度处理信息（组块化）的过程。',
    related: [
      { targetId: 'ebbinghaus-forgetting-curve', type: 'requires' },
      { targetId: 'generation-effect', type: 'related_to' },
      { targetId: 'chunking', type: 'related_to' }
    ],
    source: {
      type: 'book',
      title: '《学习之道》',
      author: '芭芭拉·奥克利'
    },
    tags: ['学习方法', '记忆', '认知心理学'],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z'
  },
  {
    id: 'fight-or-flight-response',
    title: '战斗或逃跑反应 (Fight-or-Flight Response)',
    type: 'concept',
    oneLiner: '战斗或逃跑反应是生物体面对急迫威胁时，由交感神经系统瞬间触发的生理与心理应激准备，通过迅速调动全身能量以应战或逃离危害。',
    whatItIs: '想象一下，几万年前的一天，你正行走在原始森林中。突然，灌木丛中传来一阵沙沙的响声，一只体型庞大、张着血盆大口的剑齿虎跃到了你面前！\n\n在这一千钧一发的时刻，你的大脑根本来不及进行理性的逻辑思考——“这只老虎多重？我跑得过它吗？”——如果等你思考完毕，可能早就成了老虎的晚餐。相反，你体内一套极其古老而精密的“紧急警报系统”瞬间被激活了。\n\n你的心跳急剧加速，把富含氧气的血液源源不断地泵向四肢大肌肉群；你的瞳孔放大，以便吸收更多光线捕捉敌人动态；你的呼吸变得急促，消化系统和免疫系统临时“关停”以节省能量。整个人在几毫秒内进入了最高警戒状态：要么握紧石斧与猛兽决一死战（战斗），要么拔腿就跑（逃跑）。\n\n这就是著名的“战斗或逃跑反应”（Fight-or-Flight Response）。它是人类和大多数动物在亿万年演化中保留下来的、最核心的生存本能。',
    whyItMatters: '理解战斗或逃跑反应，是现代人掌握情绪调节、压力管理和提升决策质量的一把钥匙。\n\n在现代社会中，我们很少再遇到剑齿虎这样的物理威胁，但人类的大脑并没有完全跟上现代文明的演变速度。当老板在会议上严厉批评你、收到一张紧急账单、或者在社交场合感到尴尬时，我们脑中的“杏仁核”往往无法区分物理危险与心理压力，依然会误以为“剑齿虎来了”，从而瞬间启动这套应激机制。\n\n这种“错配”会导致现代人出现慢性焦虑、肌肉紧绷、消化不良甚至失眠。学会识别身体的生理警报，能帮助我们在面对心理压力时及时拉回理智，避免陷入“情绪劫持”或盲目做出冲动的攻击/逃避行为。',
    deepDive: '1. 神经与内分泌双重通道的瞬间激活\n战斗或逃跑机制主要由下丘脑-垂体-肾上腺轴（HPA轴）和交感神经系统（SNS）共同驱动：\n• 交感-肾上腺髓质通道（快通道）：下丘脑识别威胁后，通过神经信号直接刺激肾上腺髓质释放肾上腺素（Epinephrine）和去甲肾上腺素。这能在几秒钟内急剧提升心率、血压和血糖水平。\n• HPA轴通道（慢通道）：下丘脑释放促肾上腺皮质激素释放激素（CRH），最终促使肾上腺皮质分泌皮质醇（Cortisol，即“压力激素”），维持机体在接下来一段时间内的能量供应和抗压状态。\n\n2. 生理资源的“优先级重组”\n为了最大化瞬时生存概率，身体会进行极端的资源重分配：\n• 增强功能：心率加速、支气管扩张（吸入更多氧气）、血糖与游离脂肪酸升高（提供即时燃料）、痛觉敏感度降低。\n• 抑制功能：唾液分泌减少（口干）、胃肠蠕动减缓（消化暂停）、生殖与免疫系统暂时受抑制、细致的理性思考能力降低（血液偏离前额叶皮层，转向原始的边缘系统）。\n\n3. 现代社会的“急性机制慢性化”困境\n在远古时代，战斗或逃跑反应是短促的：要么几分钟内打赢/逃脱，应激激素随之消退；要么被猛兽吃掉。但在现代生活中，工作压力、财务焦虑、人际关系紧张等“心理剑齿虎”往往长期存在。长期处于激活状态的“战斗或逃跑反应”会导致身体无法重回游走在松弛状态的副交感神经（Rest and Digest），从而引发高血压、慢性心血管疾病、肠易激综合征（IBS）以及抑郁症等心理生理障碍。\n\n4. 扩展模型：从 Fight-or-Flight 到 4F 架构\n随着心理学研究的深入，学者们将这一机制扩展为更加完善的“4F 应激模型”：\n• Fight（战斗）：以对抗、控制、愤怒或进攻回应威胁。\n• Flight（逃跑）：以回避、撤退、拖延或过度忙碌逃避威胁。\n• Freeze（冻结/僵住）：大脑短路、身心麻木、无法思考或行动（如惊吓过度时的“目瞪口呆”）。\n• Fawn（讨好/顺从）：通过讨好、放弃界限来规避冲突和潜在伤害。',
    source: {
      type: 'book',
      title: 'Bodily Changes in Pain, Hunger, Fear and Rage',
      author: 'Walter Bradford Cannon'
    },
    related: [
      { targetId: 'anne-frank-secret-annex-fear', type: 'related_to' },
      { targetId: 'locus-of-control', type: 'related_to' }
    ],
    tags: ['心理学', '生理学', '进化心理学', '应激反应', '思维模型'],
    createdAt: '2026-07-23T19:28:23Z',
    updatedAt: '2026-07-23T19:28:23Z'
  }
]

export async function fetchKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  if (typeof window !== 'undefined' && window.api?.db) {
    try {
      const entries = await window.api.db.getAllEntries()
      if (entries && entries.length > 0) {
        return entries
      }
    } catch (error) {
      console.error('[Renderer] Error fetching entries from SQLite DB:', error)
    }
  }
  return fallbackKnowledgeEntries
}

export async function createKnowledgeEntry(entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.createEntry(entry)
  }
  fallbackKnowledgeEntries.unshift(entry)
  return entry
}

export async function updateKnowledgeEntry(id: string, entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.updateEntry(id, entry)
  }
  const index = fallbackKnowledgeEntries.findIndex((e) => e.id === id)
  if (index !== -1) {
    fallbackKnowledgeEntries[index] = entry
  }
  return entry
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.deleteEntry(id)
  }
  const index = fallbackKnowledgeEntries.findIndex((e) => e.id === id)
  if (index !== -1) {
    fallbackKnowledgeEntries.splice(index, 1)
    return true
  }
  return false
}

// Keep export for backward compatibility where array is expected directly
export const knowledgeEntries = fallbackKnowledgeEntries
