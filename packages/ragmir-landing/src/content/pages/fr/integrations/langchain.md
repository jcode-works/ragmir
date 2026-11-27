---
title: "Retriever LangChain local avec citations | Ragmir"
description: "Utilisez Ragmir comme retriever LangChain local, en JavaScript ou en Python : une citation exacte dans les métadonnées, et des outils pour LangGraph."
h1: "Retriever LangChain local avec citations"
summary: "RagmirRetriever renvoie des documents LangChain dont les métadonnées contiennent une citation exacte, en LangChain.js comme en Python. Il cherche dans un index construit sur votre machine, ne renvoie rien lorsque les documents ne contiennent aucune preuve, et fournit des outils de recherche et de développement pour les agents LangChain et LangGraph."
section: integration
setup: app
translationKey: "integrations/langchain"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/llamaindex", "docs/api-reference", "docs/python"]
logo: "langchain"
group: "frameworks"
---

Le retriever de Ragmir fournit à une chaîne ou à un agent LangChain des documents dont les
métadonnées portent une citation.

Un retriever LangChain transforme une question en documents. Le retriever de Ragmir cherche dans un
index des fichiers que vous choisissez, construit sur la machine qui exécute Ragmir.

La recherche par défaut `local-hash` fonctionne hors ligne sur le CPU. Elle n’exige ni GPU, ni API
d’embeddings, ni serveur de base de données. L’index est un stockage LanceDB embarqué, dans le
dossier `.ragmir/` ignoré par Git.

LangChain.js et le paquet Python lisent le même index que le serveur MCP et la CLI de Ragmir. Ils
renvoient les mêmes citations.

## Indexer les documents

Indexez en dehors du chemin de requête : pendant la configuration, le déploiement, l’intégration
continue ou une tâche planifiée. La recherche n’indexe jamais. Depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

`sources add` accepte d’autres globs, comme `"contracts/**/*.pdf"`, pour indexer des PDF, des
fichiers Office ou du code à côté du Markdown.

L’ingestion est incrémentale : les fichiers inchangés sont réutilisés. L’index précédent reste
consultable tant que le nouveau n’a pas passé la validation.

## Retriever LangChain.js

Installez à côté de Ragmir la dépendance pair facultative `@langchain/core` 1.x :

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

Exécuté le 27 novembre 2026 avec Ragmir 6.20.0 et `@langchain/core` 1.5.1, sur les onze guides du
dossier `docs/` de Ragmir, il a affiché chaque citation et le début de son passage :

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access

Build the image where the npm registry is reachable,
docs/docker.md:L96-L105#5 ## Servers and CI

Run `rgr ingest` from a scheduled job after the documents cha
docs/python.md:L211-L218#12 ## Without Node.js

Without Node.js, the client runs the official image, so Dock
```

Chaque document conserve dans ses métadonnées `source`, `citation`, les plages de lignes ou de
pages, `contextPath`, `weakEvidence` et `sourceStatus`.

Une question à laquelle les sources ne peuvent pas répondre renvoie un tableau vide. La chaîne peut
alors le signaler, au lieu de répondre à partir d’un texte sans rapport.

Le retriever accepte les mêmes options de recherche que `search` du client, comme `includePaths`,
`scope` ou `searches`. `explain` et `signal` font exception.

Passez `projectRoot` à la place de `client` pour que le retriever ouvre son propre client. Appelez
ensuite `retriever.close()` à l’arrêt.

## Retriever Python

```bash
pip install langchain-ragmir
```

```python
from langchain_ragmir import RagmirRetriever

retriever = RagmirRetriever(project_root="/path/to/project", k=4, include_paths=["docs"])
for document in retriever.invoke("How do I run Ragmir on a server without internet access?"):
    print(document.metadata["citation"], document.page_content[:70].replace("\n", " "))
```

Avec `langchain-ragmir` 6.20.0 sur Python 3.12, le même index a répondu :

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access  Build the image where the npm registry is
docs/docker.md:L96-L105#5 ## Servers and CI  Run `rgr ingest` from a scheduled job after the doc
docs/python.md:L211-L218#12 ## Without Node.js  Without Node.js, the client runs the official imag
docs/agent-integration.md:L43-L54#6 ## Choose where inference runs  | Setup | Where evidence goes | What y
```

Le paquet exige Python 3.11 ou une version plus récente. Il pilote le moteur propre à Ragmir : il a
donc aussi besoin de Node.js 22.12 ou d’une version plus récente, ou de Docker. Préférez-le à
`langchain-mcp-adapters`, qui n’est plus maintenu.

## RAG avec citations dans les agents LangChain et LangGraph

Pour un RAG agentique, donnez à l’agent des outils au lieu d’une étape de recherche fixe :

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

Cet agent appelle l’API d’Anthropic : il lui faut donc votre clé. Il n’a pas été exécuté pour cette
page.

La boîte à outils compte deux outils :

- `ragmir_search` répond au modèle avec des citations numérotées et le texte des passages. Il
  signale les correspondances faibles et les fichiers modifiés, et conserve les documents comme
  artefact du message d’outil.
- `ragmir_expand` lit une citation avec ses voisins, ainsi que la citation suivante à lire.

Dans LangChain.js, `createRagmirTools({ client })` donne aux agents `createAgent` et LangGraph les
deux mêmes outils. Le retriever Python et les outils passent les suites de tests standard de
LangChain.

## Recettes au quotidien

Ces recettes utilisent le paquet Python. Les appels du retriever ont été vérifiés le 27 novembre
2026 sur l’index du dépôt de Ragmir lui-même.

### Restreindre une recherche

Les options du retriever s’appliquent aussi à chaque appel, si bien qu’un seul retriever peut servir
toutes les questions :

```python
retriever = RagmirRetriever(project_root="/path/to/project", k=3)
documents = retriever.invoke("run on a server without internet access", include_paths=["docs"])
```

`scope` fonctionne de la même façon avec un scope nommé défini dans `ragmir.config.json`.

### Répondre avec des citations, ou signaler l’absence de preuve

Une question que les documents ne couvrent pas renvoie une liste vide. Indiquez-le au modèle et
donnez-lui chaque citation à côté de son passage :

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

Cette chaîne appelle l’API d’Anthropic et n’a pas été exécutée pour cette page. Tout modèle de chat
peut la remplacer.

### Actualiser l’index quand les documents changent

Lancez l’actualisation depuis une étape de déploiement ou une tâche planifiée, et non dans le chemin
de requête :

```python
from ragmir import Ragmir

with Ragmir("/path/to/project") as rag:
    rag.ingest()
```

Elle ne lit que les fichiers nouveaux ou modifiés, et l’ancien index répond jusqu’à ce que le
nouveau passe la validation.

## Limites

- Ragmir n’appelle aucun modèle et n’ouvre aucun port. Votre application choisit le modèle, rédige
  le prompt et décide où vont les passages. Un modèle hébergé reçoit les passages que vous lui
  envoyez.
- Ragmir ne filtre pas les résultats par utilisateur. Authentifiez et autorisez l’appelant avant
  toute recherche. Donnez à chaque public sa propre base.
- Dans un processus de longue durée, ouvrez un seul client par racine de projet et fermez-le à
  l’arrêt. Un retriever ne ferme jamais un client que vous lui avez transmis.
- Vérifiez les passages signalés `weakEvidence` (`weak_evidence` en Python) avant de vous y fier.

## Étapes suivantes

- [Retriever LlamaIndex pour les fichiers locaux](/fr/integrations/llamaindex/)
- [Référence de l’API TypeScript](/docs/api-reference/)
- [Utiliser Ragmir depuis Python](/docs/python/)
