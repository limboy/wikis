---
name: knowledge-creator
description: 创建知识点卡片 Skill。当用户需要新建或从文本/对话中提炼知识点时使用。根据“概念、故事、事件、摘录、通用”不同分类，应用专门的思考框架与模版提炼出结构化的知识条目。
---

# Knowledge Creator Skill (知识点生成器)

本 Skill 旨在协助 AI Agent 将零散的信息、文章段落、用户想法或对话内容，提炼并创建为高质量、结构化的知识点卡片（Knowledge Entry）。

---

## 1. 分类判断标准

在生成知识点前，首先根据输入内容确定唯一的分类类型 `type`：

1. **`concept` (概念)**：抽象的原理、方法论、模型、定义。侧重“是什么、为什么、机制与可迁移规律”。
2. **`story` (故事)**：具象的案例、历史轶事、人物经历、故事寓言。侧重“起承转合、情境、核心启发”。
3. **`event` (事件)**：发生过的客观事实、历史节点、新闻发布、行业大事。侧重“客观事实、时间地点、历史与行业影响”。
4. **`excerpt` (摘录)**：原文片段、经典金句、精彩引言。侧重“忠实原文、触动理由、个人解读与重述”。
5. **`general` (通用/随想)**：无法明确归入上述四类的随笔、灵感碎片、未完草稿。侧重“记录初衷、自由发散、后续思考”。

---

## 2. 字段规范与差异化模版

生成的知识点必须符合标准的 JSON 数据格式（对应 `KnowledgeEntry` 接口）。不同类型在核心文本段落（`oneLiner`, `whatItIs`, `whyItMatters`, `deepDive`）上需要遵循不同的提炼模版。

### 数据结构规范

```typescript
export interface KnowledgeEntry {
  id: string              // kebab-case 小写短横线连接（如 "feynman-technique"）
  title: string           // 知识点标题（简洁有力）
  type: 'concept' | 'story' | 'event' | 'excerpt' | 'general'
  oneLiner: string        // 一句话精炼总结（60字以内）
  whatItIs: string        // 核心定义 / 事实过程 / 原文内容
  whyItMatters: string    // 价值洞察 / 启发意义 / 行业影响
  deepDive: string        // 深层机制 / 情境应用 / 个人重述
  source?: {              // 来源信息（若有）
    type: 'book' | 'article' | 'video' | 'podcast' | 'conversation' | 'personal'
    title: string
    author?: string
    url?: string
  }
  related: Array<{        // 关联知识点 ID 及关系类型
    targetId: string
    type: 'derived_from' | 'requires' | 'related_to' | 'contrasts_with' | 'part_of'
  }>
  tags: string[]          // 3-5 个核心标签
  createdAt: string       // ISO 8601 时间戳
  updatedAt: string       // ISO 8601 时间戳
}
```

---

### 分类模版提炼指南

#### 模板 1：`concept` (概念卡片)
* **oneLiner**: 一句话揭示该概念的核心定义或底层机制。
* **whatItIs**: 阐述概念的科学/学术定义，拆解其核心运作机制与要素构成。避免模糊空话。
* **whyItMatters**: 说明该概念在思维模型、决策、学习或实际工作中的价值。它解决了什么痛点？
* **deepDive**: 深入剖析其背后的神经/心理/系统科学原理，结合跨界应用场景或高级实践。

#### 模板 2：`story` (故事卡片)
* **oneLiner**: 一句话概括故事主角、关键转折与核心顿悟。
* **whatItIs**: 按“背景 - 经过/冲突 - 结果”的叙事结构简述过程。保持情节流畅具象。
* **whyItMatters**: 提炼故事背后的寓意与人性洞察。这个故事想告诉我们什么？
* **deepDive**: 将故事情境映射到现代或当前工作中，探讨如何在类似情境下应用故事带来的经验与智慧。

#### 模板 3：`event` (事件卡片)
* **oneLiner**: 一句话概括发生的客观事件、主体、时间节点与最重要影响。
* **whatItIs**: 客观交代事件要素（Who, When, Where, What），梳理关键发展脉络。
* **whyItMatters**: 分析该事件在历史或行业发展中的地位、引发的连锁反应或范式转移。
* **deepDive**: 探讨推动事件发生的深层驱动力（技术/经济/社会因素），以及对未来的长远远见。

#### 模板 4：`excerpt` (摘录卡片)
* **oneLiner**: 提炼该摘录最具爆发力的金句或核心洞见。
* **whatItIs**: 忠实呈现原文片段或名言，并简述作者当时的语境。
* **whyItMatters**: 说明为什么这段话值得被记录，解析其打破了什么思维惯性或偏见。
* **deepDive**: 运用“费曼学习法”，用自己的话重述这段话的本质，并结合个人经验进行对话与扩展。

#### 模板 5：`general` (通用/随想卡片)
* **oneLiner**: 一句话概括该随笔或灵感的核心主题。
* **whatItIs**: 自由记录当前的思考片段、观察、疑问或未完成的草稿。
* **whyItMatters**: 记录此时此刻产生此想法的初衷，以及它潜在的联结价值。
* **deepDive**: 提出下一步待查阅的资料、待验证的假设或扩展思考方向。

---

## 3. Agent 执行步骤

1. **输入分析**：解析用户给出的素材或主题，确定最贴切的 `type`。
2. **标识生成**：根据 `title` 的英文翻译生成简短规范的 `id`（kebab-case）。
3. **内容提炼**：严格按照对应 `type` 的模版填充 `oneLiner`、`whatItIs`、`whyItMatters`、`deepDive`。
4. **链接与标签**：推断合理的 3-5 个 `tags`，若知识库中已存在相关 `id`，在 `related` 中建立有意义的双向关系（如 `requires`, `related_to` 等）。
5. **输出呈现**：
   - 展现渲染后的结构化卡片预览（Markdown 格式）。
   - 附带可直接导入系统的标准 JSON 代码块。

---

## 4. 示例：生成一个 `story` 类型卡片

**输入**: “给我记一个尼克拉斯·卢曼用几万张纸质卡片高产的故事。”

**输出 JSON**:
```json
{
  "id": "luhmanns-zettelkasten",
  "title": "尼克拉斯·卢曼的卡片盒",
  "type": "story",
  "oneLiner": "一位德国社会学家如何用几万张纸质卡片实现惊人学术产出的传奇故事。",
  "whatItIs": "尼克拉斯·卢曼是20世纪德国最重要的社会学家之一。他一生出版了70多部专著和近400篇学术论文。当被问及为何如此高产时，他将其归功于他的“卡片盒”。在长达几十年的时间里，卢曼积累了约9万张A6大小的纸质卡片，并用复杂的字母数字编号建立了错综复杂的卡片网络。",
  "whyItMatters": "卢曼的卡片盒不仅是存储工具，更是他的“思考对话伙伴”。由于卡片间错综复杂的链接，提问时卡片盒常能给他意想不到的启发。这是自下而上知识涌现的最佳历史证明。",
  "deepDive": "卢曼有两个核心原则：1) 用自己的话重述，绝不直接机械抄录；2) 强制建立卡片间链接。在前数字时代，卢曼用纸笔构建了现代双向链接笔记系统的雏形。",
  "source": {
    "type": "book",
    "title": "《卡片盒笔记法》",
    "author": "申克·阿伦斯"
  },
  "related": [
    { "targetId": "zettelkasten", "type": "related_to" }
  ],
  "tags": ["历史案例", "卢曼", "生产力", "卡片盒"],
  "createdAt": "2026-07-23T18:27:00Z",
  "updatedAt": "2026-07-23T18:27:00Z"
}
```
