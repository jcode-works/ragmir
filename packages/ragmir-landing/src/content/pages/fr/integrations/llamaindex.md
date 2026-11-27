---
title: "Retriever LlamaIndex pour fichiers locaux avec citations | Ragmir"
description: "Installez llama-index-retrievers-ragmir pour doter un moteur LlamaIndex d’un retriever sur le code, les PDF et les fichiers Office, avec la citation dans chaque nœud."
h1: "Retriever LlamaIndex pour les fichiers locaux"
summary: "Le paquet llama-index-retrievers-ragmir ajoute un RagmirRetriever, accepté par les moteurs de requête LlamaIndex. Il cherche dans un index Ragmir de vos fichiers locaux, construit et interrogé sur votre machine, et chaque nœud porte la citation du passage."
section: integration
setup: app
translationKey: "integrations/llamaindex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/langchain", "docs/python", "docs/supported-formats"]
logo: "library"
group: "frameworks"
---

Le retriever de Ragmir renvoie des nœuds LlamaIndex issus de fichiers locaux, et chaque nœud porte
une citation.

Un moteur de requête LlamaIndex a besoin d’un retriever qui renvoie des nœuds pour une question. Le
retriever de Ragmir les tire d’un index des fichiers que vous choisissez. Il peut s’agir de code, de
Markdown, de PDF, de fichiers Word, PowerPoint et Excel, de courriels, ou d’exports de maquettes et
d’API. Ragmir les analyse et les indexe sur la machine qui l’exécute.

Chaque nœud porte la citation du passage. Une réponse peut pointer vers la ligne, la page PDF, la
diapositive ou la cellule d’origine. Ragmir recherche. LlamaIndex et le modèle que vous configurez
rédigent la réponse.

## Installation

```bash
pip install llama-index-retrievers-ragmir
```

Le paquet exige Python 3.11 ou une version plus récente. Il pilote le moteur propre à Ragmir : il a
donc aussi besoin de Node.js 22.12 ou d’une version plus récente, ou de Docker. Il utilise la
première de ces options disponible, dans cet ordre :

- l’installation npm de `@jcode.labs/ragmir` du projet
- un `rgr` global
- la version npm correspondante, via `npx`
- l’image `ghcr.io/jcode-works/ragmir`

Définissez `RAGMIR_COMMAND` pour choisir une autre commande.

## Indexer les fichiers locaux

Sélectionnez les sources et construisez l’index une seule fois, depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Désignez le paquet comme ci-dessus. `npx rgr` ne fonctionne qu’une fois que le projet installe
`@jcode.labs/ragmir` avec npm.

`sources add` accepte d’autres globs, comme `"specs/**/*.pdf"`, ainsi que des exclusions avec `!`.
L’ingestion est incrémentale : les exécutions suivantes ne lisent que les fichiers nouveaux ou
modifiés.

Le client Python `ragmir` propose les mêmes étapes, sous les noms `init_project`, `add_sources` et
`ingest()`. Installez-le avec :

```bash
pip install ragmir
```

## Interroger avec le retriever

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

Le moteur de requête utilise le LLM défini dans `Settings`. Ici, il s’agit d’un modèle local servi
par Ollama : toute la requête reste donc sur la machine. Installez l’intégration Ollama avec :

```bash
pip install llama-index-llms-ollama
```

Exécuté le 27 novembre 2026 avec `llama-index-retrievers-ragmir` 6.20.0, sur les onze guides du
dossier `docs/` de Ragmir, il a duré 53 secondes sur un Apple M3 Max, dont l’essentiel pour la
génération. Il s’est terminé avec les quatre sources citées :

```text
[...]
*   **Runtime:** The container can ingest and search with `--network none` because `local-hash` does not make any network calls.
[...]
docs/server-deployment.md:L123-L138#8
docs/docker.md:L96-L105#5
docs/python.md:L211-L218#12
docs/agent-integration.md:L43-L54#6
```

Depuis les métadonnées du nœud, seuls la citation et son chemin de contexte atteignent le prompt du
LLM.

Les nœuds conservent l’ordre de classement de Ragmir et n’ont pas de score de similarité. Lisez leur
ordre, pas un score.

## Ce que le retriever apporte aux fichiers locaux

- Plus de 900 extensions et noms de fichiers s’indexent sans installation supplémentaire. Les PDF
  scannés, les photos et les anciens fichiers `.doc` passent par des extracteurs locaux que vous
  activez.
- Les citations suivent chaque format. `docs/runbook.md:L12-L18#3` cite des lignes, et
  `contracts/msa-acme-2026.pdf:p7#3` cite une page PDF. Les autres formats utilisent des coordonnées
  de diapositive, de feuille et de cellule, ou de section nommée.
- La recherche ne renvoie rien lorsque les preuves sont faibles. Une question que les documents ne
  couvrent pas peut alors être traitée comme telle, au lieu de répondre à partir du passage le plus
  proche.
- La recherche par défaut `local-hash` n’exige ni API d’embeddings ni GPU. Un modèle sémantique
  local est facultatif.

## Limites

- Ragmir n’appelle aucun modèle et n’ouvre aucun port. Le LLM appelé par votre moteur de requête
  reçoit les passages dans son prompt : un modèle hébergé les voit donc.
- Ragmir ne filtre pas les résultats par utilisateur. Authentifiez les appelants dans votre
  application. Donnez à chaque public sa propre base.
- Une ingestion lancée par le client Python est refusée tant que `rgr security-audit` émet un
  avertissement, par exemple lorsque des commandes OCR locales sont configurées. Lancez plutôt
  `run_cli("/path/to/project", "ingest")` depuis un script d’exploitation.
- Dans un service de longue durée, utilisez un client Ragmir par projet et fermez-le à l’arrêt.

## Étapes suivantes

- [Utiliser Ragmir depuis Python](/docs/python/)
- [Formats pris en charge](/docs/supported-formats/)
- [Retriever LangChain local avec citations](/fr/integrations/langchain/)
