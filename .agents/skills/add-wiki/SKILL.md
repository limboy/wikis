---
name: add-wiki
description: 创建、查询、修改或删除知识点卡片，并将每次数据变更持久化到 wikis SQLite 数据库。用户要求从文本或对话提炼知识、调整已有知识点、维护标签/关联、导入条目或删除条目时使用；按概念、观点、叙事、问题分类生成结构化字段和 Markdown 正文，并执行对应的数据库 CRUD 操作与回读验证。
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
7. 任何可能向数据库插入新条目的操作，必须先向用户展示拟写入卡片的预览，并调用 `ask_question` 工具向用户发起确认交互。用户最初提出“新增”不等于确认预览；未通过 `ask_question` 取得确认前不得运行 `create`，也不得运行可能创建新条目的 `upsert`。

## 数据库操作

数据库 CLI 默认连接 Electron 的 `app.getPath('userData')/wikis.db`：

- macOS：`~/Library/Application Support/wikis/wikis.db`
- Windows：`%APPDATA%/wikis/wikis.db`
- Linux：`${XDG_CONFIG_HOME:-~/.config}/wikis/wikis.db`

若应用日志中的 `[SQLite] Connecting to database at:` 指向其他位置，给每条命令传入 `--db <绝对路径>`。也可以设置专用环境变量 `WIKIS_DB_PATH`。CLI 的 JSON 响应会返回实际 `dbPath`，必须核对它。

```bash
# 列出并了解已有条目；创建关联前先执行
node .agents/skills/add-wiki/scripts/knowledge-db.mjs list

# 读取单条
node .agents/skills/add-wiki/scripts/knowledge-db.mjs get <id>

# 创建；ID 已存在时失败
node .agents/skills/add-wiki/scripts/knowledge-db.mjs create --file <entry.json>

# 更新；文件可以是完整条目，也可以是只含待修改字段的 JSON 对象
node .agents/skills/add-wiki/scripts/knowledge-db.mjs update <id> --file <patch.json>

# 仅在用户明确要求“存在则更新，不存在则创建”时使用
node .agents/skills/add-wiki/scripts/knowledge-db.mjs upsert --file <entry.json>

# 仅在用户明确要求删除时使用
node .agents/skills/add-wiki/scripts/knowledge-db.mjs delete <id>
```

用 `--file -` 从标准输入读取 JSON。命令成功时输出 `{ "ok": true, ... }`；写操作已经在事务内完成回读验证。

## 执行流程

### 创建

1. 运行 `list`，了解现有 ID、标签和可能的关联。
2. 判断唯一 `type`，生成条目。
3. 向用户展示拟写入预览，至少包括 `id`、标题、类型、一句话摘要、标签、来源、关联和正文；正文较长时可以折叠或分节呈现，但不得隐瞒将要写入的内容。
4. 调用 `ask_question` 工具向用户发起确认交互（例如提供“确认写入数据库”、“需要修改卡片内容”等选项）。
5. 获得明确肯定答复后，将最终条目写入临时 JSON 文件并运行 `create`；若用户要求修改，更新预览后必须重新调用 `ask_question` 再次确认。
6. 检查返回值中的 `ok`、`operation`、`dbPath` 和 `data.id`。
7. 再运行 `get <id>` 做最终回读，向用户报告已创建。

### Upsert

1. 仅在用户明确要求“存在则更新，不存在则创建”时使用。
2. 先运行 `get <id>` 判断条目是否存在。
3. 若条目不存在，按“创建”流程展示完整预览并通过 `ask_question` 取得明确确认后，才能运行 `upsert`。
4. 若条目已存在，按“更新”流程处理，不把更新误报为插入。

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

- `concept`：原理、方法论、模型、定义，回答“它是什么”，强调机制和可迁移规律。
- `viewpoint`：作者对事物的判断、主张或立场，回答“应该怎样看”，强调可讨论的核心论点。
- `narrative`：故事、事件、经历、场景与生活片段，回答“发生了什么”，强调人物、处境和过程。
- `question`：尚待澄清、验证或探索的疑问，回答“想弄清什么”，强调问题边界、已知线索和探索方向。

原文引用是内容形态，不是分类。用户提供的原文应忠实保留，并通过 `source` 记录出处；分类只描述这段内容主要在表达什么。一段内容同时具备多种特征时，按用户收藏它的主要原因选择唯一类型，并用标签记录次要特征。

## 数据结构

```typescript
interface KnowledgeEntry {
  id: string
  title: string
  type: 'concept' | 'viewpoint' | 'narrative' | 'question'
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

### `viewpoint`

```markdown
## 核心观点

准确概括作者的判断、主张或立场；写 2–3 段。

## 论证与语境

说明观点针对的问题、形成背景和主要依据；写 3–5 段。

## 边界与回应

补充适用条件、可能的反例和现实启发；写 2–3 段。
```

### `narrative`

```markdown
## 发生了什么

忠实呈现人物、处境、行为和过程；有原文时准确引用并注明出处或语境。

## 背景

交代理解这段经历所需的前因后果或所处的长期状态；写 2–3 段。

## 影响

说明这段经历留下的细节、转折、人性观察或现实映射；写 2–3 段。
```

### `question`

```markdown
## 问题是什么

准确陈述想要弄清的疑问，限定讨论对象、范围和关键术语；写 2–3 段。

## 为什么值得追问

说明问题出现的语境、现实影响、已有假设和真正的未知之处；写 2–3 段。

## 探索方向

整理已知线索、待验证假设、可查证资料和后续问题；写 2–3 段。不要把猜测写成结论。
```

不得虚构原文。若用户没有提供准确文本且无法可靠核实，先索取原文或改用其他类型。

## 结果呈现

写库成功后，向用户提供：

- 执行的操作（创建、更新或删除）和条目 ID；
- 实际数据库绝对路径；
- 回读验证结果；
- 创建或更新时的简洁卡片预览。

不要把“可导入 JSON”作为主要交付物；用户明确要求时再附上。
