---
title: "面向前置部署工程师的私有化 RAG：在客户服务器上建立索引 | Ragmir"
description: "在客户网络内交付基于客户文档的 RAG：在客户自己的服务器上建立索引，用 rgr evaluate 命令在上线前测量检索效果，最后交付 CLI 和 Docker 镜像。"
h1: "面向前置部署工程师：在客户网络边界之内的 RAG"
summary: "在客户自有的基础设施上为其文档建立索引，在任何人依赖答案之前，先用客户自己的问题测量检索效果，并留下固定版本的 CLI、Docker 镜像和已提交的配置。客户的应用继续负责界面、身份验证和按用户划分的访问权限。"
section: use-case
setup: agents
translationKey: "use-cases/forward-deployed-engineers"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "air-gapped-rag", "rag-citations", "local-rag"]
---

Ragmir 负责在客户网络边界之内，为客户文档交付 RAG 的检索部分。

文件解析、向量嵌入、索引和搜索都运行在客户机器上的同一个 Node.js 进程中。安全评审时无需申报任何向量嵌入 API、向量数据库、遥测或托管存储。

客户的服务或智能体继续负责模型、用户界面和访问规则。

## 从笔记本演示到客户服务器

先在笔记本上完成带引用的演示，再在客户服务器上运行同一个 `ragmir.config.json`。每次发布都会测试 Linux、macOS 和 Windows。

Debian 或 Alpine 容器以非 root 用户运行 Ragmir，根文件系统为只读，且没有网络。

- 将 `storageDir` 指向持久卷，并以只读方式挂载文档。
- `local-hash` 不需要模型，也不发起任何网络请求。如果问题或扫描件需要语义模型或 OCR 引擎，请先将其准备好（参见[离线 RAG](/zh/air-gapped-rag/)）。
- 检查配置，然后批准其中的命令和端点：

  ```bash
  rgr trust --yes
  ```

  如果使用你自己构建并审查过的镜像，请改为设置 `RAGMIR_TRUST_PROJECT_CONFIG=1`。

- 在信任文档集之前先检查覆盖范围。审计结果会列出被跳过的文件及原因：

  ```bash
  rgr audit --unsupported
  ```

[自托管 RAG 指南](/zh/self-hosted-rag/)包含容器命令和部署检查清单。

## 上线前证明检索质量

在任何人依赖答案之前，先用客户自己的问题测量检索效果。

起步时先收集 20 到 50 个真实问题。问题可以来自用户、工单或智能体会话，并按人们提问的方式书写，而不是照抄标题。

加入困难负例。它们是看似合理、但文档并未回答的问题，其中包括与文档领域相近、用词相同却缺少相关事实的问题。对于这些问题，Ragmir 必须不返回任何结果。

如果问题本身属于机密，请把黄金测试集文件保存在 `.ragmir/` 下。

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    {
      "query": "How long do we keep invoices?",
      "relevanceJudgments": [{ "kind": "path", "value": "policies/retention.pdf", "relevance": 3 }]
    },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
rgr evaluate --golden ragmir.golden.json          # exits with status 1 when a threshold fails
rgr evaluate --golden ragmir.golden.json --json   # adds gates, per-category groups, and fingerprints
rgr evaluate --golden ragmir.golden.json --baseline before.json   # signed change per metric
```

<figure>
  <img src="/guides/evaluate-offline.webp" alt="终端中运行 rgr evaluate，使用官方 6.20.0 镜像并加上 --network none，针对一个包含八个问题的黄金测试集文件。Recall@5 为 1.000，但 falsePositiveRate 为 1.000，maximumFalsePositiveRate 门槛未通过，两个困难负例列出了它们返回的文件。" width="1440" height="1523" loading="lazy" decoding="async">
  <figcaption>在一个包含十一份 Markdown 指南和一份 PDF 的演示文档集上的真实运行。每个可回答的问题都在前 5 个结果中找到了对应文件，但两个困难负例都返回了片段：误报门槛未通过，命令以状态码 1 退出。这正是上线前必须修复的情况。</figcaption>
</figure>

报告涵盖 Recall@1/3/5/10、Precision@5、MRR@10、nDCG@10、精确引用率、困难负例上的误报率，以及 p50 和 p95 延迟。它直接基于本地索引运行，因此整个测量过程都留在网络边界之内。

当某个用例未命中时，有两个命令可以帮助排查：

```bash
rgr search "<query>" --explain --top-k 10
rgr preview --path <file> --json
```

第一个命令显示每个结果的向量排名和关键词排名。第二个命令显示预期文件是如何切分成块的。

每次只改一项设置，并与基线对比。只有在报告提升且没有新增误报时才保留改动。切勿为了让改动通过而修改预期结果或降低阈值。

测试集必须同时满足以下全部条件，才算通过验证：

- 至少 100 个用例
- 分级相关性标注
- 精确引用
- 包含困难负例
- 满足所有阈值

通过的测试集会在索引中保存一个指纹。此后，只要黄金测试集、文档集、模型版本、检索配置和索引策略保持不变，`rgr doctor --deep` 就会将检索质量报告为已验证。

同一个 `rgr evaluate` 命令也可以在 `rgr ingest` 之后为 CI 设置门槛。

## 交付 CLI 和镜像

- **固定版本的发布。** 客户锁文件中的 npm 包，或精确的镜像标签，例如 `ghcr.io/jcode-works/ragmir:6.20.0`（`6.20.0-full` 额外包含语义运行时和 OCR）。
- **一份已提交的配置。** `ragmir.config.json` 随部署一起交付，因此下一个团队会继承相同的来源和设置。索引、模型和文档都不纳入 Git。
- **健康检查与诊断。** `rgr status --json` 报告 `ready` 状态、知识库名称和已索引文件数；`rgr doctor` 检查新鲜度和配置，并列出后续步骤。
- **安全升级。** 先运行升级检查。升级会保留最后一份通过验证的索引，直到替代索引通过检验，因此修复工作从不以删除 `.ragmir/storage/` 开始。

  ```bash
  rgr upgrade --check
  ```

- **智能体技能。** 为客户自己的智能体安装配置、评估等技能：

  ```bash
  npx skills add jcode-works/ragmir
  ```

## 客户应用仍需负责的内容

- **没有用户界面。** Ragmir 返回的引用可精确到行、页、幻灯片、单元格或章节。它不渲染文档，也不显示高亮预览；打开被引用的页面由客户的应用负责。
- **没有身份验证，也没有按用户的访问控制。** Ragmir 没有 HTTP 服务器，也不了解用户。 TLS、身份验证、授权和速率限制都由宿主负责。请为每类受众配置各自的知识库，并在调用 `search` 之前检查访问权限。
- **没有模型。** 生成环节交给应用所选的模型：本地模型、自托管模型，或接收所发送片段的服务商模型。
- **不作合规声明。** 精确引用、明确的来源选择和评估报告有助于追溯。它们本身并不能使系统符合 GDPR 或欧盟《人工智能法案》，以上内容也都不构成法律建议。

Ragmir 以 AGPL-3.0-only 协议开源。对于 AGPL 不适用的场景，例如将 Ragmir 集成到专有软件或托管服务中，JCode Works 还提供商业许可。

## 后续步骤

- [自托管 RAG 及其部署检查清单](/zh/self-hosted-rag/)
- [无需互联网访问的离线 RAG](/zh/air-gapped-rag/)
- [CLI 参考，包括检索质量](/docs/cli-reference/)
- [`ragmir-evaluate` 技能](https://github.com/jcode-works/ragmir/blob/main/skills/ragmir-evaluate/SKILL.md)
