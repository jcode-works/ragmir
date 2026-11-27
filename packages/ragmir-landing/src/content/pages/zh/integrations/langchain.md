---
title: "LangChain 本地检索器，返回带引用的结果 | Ragmir"
description: "在 JavaScript 或 Python 中把 Ragmir 用作本地 LangChain 检索器：每个文档的元数据中都带有精确引用，并为 LangGraph 智能体提供搜索与展开工具。"
h1: "LangChain 本地检索器，带引用"
summary: "RagmirRetriever 返回 LangChain 文档，其元数据中包含精确引用，在 LangChain.js 和 Python 中均可使用。它检索在你机器上建立的索引，文档中没有证据时返回空结果，并附带供 LangChain 与 LangGraph 智能体使用的搜索和展开工具。"
section: integration
setup: app
translationKey: "integrations/langchain"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/llamaindex", "docs/api-reference", "docs/python"]
logo: "langchain"
group: "frameworks"
---

Ragmir 的检索器为 LangChain 链或智能体提供元数据中带有引用的文档。

LangChain 检索器把问题转换为文档。Ragmir 的检索器则检索你选定文件的索引，该索引建立在运行 Ragmir 的机器上。

默认的 `local-hash` 检索在 CPU 上离线运行，不需要 GPU、嵌入 API 或数据库服务器。索引是位于被 Git 忽略的 `.ragmir/` 文件夹中的嵌入式 LanceDB 存储。

LangChain.js 与 Python 包读取的是与 Ragmir 的 MCP 服务器和 CLI 相同的索引，返回相同的引用。

## 为文档建立索引

请在请求路径之外建立索引：在安装、部署、CI 或定时任务中进行。检索时从不建立索引。在项目根目录下运行：

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

`sources add` 可以接受更多 glob，例如 `"contracts/**/*.pdf"`，以便把 PDF、Office 文件或代码与 Markdown 一起建立索引。

摄入是增量进行的，未变化的文件会被复用。在新索引通过校验之前，旧索引仍可检索。

## LangChain.js 检索器

请在 Ragmir 旁边安装可选的对等依赖 `@langchain/core` 1.x：

```bash
npm install @jcode.labs/ragmir@6.20.0 @langchain/core
```

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"
import { RagmirRetriever } from "@jcode.labs/ragmir/langchain"

const ragmir = await createRagmirClient({ cwd: process.cwd() })
const retriever = new RagmirRetriever({ client: ragmir, topK: 3, includePaths: ["docs"] })
try {
  const documents = await retriever.invoke("run on a server without internet access")
  for (const document of documents) {
    console.log(document.metadata.citation, document.pageContent.slice(0, 80))
  }
} finally {
  await ragmir.close()
}
```

2026 年 11 月 27 日，使用 Ragmir 6.20.0 和 `@langchain/core` 1.5.1，对 Ragmir `docs/` 文件夹中的十一份指南运行上述代码。它输出了每条引用及其段落的开头：

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access

Build the image where the npm registry is reachable,
docs/docker.md:L96-L105#5 ## Servers and CI

Run `rgr ingest` from a scheduled job after the documents cha
docs/python.md:L211-L218#12 ## Without Node.js

Without Node.js, the client runs the official image, so Dock
```

每个文档的元数据中都保存着 `source`、`citation`、行或页范围、`contextPath`、`weakEvidence` 和 `sourceStatus`。

对于来源无法回答的问题，会返回空数组。之后链可以直接说明这一点，而不是用无关文本作答。

检索器接受与客户端 `search` 相同的搜索选项，例如 `includePaths`、`scope` 或 `searches`，但 `explain` 和 `signal` 除外。

传入 `projectRoot` 而不是 `client`，可以让检索器自行打开客户端。之后请在关闭时调用 `retriever.close()`。

## Python 检索器

```bash
pip install langchain-ragmir
```

```python
from langchain_ragmir import RagmirRetriever

retriever = RagmirRetriever(project_root="/path/to/project", k=4, include_paths=["docs"])
for document in retriever.invoke("How do I run Ragmir on a server without internet access?"):
    print(document.metadata["citation"], document.page_content[:70].replace("\n", " "))
```

使用 `langchain-ragmir` 6.20.0 和 Python 3.12 时，同一索引返回了以下结果：

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access  Build the image where the npm registry is
docs/docker.md:L96-L105#5 ## Servers and CI  Run `rgr ingest` from a scheduled job after the doc
docs/python.md:L211-L218#12 ## Without Node.js  Without Node.js, the client runs the official imag
docs/agent-integration.md:L43-L54#6 ## Choose where inference runs  | Setup | Where evidence goes | What y
```

该包需要 Python 3.11 或更高版本。它驱动 Ragmir 自身的引擎，因此还需要 Node.js 22.12 或更高版本，或 Docker。与 `langchain-mcp-adapters` 相比，更推荐使用本包，因为后者已不再维护。

## LangChain 与 LangGraph 智能体中带引用的 RAG

对于智能体式 RAG，请为智能体提供工具，而不是固定的检索步骤：

```python
from langchain.agents import create_agent
from langchain_ragmir import RagmirToolkit

agent = create_agent(
    "anthropic:claude-sonnet-5-5",
    tools=RagmirToolkit(project_root="/path/to/project").get_tools(),
    system_prompt="Answer from the project documents and cite every claim with its citation.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "What is the refund policy?"}]})
```

该智能体会调用 Anthropic 的 API，因此需要你的密钥。本页面未运行此示例。

该工具包提供两个工具：

- `ragmir_search` 以编号引用和段落文本回应模型。它会标记弱匹配和已变化的文件，并将文档保留在工具消息的 artifact 中。
- `ragmir_expand` 读取一条引用，并附上其相邻段落，以及接下来要读取的引用。

在 LangChain.js 中，`createRagmirTools({ client })` 会为 `createAgent` 和 LangGraph 智能体提供相同的两个工具。Python 检索器和工具通过了 LangChain 标准测试套件。

## 日常用法示例

这些示例使用 Python 包。检索器调用于 2026 年 11 月 27 日，针对 Ragmir 自身仓库的索引进行了检查。

### 缩小单次搜索范围

检索器的选项也可以按次调用生效，因此同一个检索器可以服务所有问题：

```python
retriever = RagmirRetriever(project_root="/path/to/project", k=3)
documents = retriever.invoke("run on a server without internet access", include_paths=["docs"])
```

`scope` 的用法相同，只需传入 `ragmir.config.json` 中定义的命名范围。

### 附带引用作答，或说明没有相关内容

文档未涵盖的问题会返回空列表。请告诉模型这一点，并把每条引用与其段落放在一起：

```python
from langchain.chat_models import init_chat_model
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

def with_citations(documents):
    if not documents:
        return "NO EVIDENCE"
    return "\n\n".join(f"[{d.metadata['citation']}]\n{d.page_content}" for d in documents)

prompt = ChatPromptTemplate.from_template(
    "Answer from the context only and cite each claim with its [citation]. If the context is "
    "NO EVIDENCE, say the documents do not cover the question.\n\n"
    "Context:\n{context}\n\nQuestion: {question}"
)
chain = (
    {"context": retriever | with_citations, "question": RunnablePassthrough()}
    | prompt
    | init_chat_model("anthropic:claude-sonnet-5-5")
    | StrOutputParser()
)
print(chain.invoke("How do I run Ragmir on a server without internet access?"))
```

这条链会调用 Anthropic 的 API，本页面未运行。可以用任何聊天模型替代。

### 文档变化时刷新索引

请在部署步骤或定时任务中运行刷新，不要放在请求路径里：

```python
from ragmir import Ragmir

with Ragmir("/path/to/project") as rag:
    rag.ingest()
```

它只读取新增和变化的文件，在新索引通过校验之前，旧索引仍可用于回答。

## 限制

- Ragmir 不调用模型，也不开放端口。你的应用选择模型、编写提示词，并决定段落发送到哪里。托管模型会接收你发送给它的段落。
- Ragmir 不按用户过滤结果。请在检索前对调用方进行身份验证和授权，并为每类受众提供各自的基础。
- 在长期运行的进程中，为每个项目根目录打开一个客户端，并在关闭时释放它。检索器从不关闭你传入的客户端。
- 在依赖被标记为 `weakEvidence`（Python 中为 `weak_evidence`）的段落之前，请先检查它们。

## 后续步骤

- [LlamaIndex 本地文件检索器](/zh/integrations/llamaindex/)
- [TypeScript API 参考](/docs/api-reference/)
- [在 Python 中使用 Ragmir](/docs/python/)
