---
title: "RAG et MCP : différences, jetons et usage combiné | Ragmir"
description: "RAG et MCP ne sont pas la même chose : MCP relie un agent à des outils, et la recherche décide du texte renvoyé. Comment les combiner et ce qui pilote les jetons."
h1: "RAG et MCP : sont-ce la même chose, et peut-on utiliser les deux ?"
summary: "Non. MCP est le protocole qu’un agent utilise pour appeler des outils. Le RAG récupère des passages de vos sources pour qu’un modèle puisse répondre à partir d’eux. Ils travaillent ensemble lorsqu’un serveur MCP expose la recherche : c’est alors la recherche, et non le protocole, qui décide de la quantité de texte qui atteint le modèle."
section: guide
setup: agents
translationKey: "rag-vs-mcp"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "rag-citations", "local-rag", "integrations/claude-code"]
---

RAG et MCP sont deux choses différentes. MCP est un protocole, et RAG est un schéma qu’un serveur MCP
peut servir.

MCP, le Model Context Protocol, définit la manière dont un client tel que Claude Code, Codex ou Cursor
découvre les outils exposés par un serveur, les appelle et reçoit leurs résultats. Il ne décide ni du
texte renvoyé par un outil, ni de sa longueur.

RAG, retrieval-augmented generation (génération augmentée par récupération), trouve les passages qui
répondent à une question. Un modèle rédige ensuite à partir d’eux.

Ragmir est une couche de recherche accessible avec ou sans MCP. Son serveur MCP, la CLI `rgr`,
TypeScript, Python, LangChain et LlamaIndex lisent tous le même index et renvoient les mêmes citations.

## RAG et MCP sont-ils la même chose ?

Non. Ils opèrent à des niveaux différents :

| | MCP | Recherche (RAG) |
| --- | --- | --- |
| Nature | Un protocole entre un client et des serveurs d’outils | Un index et une étape de recherche sur vos sources |
| Ce qu’il décide | Comment les outils sont listés, appelés et répondus | Quels passages reviennent, combien, et sur quelle longueur |
| Sans l’autre | Les outils MCP n’ont pas besoin de rechercher dans des documents | Ragmir fonctionne aussi depuis la CLI, TypeScript et Python |

## RAG et MCP peuvent-ils être utilisés ensemble ?

Oui. Un serveur MCP peut exposer la recherche sous forme d’outils, et l’agent décide quand les appeler.

Le serveur de Ragmir fonctionne via stdio. Il figure dans le registre MCP sous le nom
`io.github.jcode-works/ragmir` et expose six outils :

- `ragmir_search`, `ragmir_expand`, `ragmir_sources`, `ragmir_status` et `ragmir_audit` sont en
  lecture seule.
- `ragmir_ingest` actualise l’index et n’écrit que dans l’index privé de Ragmir.

L’agent recherche, développe le seul passage dont il a besoin, et recherche à nouveau lorsque c’est
nécessaire. La session mesurée plus bas suit ce schéma : une recherche, puis un développement. Le
modèle de l’agent lit les preuves et rédige la réponse. Ragmir ne fait que renvoyer des preuves.

Installez le plugin pour Claude Code, Codex ou Cursor, ou configurez un serveur MCP de projet :

```bash
rgr setup --agents claude,codex
```

Enregistrez Ragmir par projet, jamais pour tous les projets.

## Consommation de jetons avec RAG et MCP

Le protocole ne décide pas de la quantité renvoyée par un outil. C’est le serveur qui se trouve
derrière. Un outil qui renvoie des fichiers entiers remplit le contexte de fichiers entiers. Ragmir
borne ce que chaque appel renvoie :

- `ragmir_search` commence par au plus trois citations compactes par question, chacune étant un
  extrait qui débute aux lignes contenant les mots de la question.
- Chaque réponse reste dans `mcpMaxOutputBytes`, soit 32 768 octets par défaut, sous un plafond
  absolu de 1 MiB côté serveur. Un appel peut demander moins avec `maxBytes`, et
  `_meta["ragmir/output"]` signale toute troncature.
- Jusqu’à cinq questions liées partagent un même budget dans `queries`, et un passage trouvé par
  plusieurs d’entre elles n’apparaît qu’une fois.
- Les passages déjà renvoyés dans la session reviennent sous forme de courtes entrées `seen`
  (citation, chemin, identifiant de preuve), et ne comptent pas dans `topK`.
- L’agent ne développe que ce sur quoi il s’appuiera : `ragmir_expand` renvoie le texte intégral
  d’une citation et de ses voisins bornés, ou jusqu’à cinq citations dans un même budget.
- Lorsqu’aucun passage ne contient de preuve réelle, la recherche ne renvoie rien : une question hors
  sujet ne coûte donc qu’un résultat vide. Un passage maigre qui revient malgré tout porte `weakEvidence`.

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

| | Agent qui lit des fichiers | Agent qui appelle Ragmir |
| --- | --- | --- |
| Fenêtre de contexte | Fichiers entiers, relus à chaque nouvelle session | Trois citations compactes par défaut, dans un budget de 32 KB par appel ; les passages déjà vus reviennent sous forme d’entrées d’une ligne |
| Envoyé au modèle | Tout ce que l’agent ouvre | Seulement des extraits compacts et les passages que l’agent développe |

### Une question, mesurée

Le 27 novembre 2026, une session d’agent sur Ragmir 6.20.0, avec les onze guides du dossier `docs/`
de Ragmir indexés, a posé une question et développé la première citation :

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` [...]
```

| Ce que lit l’agent | Octets |
| --- | ---: |
| Réponse de `ragmir_search` : trois citations compactes | 2 244 |
| Réponse de `ragmir_expand` : le seul passage sur lequel il s’appuie | 2 295 |
| Total via Ragmir | 4 539 |
| Les trois fichiers cités lus entiers à la place | 22 014 |

Sur 89 questions de développeurs portant sur l’ensemble du dépôt Ragmir, la même tendance se confirme.
Le [benchmark de premier passage](/fr/benchmarks/) montre les octets qu’un agent lit avec grep et avec
Ragmir.

Le budget se mesure en octets, et non en jetons, et il relève du serveur MCP. Une application qui
appelle directement la bibliothèque obtient jusqu’aux `topK` passages demandés. Elle dimensionne
elle-même les preuves selon la fenêtre de contexte de son modèle.

## Quand utiliser RAG, MCP ou les deux

- **Les outils propres de l’agent** suffisent souvent sur un petit dépôt de code. Grep reste l’outil
  pour lister toutes les occurrences ou pour trouver une expression régulière.
- **La recherche via MCP** convient à un client MCP (Claude Code, Codex, Cursor, Gemini CLI, Qwen Code,
  ou tout client via stdio). Elle aide lorsque l’agent a besoin de réponses tirées de centaines de
  PDF, de fichiers Office ou de numérisations, ou de documents qui emploient d’autres mots que la
  question.
- **La recherche sans MCP** convient à une application ou à un pipeline. `createRagmirClient()`, le
  retriever LangChain.js et les paquets Python lisent le même index.
- **Un chat exclusivement distant** a besoin de son propre connecteur ou d’une application qui appelle
  la bibliothèque. Ragmir n’a pas de serveur HTTP intégré, et un point d’accès de modèle comme Ollama
  ne se rattache pas de lui-même à un serveur MCP.

## Étapes suivantes

- [Ragmir comme serveur MCP RAG](/fr/serveur-mcp-rag/)
- [Intégration Claude Code](/fr/integrations/claude-code/)
- [Guide d’intégration d’agent](/docs/agent-integration/)
- [Citations RAG](/fr/rag-citations/)
