---
title: "事件响应的 RAG：修复前先给出带引用的诊断 | Ragmir"
description: "借助 Ragmir 为值班修复提供依据：Claude Code 或 Codex 先依据你的运维手册、过往事后复盘和源代码完成带引用的事件诊断，再修复问题，并补充一个测试。"
h1: "事件响应的 RAG：依据运维手册诊断，再用测试完成修复"
summary: "一次性索引你的运维手册、过往事件报告和源代码。事件触发时，你的编程智能体会根据这些文档进行诊断，引用每个来源，然后才修改代码并添加测试。Ragmir 负责查找和引用，智能体负责推理和编辑。"
section: use-case
setup: agents
translationKey: "use-cases/incident-response"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "integrations/claude-code", "integrations/codex", "rag-citations"]
---

凌晨 3 点，结账请求超时。答案往往早已写下：运维手册中的某个步骤，上次发生时的事后复盘，或是调用支付服务那段代码中的注释。Ragmir 让你的编程智能体在触碰生产代码之前，先找到这些页面并加以引用。

## 知识库包含哪些内容

- **运维手册和值班指南**，格式为 Markdown，按行引用。
- **事后复盘和事件报告**，格式为 Markdown、Word 或 PDF，按行或按页引用。
- **架构笔记和 ADR**，让智能体了解超时或重试机制存在的原因。
- **源代码和配置**，按行引用，支持 Ragmir 所读取的语言和格式。
- **你选择保留的导出日志或告警规则**，例如 `.log`、`.json` 或 `.yaml` 文件。

Ragmir 可以索引 900 多种文件类型， [支持的格式](/docs/supported-formats/)列出了全部类型。凭据、`.env` 文件和密钥永远不会进入索引。

## 设置文件夹

在代码仓库中运行这些命令，或在存放运维手册的文件夹中运行：

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "docs/runbooks/**" "docs/postmortems/**" "src/**"
npx rgr ingest
```

然后连接你的智能体。 [Claude Code](/zh/integrations/claude-code/) 和 [Codex](/zh/integrations/codex/) 页面分别说明了如何在你的机器上启动 Ragmir 的 MCP 服务器。下面的技能会教智能体掌握搜索、展开和细化的循环：

```bash
npx skills add jcode-works/ragmir
```

导入是增量的。每新增一份事后复盘，就再运行一次 `npx rgr ingest`；它只读取新增和变更的文件。

## 先带引用诊断，再修复

把症状和规则一并告诉智能体：修复必须等待诊断完成。

```prompt
自上次部署以来，结账请求一直超时。在修改任何代码之前，请搜索运维手册、过往的事后复盘以及支付客户端。引用你所依据的每一个来源。

这种故障以前发生过吗？事后复盘做了什么改动，这项改动现在还在代码里吗？

提出修复方案，指出证明该方案合理的引用片段，然后实施修复并添加测试。
```

智能体会搜索，用 `ragmir_expand` 展开所需的片段，并引用每一条。当文档中没有证据时， Ragmir 不返回任何结果，智能体会如实说明，而不是仅凭症状猜测。标记为 `weakEvidence` 的片段值得再看一眼。

你也可以自己运行同样的搜索：

```bash
npx rgr search "checkout timeout payment gateway" --compact
```

## 保持运维手册真实可靠

事件本身也是对文档的一次检验。如果智能体不得不说“没有证据”，说明运维手册存在缺口。事件关闭后，请补写缺失的步骤，然后重新导入。

- 智能体可以用 `ragmir_sources` 和 `changedSince` 列出自上次会话以来的变化。
- `rgr audit` 会将你的来源与索引进行比对，列出缺失、过期或被跳过的文件。
- Ragmir MCP 服务器中的 `answer` 提示词会要求每条论述都附上引用；当文档中没有证据时，则会明确说明。

## 保留在本地，或使用云端 AI

无论哪种方式，索引都保存在你的电脑上。Claude Code 和 Codex 会把它们读取的片段发送给各自服务商的模型。运维手册和代码中可能出现内部主机名、客户或事件的名称，因此要谨慎选择哪些文件夹进入知识库。 [本地还是云端指南](/zh/local-vs-cloud-rag/)列出了需要检查的事项：训练、保留期限、地域、访问权限和范围。

## 限制

- Ragmir 不会监控你的系统。它读取的是文档，而不是实时指标、链路追踪或仪表盘。请粘贴或导出智能体需要的数据。
- 检索到的片段可能不完整。智能体必须核实它所需的事实确实存在。
- 修复和测试由智能体编写。部署之前，请审查差异并运行检查。
- Ragmir 不会通知任何人，不会在生产环境中运行命令，也不会关闭事件。

## 后续步骤

- [Claude Code 与 Ragmir](/zh/integrations/claude-code/)
- [Codex 与 Ragmir](/zh/integrations/codex/)
- [RAG 引用：行、页、幻灯片和单元格](/zh/rag-citations/)
- [本地还是云端 RAG：模型、硬件和你的数据](/zh/local-vs-cloud-rag/)
