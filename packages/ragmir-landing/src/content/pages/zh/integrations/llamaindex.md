---
title: "LlamaIndex 本地文件检索器，带引用 | Ragmir"
description: "安装 llama-index-retrievers-ragmir，为 LlamaIndex 查询引擎提供一个覆盖本地代码、Markdown、PDF 和 Office 文件的检索器，且每个节点都带有引用。"
h1: "适用于本地文件的 LlamaIndex 检索器"
summary: "llama-index-retrievers-ragmir 包提供 RagmirRetriever，可被 LlamaIndex 查询引擎直接使用。它检索你本地文件的 Ragmir 索引，索引的建立和查询都在你的机器上完成，每个节点都带有该段落的引用。"
section: integration
setup: app
translationKey: "integrations/llamaindex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/langchain", "docs/python", "docs/supported-formats"]
logo: "library"
group: "frameworks"
---

Ragmir 的检索器从本地文件返回 LlamaIndex 节点，每个节点都带有引用。

LlamaIndex 查询引擎需要一个检索器，为问题返回节点。Ragmir 的检索器从你选定文件的索引中获取这些节点。这些文件可以是代码、Markdown、PDF、Word、PowerPoint 和 Excel 文件、邮件，以及设计或 API 导出文件。 Ragmir 在运行它的机器上解析并建立索引。

每个节点都带有该段落的引用，因此回答可以指向其来源的具体行、PDF 页、幻灯片或单元格。 Ragmir 负责检索，LlamaIndex 以及你配置的模型负责撰写回答。

## 安装

```bash
pip install llama-index-retrievers-ragmir
```

该包需要 Python 3.11 或更高版本。它驱动 Ragmir 自身的引擎，因此还需要 Node.js 22.12 或更高版本，或 Docker。它按以下顺序使用第一个可用的方式：

- 项目中通过 npm 安装的 `@jcode.labs/ragmir`
- 全局的 `rgr`
- 通过 `npx` 调用的匹配 npm 版本
- `ghcr.io/jcode-works/ragmir` 镜像

设置 `RAGMIR_COMMAND` 可以选择其他命令。

## 为本地文件建立索引

在项目根目录下选择来源并建立一次索引：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

请如上所示使用包名。只有在项目通过 npm 安装了 `@jcode.labs/ragmir` 之后，`npx rgr` 才能使用。

`sources add` 可以接受更多 glob，例如 `"specs/**/*.pdf"`，以及 `!` 排除规则。摄入是增量的，因此之后的运行只读取新增和已变化的文件。

`ragmir` Python 客户端提供与 `init_project`、`add_sources` 和 `ingest()` 相同的步骤。安装方式如下：

```bash
pip install ragmir
```

## 使用检索器查询

```python
from llama_index.core import Settings
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.ollama import Ollama
from llama_index.retrievers.ragmir import RagmirRetriever

Settings.llm = Ollama(model="gemma4:12b-it-qat", request_timeout=180.0)
retriever = RagmirRetriever("/path/to/project", similarity_top_k=4)
engine = RetrieverQueryEngine.from_args(retriever)
response = engine.query("How do I run Ragmir on a server without internet access?")
print(response)
for node in response.source_nodes:
    print(node.node.metadata["citation"])
```

查询引擎使用 `Settings` 中设置的 LLM。这里使用的是由 Ollama 提供服务的本地模型，因此整个查询都在本机上完成。安装 Ollama 集成的方式如下：

```bash
pip install llama-index-llms-ollama
```

2026 年 11 月 27 日，使用 `llama-index-retrievers-ragmir` 6.20.0，对 Ragmir `docs/` 文件夹中的十一份指南运行上述查询。在 Apple M3 Max 上耗时 53 秒，其中大部分用于生成。最终给出了四条带引用的来源：

```text
[...]
*   **Runtime:** The container can ingest and search with `--network none` because `local-hash` does not make any network calls.
[...]
docs/server-deployment.md:L123-L138#8
docs/docker.md:L96-L105#5
docs/python.md:L211-L218#12
docs/agent-integration.md:L43-L54#6
```

从节点元数据来看，进入 LLM 提示词的有来源路径、引用及其上下文路径，文件在建立索引后发生变化时还会包含 `source_status`。行范围、页码范围以及弱证据标记不会进入提示词。

节点保持 Ragmir 的排序顺序，且没有相似度分数。请看它们的顺序，而不是分数。

## 日常用法

以下检索器调用已于 2026 年 11 月 27 日，在 Ragmir 自身仓库的索引上检验过。

### 不借助 LLM 查看证据

`retrieve` 只返回带引用的节点。这是检查某个问题能找到什么内容最快的方式：

```python
from llama_index.retrievers.ragmir import RagmirRetriever

retriever = RagmirRetriever("/path/to/project", similarity_top_k=4)
for node in retriever.retrieve("How do I run Ragmir on a server without internet access?"):
    print(node.node.metadata["citation"], node.node.get_content()[:60])
```

### 只搜索部分文件

`include_paths` 和 `exclude_paths` 接受文件夹、文件或 glob。`scope` 接受 `ragmir.config.json` 中定义的命名范围：

```python
contracts = RagmirRetriever("/path/to/project", include_paths=["contracts/**/*.pdf"])
```

### 文档无内容时给出说明

文档未涵盖的问题不会返回任何节点。在信任回答之前先检查一下：

```python
response = engine.query("What is the refund policy for enterprise plans?")
if not response.source_nodes:
    print("The documents do not cover this question.")
```

### 文档变化时刷新索引

在部署步骤或定时任务中，使用 `ragmir` 客户端运行刷新：

```python
from ragmir import Ragmir

with Ragmir("/path/to/project") as rag:
    rag.ingest()
```

只读取新增和已变化的文件，在新索引通过校验之前，由旧索引继续应答。

## 检索器为本地文件带来的能力

- 无需额外安装，即可索引超过 900 种扩展名和文件名。扫描的 PDF、照片和旧版 `.doc` 文件则使用你启用的本地提取器。
- 引用遵循各格式的规则。`docs/runbook.md:L12-L18#3` 引用行，`contracts/msa-acme-2026.pdf:p7#3` 引用 PDF 页。其他格式使用幻灯片、表格与单元格，或命名章节的坐标。
- 当没有段落包含真正的证据时，检索返回空结果；证据薄弱的段落会带有 `weak_evidence`。文档未涵盖的问题因此可以据实回答，而不是用最接近的段落作答。
- 默认的 `local-hash` 检索不需要嵌入 API 或 GPU。本地语义模型是可选的。

## 限制

- Ragmir 不调用模型，也不开放端口。你的查询引擎所调用的 LLM 会在其提示词中接收段落，因此托管模型会看到这些段落。
- Ragmir 不按用户过滤结果。请在应用中对调用方进行身份验证，并为每类受众提供各自的基础。
- 当 `rgr security-audit` 发出警告时（例如配置了本地 OCR 命令），通过 Python 客户端启动的摄入会被拒绝。请改为从运维脚本中运行 `run_cli("/path/to/project", "ingest")`。
- 在长期运行的服务中，每个项目使用一个 Ragmir 客户端，并在关闭时释放它。

## 后续步骤

- [在 Python 中使用 Ragmir](/docs/python/)
- [支持的格式](/docs/supported-formats/)
- [LangChain 本地检索器，带引用](/zh/integrations/langchain/)
