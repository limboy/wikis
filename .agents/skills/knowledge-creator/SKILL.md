---
name: knowledge-creator
description: 创建、查询、修改或删除知识点卡片，并将每次数据变更持久化到 wikis SQLite 数据库。用户要求从文本或对话提炼知识、调整已有知识点、维护标签/关联、导入条目或删除条目时使用；按概念、故事、事件、摘录、通用分类生成结构化字段和 Markdown 正文，并执行对应的数据库 CRUD 操作与回读验证。
---

# Knowledge Creator

将素材提炼为高质量的知识卡片，并把 SQLite 数据库作为唯一事实来源。生成 JSON 或 Markdown 预览不代表任务完成。

## 强制规则

1. 对任何创建、修改、导入、关联或删除请求，必须执行数据库操作。
2. 写入后必须从同一数据库回读并核对结果；只有回读成功才能报告完成。
3. 不要通过修改 `src/main/initial-data.ts`、`src/renderer/src/data/knowledge-base.ts` 或其他静态数组来保存运行时知识数据。
4. 不要在数据库写入失败时声称成功。保留拟写入内容，说明错误和数据库路径。
5. 删除数据前必须有用户明确的删除意图。不要用 `upsert` 代替不确定的创建或更新。
6. 所有命令都从项目根目录执行。使用本 Skill 自带的 `scripts/knowledge-db.mjs`，不要手写 SQL。

## 数据库操作

数据库 CLI 默认连接 Electron 的 `app.getPath('userData')/wikis.db`：

- macOS：`~/Library/Application Support/wikis/wikis.db`
- Windows：`%APPDATA%/wikis/wikis.db`
- Linux：`${XDG_CONFIG_HOME:-~/.config}/wikis/wikis.db`

若应用日志中的 `[SQLite] Connecting to database at:` 指向其他位置，给每条命令传入 `--db <绝对路径>`。也可以设置专用环境变量 `WIKIS_DB_PATH`。CLI 的 JSON 响应会返回实际 `dbPath`，必须核对它。

```bash
# 列出并了解已有条目；创建关联前先执行
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs list

# 读取单条
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs get <id>

# 创建；ID 已存在时失败
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs create --file <entry.json>

# 更新；文件可以是完整条目，也可以是只含待修改字段的 JSON 对象
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs update <id> --file <patch.json>

# 仅在用户明确要求“存在则更新，不存在则创建”时使用
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs upsert --file <entry.json>

# 仅在用户明确要求删除时使用
node .agents/skills/knowledge-creator/scripts/knowledge-db.mjs delete <id>
```

用 `--file -` 从标准输入读取 JSON。命令成功时输出 `{ "ok": true, ... }`；写操作已经在事务内完成回读验证。

## 执行流程

### 创建

1. 运行 `list`，了解现有 ID、标签和可能的关联。
2. 判断唯一 `type`，生成条目。
3. 将条目写入临时 JSON 文件，运行 `create`。
4. 检查返回值中的 `ok`、`operation`、`dbPath` 和 `data.id`。
5. 再运行 `get <id>` 做最终回读，向用户报告已创建。

### 更新

1. 运行 `get <id>`；若不存在，停止并说明，不要隐式创建。
2. 只把用户要求改变的字段写入 patch JSON。CLI 会保留 `id`、`createdAt` 和未提供字段，并自动更新 `updatedAt`。
3. 运行 `update <id> --file <patch.json>`。
4. 再运行 `get <id>`，核对所有目标字段以及未修改字段。

更新标签或关联也必须通过 `update` 落库，例如：

```json
{
  "tags": ["学习方法", "记忆", "认知心理学"],
  "related": [{ "targetId": "chunking", "type": "related_to" }]
}
```

`related` 表示当前条目的出向关系；系统会基于它计算反向链接。不要为了反向展示而伪造第二条关系。

### 删除

1. 运行 `get <id>` 确认目标。
2. 确认用户明确要求删除后运行 `delete <id>`。
3. CLI 会在同一事务中删除目标的出向关系，并清理其他条目指向它的关系。
4. 再运行 `get <id>`；预期返回 `data: null`。

## 分类

为每个条目选择唯一类型：

- `concept`：原理、方法论、模型、定义，强调机制和可迁移规律。
- `story`：案例、轶事、人物经历、寓言，强调情境、转折和启发。
- `event`：历史节点、新闻发布、行业大事，强调事实、脉络和影响。
- `excerpt`：原文片段或引言，强调忠实引用、出处和解读。
- `general`：无法明确归入上述类型的随想、灵感或草稿。

## 数据结构

```typescript
interface KnowledgeEntry {
  id: string
  title: string
  type: 'concept' | 'story' | 'event' | 'excerpt' | 'general'
  oneLiner: string
  content?: string
  source?: {
    type: 'book' | 'article' | 'video' | 'podcast' | 'conversation' | 'personal'
    title: string
    author?: string
    url?: string
  }
  related: Array<{
    targetId: string
    type: 'derived_from' | 'requires' | 'related_to' | 'contrasts_with' | 'part_of'
  }>
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

约束：

- `id` 使用稳定的英文 kebab-case；创建后不可修改。
- `oneLiner` 不超过 60 个字符。
- `tags` 使用 3–5 个核心标签并去重。
- `related.targetId` 必须是已存在条目的 ID，不得指向自身。
- 来源不确定时省略 `source`，不要编造。
- CLI 在创建时补齐缺失的时间戳，在更新时保留 `createdAt` 并刷新 `updatedAt`。

## 正文模板

根据 `type` 使用对应标题。括号中的要求是写作提示，不要保留在最终正文。

### `concept`

```markdown
## 它是怎么回事

从基础开始，用日常类比逐步解释；写 3–5 段。

## 为什么重要

说明实际用途和使用场景；写 2–3 段。

## 深入了解

补充技术细节、边界、研究发现和常见误区；写 3–5 段。
```

### `story`

```markdown
## 故事经过

按背景、冲突或转折、结局展开；写 3–5 段。

## 核心启发

提炼规律、人性洞察或反思；写 2–3 段。

## 现实映射与应用

迁移到生活、工作、决策或学习场景；写 2–3 段。
```

### `event`

```markdown
## 事件过程与脉络

交代时间、地点、人物或组织和发展主线；写 3–5 段。

## 关键影响

说明直接后果及连锁反应；写 2–3 段。

## 深层驱动力与长远影响

分析技术、经济、文化或政策背景及长期启示；写 2–3 段。
```

### `excerpt`

```markdown
## 原文摘录

> 准确引用原文，并注明出处或语境。

## 记录与触动理由

说明记录价值和触发的思考；写 2–3 段。

## 延伸思考

给出自己的解释、重述或应用；写 2–3 段。
```

不得虚构原文。若用户没有提供准确文本且无法可靠核实，先索取原文或改用其他类型。

### `general`

```markdown
## 思考记录

保留灵感、观察、疑问或草稿；写 2–3 段。

## 记录初衷

说明产生这一想法的情境和问题；写 1–2 段。

## 后续探究方向

列出待验证假设、待查资料或延伸方向；写 1–2 段。
```

## 结果呈现

写库成功后，向用户提供：

- 执行的操作（创建、更新或删除）和条目 ID；
- 实际数据库绝对路径；
- 回读验证结果；
- 创建或更新时的简洁卡片预览。

不要把“可导入 JSON”作为主要交付物；用户明确要求时再附上。
