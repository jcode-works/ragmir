---
title: "面向 YouTube 创作者的 RAG：基于你的来源生成带引用的脚本 | Ragmir"
description: "把 Ragmir 用作 YouTube 频道的研究室：一次性索引书籍、论文、文章和过往的字幕文件，用带引用的来源检查每份脚本，并让主题 wiki 随着每一期新视频持续更新。"
h1: "面向 YouTube 创作者的 RAG：基于你的资料完成研究、脚本和 wiki"
summary: "一次性索引支撑你视频的书籍、论文、文章和字幕文件。之后，你的 AI 助手会用引用回答研究问题，对照你的来源检查脚本，并维护一个随每期视频不断增长的主题 wiki。Ragmir 负责查找和引用；它不负责写作、录制或发布。"
section: use-case
setup: creator
translationKey: "use-cases/youtube-research"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "rag-citations", "agentic-rag", "local-rag"]
---

以研究为基础的视频需要能够再次找到的来源。Ragmir 把你频道背后的文件夹变成 AI 助手可以搜索的知识库，并且每个回答都指向其出处的页面或行。

## 知识库包含哪些内容

- **书籍和长篇阅读材料**，格式为 PDF 或 EPUB，按页或 EPUB 章节引用。
- **论文、报告和文章**，保存为 PDF、HTML 或 Markdown。
- **你过往的视频**，以字幕文件形式保存：`.srt`、`.vtt`、`.sbv` 及其他字幕格式会按行引用，行中包含时间戳。
- **笔记、脚本和图表**，格式为 Markdown、Word 或 Excel，按行、段落或单元格引用。

Ragmir 可以索引 900 多种文件类型， [支持的格式](/docs/supported-formats/)列出了全部类型。它读取的是文本，而不是声音：视频需要先有字幕或文字稿，Ragmir 才能引用它。

## 设置研究文件夹

把原始来源按收到时的样子保存在一个文件夹中，把 AI 撰写的页面保存在另一个文件夹中。这是 Ragmir `ragmir-wiki` 技能采用的目录结构：

```text
channel/
  raw/    books, papers, articles, and caption files, never edited
  wiki/   topic pages your AI maintains, one topic per page
```

在该文件夹中安装 Ragmir，把两个部分都添加为来源，然后建立索引：

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "raw/**" "wiki/**"
npx rgr ingest
```

然后连接你的助手。支持本地 MCP 服务器的桌面聊天应用，或 Claude Code、Codex、 Cursor 等编程智能体，都可以针对这个文件夹启动 Ragmir 服务器； [集成页面](/zh/integrations/)分别介绍了每种方式。若要为你的智能体提供驱动下述步骤的技能（包括 `ragmir-wiki`），请运行：

```bash
npx skills add jcode-works/ragmir
```

## 用带引用的方式研究视频

向助手提出视频必须回答的问题。它会搜索知识库，读取所需的片段，并逐一引用。

<figure>
  <img src="/guides/creator-search.webp" alt="终端中运行 rgr search，查询的问题是 Should passwords be changed periodically。结果引用了一个 wiki 页面 wiki/password-rotation.md:L8-L12#1、第 12 期的字幕 raw/captions/ep-12-password-myths.vtt:L1-L16#0，以及一份 NIST PDF 的第 25 页 raw/papers/nist-sp-800-63b-4.pdf:p25#56。" width="1440" height="934" loading="lazy" decoding="async">
  <figcaption>在演示频道文件夹中提出的一个问题：返回了 wiki 的一个主题页面、一期往期视频的字幕，以及两者所依据的 NIST 指南页面，每项都附有引用。</figcaption>
</figure>

当来源中没有证据时，Ragmir 不返回任何结果，助手可以说明你的研究并未涵盖该问题。这时应该去寻找新的来源，而不是临场发挥。

## 录制前检查脚本

粘贴草稿，并要求助手对照知识库检查每一条论述。Ragmir 的 MCP 服务器内置了 `answer` 提示词，它会要求每条论述都附上引用；当文档中没有证据时，则会明确说明。

标记为 `weakEvidence` 的片段值得再看一眼。完全没有对应片段的论述，需要补充来源或改写。

## 维护随频道一起增长的主题 wiki

wiki 是研究成果不断积累的地方：每个主题对应一个 Markdown 页面，由你的助手根据来源撰写，每条论述背后都有引用。Ragmir 从不撰写页面，它只负责搜索、引用、列出和审计。

- `compile-source` 提示词会引导模型把一份来源整理成带引用的页面。 `ragmir-wiki` 技能在创建新页面之前，还会先更新已经涵盖某个主题的现有页面。
- 每个页面都在文件头部的前置元数据中记录撰写时所依据的来源，并用 `[[wikilinks]]` 链接相关页面。
- `rgr audit --knowledge` 会检查 wiki：失效链接、缺失页面、已变化的引用，以及来源在撰写后已发生变化的页面。

```bash
npx rgr audit --knowledge --path wiki
```

<figure>
  <img src="/guides/creator-audit.webp" alt="终端中在演示文件夹上运行 rgr audit --knowledge --path wiki。它报告某个页面包含两个链接和两条有效引用；两个缺失页面 Passkeys 和 Password myths 是该页面链接到的；还有一个页面尚未被其他页面链接。" width="1440" height="681" loading="lazy" decoding="async">
  <figcaption>演示 wiki 的审计结果：两条引用依然有效，而该页面链接了两个尚无页面的主题，为下一次研究提供了现成的清单。</figcaption>
</figure>

## 让研究室自动运行

设置完成后，这套流程无需你手动运行：

- 将新来源放入 `raw/` 并导入。它只读取新增和变更的文件：

  ```bash
  npx rgr ingest
  ```

- 每次会话开始时，助手会用 `ragmir_sources` 和 `changedSince` 列出自上次会话以来的变化，然后把这些来源整理进 wiki。
- 定时运行的 `npx rgr audit --knowledge` 会在来源变化时标记需要更新的页面。
- 为下一期视频，助手会根据 wiki 起草提纲，并附上你在录制前需要核对的引用。

录制、剪辑和发布仍由你负责。Ragmir 是这些环节背后的研究层。

## 让研究数据留在本地，或使用云端 AI

无论哪种方式，索引都保存在你的电脑上。通过 Ollama 使用本地模型时，没有任何内容会离开本机。使用云端助手时，它读取的片段会传给其服务商，这对未发布的脚本、赞助协议或私人笔记很重要。 [本地还是云端指南](/zh/local-vs-cloud-rag/)涵盖了模型、硬件，以及做出选择前需要检查的事项。

## 本流程用到的每项 Ragmir 功能

| 步骤 | 功能 | 详情 |
| --- | --- | --- |
| 收集来源 | 900 多种文件类型：PDF、EPUB、Word、Excel、Markdown 和字幕文件 | [支持的格式](/docs/supported-formats/) |
| 扫描的书籍和照片 | 本地 OCR，只有在你使用 `rgr ocr setup` 启用后才会运行 | [配置](/docs/configuration/) |
| 建立和刷新索引 | `rgr ingest` 只读取新增和变更的文件 | [CLI 参考](/docs/cli-reference/) |
| 用你自己的话搜索 | 默认为关键词搜索；可选的本地模型用于处理同义词和其他语言 | [本地还是云端 RAG](/zh/local-vs-cloud-rag/) |
| 为每个片段附上引用 | 每个结果对应的页、行、单元格或 EPUB 章节 | [RAG 引用](/zh/rag-citations/) |
| 阅读引用周围的内容 | `ragmir_expand` 返回该片段及其相邻内容 | [RAG MCP 服务器](/zh/mcp-rag-server/) |
| 检查脚本 | `answer` 提示词要求每条论述都附上引用 | 本页 |
| 撰写 wiki | `ragmir-wiki` 技能和 `compile-source` 提示词 | 本页 |
| 审计 wiki | `rgr audit --knowledge`：失效链接、缺失页面、变化的引用 | 本页 |
| 从上次中断处继续 | `ragmir_sources` 配合 `changedSince` 列出变化的内容 | 本页 |
| 保持私密 | 索引保存在你的电脑上；本地模型可以生成回答 | [本地还是云端 RAG](/zh/local-vs-cloud-rag/) |

## 限制

- Ragmir 不转录音频或视频。请导出字幕，或先自行转录。
- 字幕引用指向字幕文件中的行，其中的时间戳可以带你回到对应时刻；它不会打开视频播放器。
- 助手负责撰写提纲和 wiki。每条引文在上屏之前，都要与其引用的片段核对。

## 后续步骤

- [本地还是云端 RAG：模型、硬件和你的数据](/zh/local-vs-cloud-rag/)
- [RAG 引用：行、页、幻灯片和单元格](/zh/rag-citations/)
- [Agentic RAG：助手如何搜索](/zh/agentic-rag/)
- [支持的格式](/docs/supported-formats/)
