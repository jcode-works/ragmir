---
title: "物理隔离网络中的 RAG：无出站流量的离线检索 | Ragmir"
description: "在无法访问互联网的环境中运行 RAG：一次性预先准备 Ragmir 的 Docker 镜像或 npm 包、可选的语义模型和 OCR 引擎，默认保持零出站流量，并在离线状态下逐项验证安装结果。"
h1: "物理隔离 RAG：无需互联网访问即可运行检索"
summary: "Ragmir 的默认检索不发起任何网络调用。在物理隔离网络中进行检索，只需事先准备好所需内容：Docker 镜像或 npm 包，以及可选的语义模型和 OCR 引擎。之后，索引、搜索和评估都可在断网状态下运行。"
section: guide
setup: offline
translationKey: "air-gapped-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

离线 RAG 由两部分组成，两者都必须位于网络之内。

Ragmir 负责检索部分。解析、索引和搜索都在它自己的进程中运行。它没有遥测、账户或托管存储，正常检索也会禁止远程加载模型。

生成部分由你自行部署，例如本地的 Ollama 模型，或同一网络内的推理服务器。本地索引不会让远程对话变成本地对话。只有模型以及调用它的客户端也留在该隔离环境中，物理隔离才成立。

## 哪些内容只需下载一次

| 组件 | 用途 | 如何预先准备 |
| --- | --- | --- |
| `ghcr.io/jcode-works/ragmir` 镜像 | 无需 Node.js 即可运行 CLI 和 MCP 服务器 | 在可访问镜像仓库的地方拉取，然后用 `docker save` 和 `docker load` 迁移 |
| `@jcode.labs/ragmir` npm 包 | 在 Node.js 22.12 或更高版本上运行 | 在可访问 npm 注册表的地方安装，或从内部 npm 镜像安装 |
| `@huggingface/transformers` 与模型快照 | 可选的语义检索 | 在网络可用时下载一次模型，然后随配置一起交付 `.ragmir/models` |
| Tesseract 或 OCRmyPDF | 可选，用于扫描件和照片的 OCR | 将它们安装到你的镜像中，或使用内含 Tesseract、Poppler 和 antiword 的 `:full` 镜像 |
| 负责撰写答案的模型 | 生成 | 不属于 Ragmir：使用网络内的本地或自托管模型 |

请固定你预先准备的内容，使每台机器都运行你测试过的版本。使用精确的镜像标签，例如 `6.20.0`（或 `6.20.0-full`），或使用锁文件中的版本。

## 预先准备镜像或包

在可访问镜像仓库的地方拉取镜像，然后用 `docker save` 和 `docker load` 迁移。标准镜像拉取完成后不再需要网络。

若要把配置打包进你自己的镜像，请在可访问 npm 注册表的地方，根据[服务器指南](/docs/server-deployment/)中的 Dockerfile 构建。迁移方式相同。

不使用容器时，请从内部 npm 镜像安装 Node.js 22.12 或更高版本，以及 `@jcode.labs/ragmir`。

请在智能体所用的每个项目中保留该包的安装。生成的 MCP 运行器会从项目文件夹中解析它。只有在本地不存在该包时，才会退回到 `npx --prefer-offline`，`rgr doctor` 会报告这种情况。

## 预先准备语义模型和 OCR

`local-hash` 不需要模型。若要进行语义检索，请先在联网的机器上下载一次模型，然后将项目文件夹带入隔离网络。

不使用 Docker 时，请添加 `@huggingface/transformers` 并运行语义安装：

```bash
rgr setup --semantic
```

使用完整镜像时，请执行：

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir:full'
rgr models list                      # the recommended model, download size, and memory
rgr models pull --enable --model onnx-community/granite-embedding-97m-multilingual-r2-ONNX
```

模型会保存到项目的 `.ragmir/models`（`embeddingModelPath`）中。配置会记录其固定的 40 位修订版本和制品摘要。

Ragmir 仅通过 Transformers.js 加载 ONNX 权重，不加载 pickle 对象，也不运行远程代码。安装完成后，它会保持禁用下载，因此服务器永远不会再次获取模型。下一次 `rgr ingest` 会用语义向量重建索引。

对于扫描文档，请在网络内检查并设置 OCR：

```bash
rgr ocr doctor
rgr ocr setup
```

然后从终端执行索引，因为配置了外部提取器时，MCP 客户端无法启动索引：

```bash
rgr ingest
```

容器在两次运行之间不会保留批准记录。检查配置后，请传入 `-e RAGMIR_TRUST_PROJECT_CONFIG=1`，或将一个文件夹挂载为 `RAGMIR_TRUST_DIR`。

## 默认无出站流量

- `local-hash` 不发起任何网络调用。服务器指南中的容器以 `--network none` 进行索引和搜索。
- 有些设置会把数据发送到机器之外。在有人通过 `rgr trust` 在该机器上批准之前，它们保持未激活状态。这些设置包括机器外部的 `embeddingEndpoint`、`embeddingApiKeyEnv`，以及 `transformersAllowRemoteModels: true`。在此之前，模型下载保持关闭，嵌入调用会在任何请求离开进程之前以 `UNTRUSTED_CONFIG` 失败。
- OCR 通过已配置的本地命令运行，从不经过 shell 或云服务。
- 使用 Ollama 时，请在 `~/.ollama/server.json` 中设置 `"disable_ollama_cloud": true`。仅有 localhost 端点并不能证明推理是本地完成的，因为 Ollama 同样支持云端模型。

## 验证离线安装

1. 在无网络访问的容器中进行索引和搜索。使用根据服务器指南中的 Dockerfile 构建的镜像：

   ```bash
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook ingest
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook search "checkout retry policy" --compact
   ```

2. 运行安全审计。它会对非本地的嵌入端点和已配置的外部提取器发出警告。开启 OCR 时，该提示属于预期情况，报告提示期间 OCR 仍可正常使用。

   ```bash
   rgr security-audit
   ```

3. 检查状态和 `ready`。`rgr doctor` 会列出待批准事项和后续步骤。

   ```bash
   rgr status --json
   ```

4. 用真实问题进行评估，其中包括必须返回空结果的困难负例。

   ```bash
   rgr evaluate --golden golden.json
   ```

5. 如果语义索引报告 Transformers.js 加载模型时缺少其分词器，说明该模型文件夹不是离线快照。请在联网机器上重新拉取模型：

   ```bash
   rgr models pull --enable
   ```

   然后交付该文件夹并重建索引：

   ```bash
   rgr ingest --rebuild
   ```

<figure>
  <img src="/guides/search-offline.webp" alt="在挂载了项目并使用 --network none 运行 ghcr.io/jcode-works/ragmir:6.20.0 的终端。搜索返回 specs/nist-sp-800-63b-4.pdf:p25#56，该段落讲的是定期更换密码。" width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>使用官方 6.20.0 镜像进行的同一检查：在 <code>--network none</code> 下，搜索仍能返回项目索引中被引用的 PDF 页。</figcaption>
</figure>

## 后续步骤

- [在 VPS 或本地服务器上自托管 RAG](/zh/self-hosted-rag/)
- [使用 Docker 运行 Ragmir](/docs/docker/)
- [配置以及需要批准的设置](/docs/configuration/)
- [在客户内网边界内部署 RAG](/zh/use-cases/forward-deployed-engineers/)
