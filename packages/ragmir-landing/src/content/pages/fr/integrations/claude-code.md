---
title: "Plugin RAG pour Claude Code avec recherche locale citée | Ragmir"
description: "Ajoutez un RAG à Claude Code avec le plugin Ragmir : installez-le, indexez un projet, puis obtenez des passages cités à la ligne, page, diapositive ou cellule."
h1: "Comment ajouter un RAG à Claude Code"
summary: "Installez le plugin Ragmir avec une seule commande, puis lancez /ragmir:index une fois dans chaque projet. Claude Code peut alors chercher dans votre code, vos spécifications, vos PDF et vos fichiers Office, et citer chaque passage à sa ligne, sa page, sa diapositive ou sa cellule, tout en gardant l’index sur votre machine."
section: integration
setup: agents
translationKey: "integrations/claude-code"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["compare/claude-vs-rag", "local-vs-cloud-rag", "mcp-rag-server", "docs/agent-integration"]
logo: "claude"
group: "agents"
---

Installez le plugin Ragmir, indexez un projet une seule fois, et Claude Code peut y chercher avec
des citations.

Claude Code lit des fichiers et lance grep. Cela suffit pour quelques fichiers texte. Le plugin
ajoute un index des fichiers que vous choisissez, construit sur votre machine. Les outils MCP
renvoient des passages cités à la ligne exacte, à la page PDF, à la diapositive ou à la cellule du
tableur.

Le plugin regroupe trois éléments :

- la commande `/ragmir:index`
- la compétence de recherche (`/ragmir:ragmir`)
- un serveur MCP avec cinq outils en lecture seule et `ragmir_ingest`

Le serveur exécute une version fixée de Ragmir, publiée sur npm, sur le projet que Claude Code a
ouvert. Il n’exige ni compte, ni clé API, ni stockage hébergé.

## Installer le plugin RAG pour Claude Code

1. Installez le plugin :

   ```text
   /plugin install ragmir --marketplace jcode-works/ragmir
   ```

   Depuis un terminal, la même installation prend deux commandes. Avec Claude Code 2.1.329, le 27
   novembre 2026, elles ont affiché :

   ```text
   $ claude plugin marketplace add jcode-works/ragmir
   ✔ Successfully added marketplace: ragmir (declared in user settings)
   $ claude plugin install ragmir@ragmir
   ✔ Successfully installed plugin: ragmir@ragmir (scope: user)
   ```

2. Dans chaque projet, indexez les sources que Claude peut lire :

   ```text
   /ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
   ```

   Sans argument, Claude propose les sources et demande confirmation avant l’indexation.

3. Relancez la commande d’indexation chaque fois que vous ajoutez des sources :

   ```text
   /ragmir:index
   ```

Vous pouvez aussi construire le même index à la main, depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Ne lancez pas `rgr setup --agents claude` dans un projet qui utilise le plugin : la commande
enregistrerait un second serveur, au niveau du projet. Sans le plugin, cette commande est
l’alternative.

Claude Code ne lance le serveur déclaré dans `.mcp.json` qu’après votre approbation. Jusque-là,
`rgr doctor` affiche `approval=pending`.

## Utiliser le plugin au quotidien

Posez vos questions en langage courant. La compétence de recherche demande à Claude d’interroger
l’index avant de répondre à une question sur le projet. Mentionnez Ragmir dans la demande pour en
être sûr. Ces demandes couvrent l’essentiel du quotidien.

### Répondre avec ses sources

```prompt
Utilisez Ragmir : comment annuler une mise en production ratée ? Citez le fichier et les lignes derrière chaque étape.
```

Claude effectue la recherche, ouvre la ou les citations dont il a besoin avec `ragmir_expand`,
et répond en citant des références telles que `docs/release.md:L40-L58`.

### Chercher dans un dossier ou un type de fichier

```prompt
Cherchez uniquement dans les PDF sous specs/ avec Ragmir : quel délai de réponse le contrat promet-il ?
```

Le dossier ou le glob devient `includePaths`, afin que le code et les autres documents ne
concurrencent pas le contrat.

### Vérifier les documents avant une modification

```prompt
Avant de modifier la politique de nouvelles tentatives, utilisez Ragmir pour trouver ce que les documents et les décisions consignées disent des nouvelles tentatives, et listez ce que la modification contredirait.
```

### Lire un long document dans l’ordre

```prompt
Lisez docs/migration.md avec Ragmir depuis le début et listez chaque changement incompatible avec sa citation.
```

L’agent développe le premier passage et suit `nextCitation` fenêtre par fenêtre, au lieu de charger
tout le fichier d’un coup.

### Trouver ce qui manque à l’index

```prompt
Utilisez Ragmir pour lister les PDF indexés, puis auditez les sources pour repérer les fichiers manquants ou obsolètes.
```

`ragmir_sources` liste les documents, et `ragmir_audit` compare les fichiers sur le disque avec
l’index.

### Rafraîchir après une modification

```prompt
J’ai mis à jour docs/release.md. Rafraîchissez l’index Ragmir, puis répondez à nouveau.
```

L’agent appelle `ragmir_ingest`, qui ne lit que les fichiers nouveaux ou modifiés. L’index précédent
reste consultable tant que le nouveau n’a pas passé la validation.

## Ce que Claude Code gagne par rapport à grep et à la lecture de fichiers

| | Claude Code seul | Avec Ragmir |
| --- | --- | --- |
| PDF, Office, scans | Ouverts un à un ; grep ne peut pas chercher à l’intérieur | Indexés une fois, les scans passent par l’OCR local facultatif, et chaque passage est cité à sa ligne, sa page, sa diapositive ou sa cellule |
| Autres formulations | Seuls les mots exacts correspondent | Jusqu’à cinq reformulations fusionnées dans une même recherche, et un avertissement qui nomme les mots qu’aucun fichier ne contient |
| Fenêtre de contexte | Fichiers entiers, relus à chaque session | Trois citations compactes par défaut, dans la limite de 32 Ko par appel ; les passages déjà vus reviennent sous forme de rappels d’une ligne |
| Absent des documents | Une correspondance partielle peut encore devenir une réponse | Rien n’est renvoyé quand aucun passage ne contient de preuve réelle ; les passages faibles sont signalés par `weakEvidence` |

Sur un petit dépôt de code, la recherche native de Claude Code suffit souvent. Grep reste l’outil
pour lister toutes les occurrences ou pour chercher une expression régulière. Ragmir renvoie des
passages classés.

## Une recherche, puis une citation développée

Cette session s’est déroulée le 27 novembre 2026 avec Ragmir 6.20.0, installé depuis npm. Le projet
était propre et contenait les onze guides du dossier `docs/` de Ragmir (11 fichiers, 256 fragments,
indexés en moins d’une seconde). Les réponses sont au format JSON ; les lignes ci-dessous conservent
leurs citations et leurs titres.

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
  3 compact citations, 2,244 bytes of text

ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call: the container above ingests and searches with `--network none`.
  [...]
  one passage, 2,295 bytes of text
```

Claude a lu 4,5 Ko pour atteindre la réponse et la plage de lignes source. Ouvrir en entier les
trois fichiers cités aurait coûté 22 Ko.

Dans une tâche plus longue, les passages déjà renvoyés reviennent sous forme de courts rappels
`seen`. Une seconde recherche consacre alors son budget à de nouvelles preuves.

Pour une question unique, utilisez le prompt `answer` du plugin
(`/mcp__plugin_ragmir_ragmir__answer`). Il demande à Claude de citer chaque affirmation et de le
signaler lorsque les documents ne contiennent aucune preuve.

## Garder la base de connaissances à jour

Un résultat dont le fichier a changé après l’indexation porte un `sourceStatus`. Claude peut alors
appeler `ragmir_ingest`, qui ne lit que les fichiers nouveaux ou modifiés. L’index précédent reste
consultable tant que le nouveau n’a pas passé la validation.

Pour rafraîchir l’index après des commits, des fusions et des changements de branche, lancez cette
commande depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 hooks install
```

## Limites

- Le plugin a besoin de fichiers locaux. Il fonctionne dans Claude Code, et non dans le chat Claude
  sur le web, sur ordinateur ou sur mobile.
- Ragmir renvoie des preuves, et Claude rédige la réponse. Les extraits lus par Claude sont transmis
  à son fournisseur de modèle : un index local ne rend donc pas la conversation locale.
- Ragmir ne peut pas emprunter le modèle de Claude pour son propre classement. Les modèles Claude ne
  produisent pas d’embeddings, et Claude Code ne prend pas en charge le sampling MCP.
- `ragmir_ingest` refuse de s’exécuter tant qu’une OCR locale ou un autre extracteur externe est
  configuré. Lancez alors l’ingestion depuis un terminal.
- Il n’existe pas d’interface d’aperçu des documents. Les citations pointent vers les fichiers
  eux-mêmes.

## Étapes suivantes

- [Fonctionnement du serveur MCP de Ragmir](/fr/serveur-mcp-rag/)
- [Guide d’intégration des agents](/docs/agent-integration/)
- [Formats pris en charge](/docs/supported-formats/)
- [La même configuration pour Codex](/fr/integrations/codex/)
