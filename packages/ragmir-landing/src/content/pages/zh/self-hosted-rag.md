---
title: "VPS 或本地服务器上的自托管 RAG | Ragmir"
description: "在 VPS 或本地服务器上，使用精简版或完整版 Docker 镜像运行 Ragmir：说明索引、模型与文档分别存放在哪里，如何在多台机器和团队之间共享知识库，并附上部署检查清单。"
h1: "在你的 VPS 或本地服务器上自托管 RAG"
summary: "Ragmir 是你自行托管的检索层。它在你的服务器上解析、索引并检索文档，并将带引用的段落返回给调用它的服务或智能体。你的服务负责 TLS、身份验证、按用户的访问控制、速率限制以及模型。"
section: guide
setup: server
translationKey: "self-hosted-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["air-gapped-rag", "local-rag", "use-cases/forward-deployed-engineers", "local-vs-cloud-rag"]
---

只要能运行 Node.js 22.12，Ragmir 就能运行；在 amd64 和 arm64 上，它也能以 Docker 方式运行。这包括 VPS、本地服务器、CI 运行器或容器。

Ragmir 是一个库和一个 CLI，而不是托管服务。它不开放任何端口，也不需要账号。默认的 `local-hash` 提供方不发起任何网络请求。

它是检索层，而不是聊天平台。它不附带聊天界面、用户账号或模型。它与负责撰写答案的组件一起工作：本地 Ollama 模型、你自己的 vLLM 服务器，或接收你所发送段落的托管 API。

## 各部分运行的位置

| 组成部分 | 运行位置 |
| --- | --- |
| 解析、可选的 OCR、嵌入、索引、检索 | 服务器上的 Ragmir 进程内部 |
| 索引 | `storageDir`，例如位于 `/var/lib/ragmir` 的卷 |
| TLS、身份验证、授权、速率限制 | 你的服务或网关 |
| 生成 | 你的应用所选择的模型 |

## 使用 Docker 运行 RAG：精简版与完整版镜像

官方镜像 `ghcr.io/jcode-works/ragmir` 无需 Node.js 即可运行 CLI 与 MCP 服务器。它的 `:full` 变体额外包含语义模型运行时和本地 OCR。[Docker 指南](/docs/docker/)列出了每个镜像包含的内容、支持的平台及其标签。在生产环境中请固定精确版本，例如 `6.20.0` 或 `6.20.0-full`。

挂载项目目录，并传入你的用户 ID，使 Ragmir 写入的文件归你所有：

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir'
rgr init
rgr sources add "docs/**/*.md" "specs/**/*.pdf"
rgr ingest
rgr search "release approval" --compact
```

若要以锁定方式运行，请添加 `--read-only --tmpfs /tmp --network none`。精简版镜像拉取完成后，不再需要网络。

<figure>
  <img src="/guides/search-offline.webp" alt="在挂载的项目上运行 ghcr.io/jcode-works/ragmir:6.20.0 并带 --network none 的终端。检索返回 specs/nist-sp-800-63b-4.pdf:p25#56，段落内容是关于定期更改密码的。" width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>官方 6.20.0 镜像在使用 <code>--network none</code> 的情况下，检索挂载项目的索引。</figcaption>
</figure>

若要把配置打包进你自己的镜像，并用锁文件固定依赖，请从 [服务器指南](/docs/server-deployment/)中的 Dockerfile 开始。该 Dockerfile 已在 Debian 和 Alpine 上以非 root 用户、只读根文件系统且无网络访问的条件下检查过。

## 数据存放的位置

`ragmir.config.json` 用于命名知识库、选择数据源，并可以把索引移出项目目录：

```json
{
  "name": "handbook",
  "description": "Runbooks and architecture decisions",
  "sources": ["docs/**/*.md", "docs/**/*.pdf", "docs/**/*.docx"],
  "storageDir": "/var/lib/ragmir/storage"
}
```

- **索引：**默认位于 `.ragmir/storage/` 下，或位于持久化卷上的 `storageDir`（`RAGMIR_STORAGE_DIR`）中。
- **模型：**位于 `embeddingModelPath` 中，默认为 `.ragmir/models`，从本地快照加载。
- **OCR 缓存：**私有的 `.ragmir/ocr-cache/` 条目，以源文件校验和与页码作为键（此外还有其他字段）。
- **审批记录：**`~/.config/ragmir/trust.json`，或你通过 `RAGMIR_TRUST_DIR` 设置的文件夹。
- **文档：**打包进你的镜像，或以只读方式挂载。

将 `ragmir.config.json` 与部署一同提交，并确保索引、模型和文档不进入 Git。

## 保持索引最新

文档变更后，通过 cron、systemd 定时器或你的 CI 运行摄入：

```bash
rgr ingest
```

摄入是增量的，并且可以续传：

- 未变更的文件会被复用。
- 变更后解析失败的文件会保留其上一次有效的证据，并被报告为过期。
- 重建期间，之前的索引会一直保持活动，直到替代索引通过验证。

摄入运行期间，检索仍可继续工作。

## 在多台机器和团队之间共享知识库

- **每台机器只有一个写入者。** Ragmir 通过 `storageDir` 下的锁对写入者进行串行化，读取者仍可正常访问。该锁不协调不同机器。切勿通过 NFS 或 SMB 共享一个可写索引。请为每台主机提供各自的索引，或者让一台主机负责写入并复制结果。
- **数据源通过 Git 或文件同步流转。** 提交 `ragmir.config.json`，然后在每台工作站上运行摄入：

  ```bash
  rgr ingest
  ```

- **对智能体只读。** `"mcpIngest": false` 可让共享部署对 MCP 客户端保持只读。
- **每类受众一个知识库。** Ragmir 不会按用户过滤结果。请为每类受众分配各自的知识库，并在调用 `search` 之前检查访问权限。

## 为你的服务或智能体提供检索

同一台机器上的智能体可以通过 stdio 启动 `rgr serve-mcp`，既可以在项目文件夹中直接运行，也可以使用 `docker run -i ... serve-mcp`。

你自己的服务在长期运行的进程中，为每个项目根目录嵌入一个客户端。它在完成自身的身份验证和授权检查之后，再调用该客户端：

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"

const ragmir = await createRagmirClient({ cwd: "/srv/ragmir" })

/** Call from an authenticated route; Ragmir does not filter results per user. */
export async function retrieve(question: string) {
  const passages = await ragmir.search(question, { topK: 5, timeoutMs: 5_000 })
  return passages.map(({ citation, text, weakEvidence }) => ({ citation, text, weakEvidence }))
}

process.once("SIGTERM", () => {
  void ragmir.close().finally(() => process.exit(0))
})
```

返回的段落包含文档文本。当语料属于机密信息时，请记录引用而不是段落。

Python 服务可通过 Python 客户端获得相同的调用（[Python 指南](/docs/python/)）。安装命令如下：

```bash
pip install ragmir
```

## 本地部署检查清单

1. 固定镜像标签，或锁文件中的 npm 版本。
2. 提交 `ragmir.config.json`，其中包含 `name`、 `description`、`sources` 和 `storageDir`。
3. 将 `storageDir` 放在持久化卷上，且只有一个写入者。
4. 以非 root 用户运行，使用只读根文件系统；当服务不需要网络时，添加 `--network none`。
5. 检查配置，然后批准其中的命令和端点：

   ```bash
   rgr trust --yes
   ```

   若你自己构建并检查配置的镜像，请改为设置 `RAGMIR_TRUST_PROJECT_CONFIG=1`。

6. 在文档变更后安排摄入：

   ```bash
   rgr ingest
   ```

7. 对部署进行健康检查：

   ```bash
   rgr status --json
   ```

   它会报告 `ready`、知识库名称以及已索引的文件数。`rgr doctor` 检查新鲜度， `rgr audit --unsupported` 列出被跳过的文件。
8. 用真实问题进行评估，其中包括必须返回空结果的困难负例：

   ```bash
   rgr evaluate --golden golden.json
   ```

9. 由你的服务负责 TLS、身份验证、授权和速率限制。

## 后续步骤

- [无互联网访问的离线 RAG](/zh/air-gapped-rag/)
- [在服务器上运行 Ragmir](/docs/server-deployment/)
- [使用 Docker 运行 Ragmir](/docs/docker/)
- [在客户内网边界内部署 RAG](/zh/use-cases/forward-deployed-engineers/)
