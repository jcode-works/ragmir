---
title: "Serveur MCP RAG : recherche locale avec citations exactes | Ragmir"
description: "Ce qu’est un serveur MCP RAG, les outils et limites du serveur local de Ragmir, son lancement dans Claude Code, Codex et Cursor, et cinq critères de comparaison."
h1: "Un serveur MCP RAG local pour votre code et vos documents"
summary: "Un serveur MCP RAG donne à un agent d’IA des outils de recherche sur un index de documents. Le serveur de Ragmir tourne sur votre machine via stdio et indexe le code, le Markdown, les PDF et les fichiers Office. Chaque recherche renvoie trois citations compactes dans un budget de 32 KB, de sorte que l’agent ne développe que les passages dont il a besoin."
section: guide
setup: agents
translationKey: "mcp-rag-server"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations", "integrations/claude-code", "docs/agent-integration"]
---

Un serveur MCP RAG donne à un agent des outils pour interroger un index. L’agent envoie une question
et reçoit en retour des passages classés. Il décide ensuite ce qu’il lit.

Le serveur de Ragmir répond à partir de l’index que `rgr ingest` construit dans le dossier
`.ragmir/` du projet, ignoré par Git. Il s’exécute comme processus local via stdio, sans port HTTP,
sans compte ni stockage hébergé. La recherche par défaut, `local-hash`, n’exige ni modèle, ni GPU,
ni clé d’API.

Il sert aussi de serveur MCP de documentation pour votre propre documentation : spécifications,
décisions d’architecture, procédures d’exploitation (runbooks) et descriptions d’API restent dans le
dépôt, et l’agent les interroge à leur emplacement.

Le serveur recherche et cite. L’agent planifie, raisonne et rédige avec le modèle que vous avez
choisi.

## Ce que le serveur expose

| Outil | Sert à | Effet |
| --- | --- | --- |
| `ragmir_status` | Vérifier l’état, la fraîcheur, les périmètres et les limites | Lecture seule |
| `ragmir_search` | Trouver des passages cités pour une question, ou pour jusqu’à cinq questions liées | Lecture seule |
| `ragmir_expand` | Lire une citation avec ses voisins, ou parcourir un document page par page | Lecture seule |
| `ragmir_sources` | Lister les documents indexés par dossier ou par glob | Lecture seule |
| `ragmir_audit` | Repérer les sources manquantes, périmées, non prises en charge ou dupliquées | Lecture seule |
| `ragmir_ingest` | Actualiser l’index après une modification des fichiers | Écrit uniquement dans l’index privé de Ragmir |

Trois prompts servent les clients qui ne chargent aucune skill :

- `answer` demande une citation pour chaque affirmation, et une déclaration simple lorsque les
  documents ne contiennent aucune preuve.
- `compile-source` transforme une source en pages Markdown citées.
- `audit-knowledge` propose des corrections pour ce que l’audit de connaissances détecte.

Deux ressources bornées, `ragmir://context` et `ragmir://sources`, décrivent la base. Les instructions
du serveur et les descriptions des outils nomment la base qu’il sert.

### Des citations compactes, puis un seul développement

Par défaut, la recherche renvoie au plus trois citations compactes par question. Chacune contient :

- la citation,
- un extrait qui commence aux lignes contenant les mots de la question,
- `weakEvidence` lorsque l’appui est faible,
- `sourceStatus` lorsque le fichier cité a changé après l’indexation.

<figure>
  <img src="/guides/inspector-search.webp" alt="MCP Inspector 2.16.0 exécutant ragmir_search avec la question « How do I run Ragmir on a server without internet access? ». Les résultats listent docs/server-deployment.md:L1-L8#0 et docs/docker.md:L98-L107#5, chacun avec son chemin de titres, son extrait et sa plage de lignes." width="1400" height="908" loading="lazy" decoding="async">
  <figcaption>Un appel <code>ragmir_search</code> dans MCP Inspector 2.16.0, sur Ragmir 6.20.0 servant un dossier de guides Markdown et un PDF. L’appel a duré 169 ms.</figcaption>
</figure>

Un appel reste dans la limite `mcpMaxOutputBytes`, fixée à 32 KB par défaut. `_meta["ragmir/output"]`
signale toute troncature. Les passages déjà renvoyés dans la session reviennent sous forme de
courtes entrées `seen`, de sorte que la recherche suivante consacre son budget à de nouvelles preuves.

L’agent appelle ensuite `ragmir_expand` sur la seule citation sur laquelle il s’appuiera. L’outil
renvoie le passage indexé avec des voisins bornés, ainsi qu’un `nextCitation` pour lire un long
document fenêtre par fenêtre.

Lorsque les preuves sont faibles, la recherche ne renvoie rien. L’agent peut alors indiquer que les
documents ne couvrent pas la question.

## PDF et Markdown dans un même index

Les citations suivent le format de chaque source : un seul serveur répond à partir du Markdown, des
PDF, des fichiers Office et du code :

- `docs/runbook.md:L12-L18#3` cite des lignes.
- `contracts/msa-acme-2026.pdf:p7#3` cite une page PDF.
- Les autres formats utilisent des coordonnées de diapositive, de feuille et de cellule, de position
  dans le spine EPUB ou de section nommée.

Les passages Markdown portent leur chemin de titres, et `ragmir_sources` liste pour chaque page le
titre et la description de son front matter. Plus de 900 extensions et noms de fichiers s’indexent
sans installation supplémentaire.

Les pages numérisées nécessitent un moteur OCR local, à activer avec cette commande :

```bash
rgr ocr setup
```

`rgr audit --unsupported` liste ce qui a été ignoré.

## Comment chaque client le lance

| Client | Installation |
| --- | --- |
| Claude Code | `/plugin install ragmir --marketplace jcode-works/ragmir`, then `/ragmir:index`; or `rgr setup --agents claude` |
| OpenAI Codex | `codex plugin marketplace add jcode-works/ragmir`, then `codex plugin add ragmir@ragmir`; or `rgr setup --agents codex` |
| Cursor | Le dossier du plugin `plugins/ragmir`, copié dans `~/.cursor/plugins/local/ragmir` jusqu’à son inscription sur la Cursor Marketplace |
| Gemini CLI | `gemini extensions install https://github.com/jcode-works/ragmir` |
| Qwen Code | `qwen extensions install jcode-works/ragmir:ragmir` |
| Kimi, OpenCode, Cline | `rgr setup --agents kimi,opencode,cline` |

Les plugins et extensions exécutent une version de Ragmir épinglée depuis npm, sur le projet ouvert
par l’agent. Tout autre client qui prend en charge MCP via stdio reprend cette entrée, adaptée à son
format documenté :

```json
{
  "mcpServers": {
    "ragmir": {
      "command": "node",
      "args": ["/absolute/project/.ragmir/run.cjs", "serve-mcp"],
      "env": { "RAGMIR_PROJECT_ROOT": "/absolute/project" }
    }
  }
}
```

Enregistrez le serveur par projet, avec un `.mcp.json` versionné ou le `.codex/config.toml` de Codex.
Un serveur enregistré pour tous les projets répond à des espaces de travail sans rapport depuis la
même base. `rgr doctor` signale ces enregistrements dans Claude Code et Codex, et `mcpAllowedRoots`
refuse ces espaces de travail.

Le registre MCP référence le serveur sous le nom `io.github.jcode-works/ragmir`.

## Où vont les données

L’analyse, l’index et la recherche restent sur la machine qui exécute Ragmir, sans télémétrie.

Ce qui quitte la machine dépend de l’agent. Un agent de code cloud envoie les extraits qu’il lit à
son fournisseur de modèle. Un modèle local les garde sur la machine.

Ragmir conserve le texte source sans le masquer : choisissez donc vos sources en gardant ce chemin à
l’esprit. Les fichiers `.env`, les clés et les certificats n’atteignent jamais l’index. Il n’existe ni
authentification ni filtrage par utilisateur : un hôte qui expose le serveur à plusieurs personnes
est responsable du contrôle d’accès.

## Comment choisir le meilleur serveur MCP RAG

Aucun serveur n’est le meilleur pour tous les projets, mais cinq critères les départagent. La
dernière colonne ne concerne que Ragmir 6.20.0, d’après sa documentation, afin que vous puissiez
poser les mêmes questions aux autres serveurs.

| Critère | Ce qu’il faut vérifier | Ragmir |
| --- | --- | --- |
| Fonctionne en local | Si l’indexation ou la recherche exige un compte, une clé d’API, un index hébergé ou une API d’embeddings | Un seul processus stdio local ; ni compte ni clé d’API ; `local-hash` n’exige aucun modèle |
| Formats indexés | Les fichiers analysés, le fonctionnement sur les numérisations, et si les fichiers ignorés sont signalés | Plus de 900 extensions et noms de fichiers ; OCR local lorsqu’il est activé ; fichiers ignorés listés par `rgr audit --unsupported` |
| Précision des citations | Si un résultat ne nomme qu’un fichier, ou une ligne, une page, une diapositive ou une cellule que l’agent peut rouvrir | Lignes, pages PDF, diapositives, plages de feuilles et de cellules, éléments du spine EPUB, objets exportés |
| Budget de sortie | Nombre de résultats par défaut, plafond de taille par appel, et signalement ou non de la troncature | Trois citations compactes, 32 KB par appel (`mcpMaxOutputBytes`), plafond de 1 MiB, troncature signalée dans `_meta["ragmir/output"]` |
| Licence | La licence du serveur et une éventuelle option commerciale | AGPL-3.0-only ; licence commerciale de JCode Works |

Posez ensuite une question à laquelle vos documents ne répondent pas. Un serveur qui ne renvoie rien
permet à l’agent de le dire, au lieu de répondre à partir du passage le plus proche. `rgr evaluate`
mesure ce taux sur vos propres questions de référence.

## Étapes suivantes

- [Ajouter le plugin à Claude Code](/fr/integrations/claude-code/)
- [Guide d’intégration d’agent](/docs/agent-integration/)
- [RAG local ou cloud : ce que chaque configuration envoie](/fr/rag-local-ou-cloud/)
- [Formats pris en charge](/docs/supported-formats/)
