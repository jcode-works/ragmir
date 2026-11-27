---
title: "RAG MCP pour Cursor : recherche citée dans la documentation | Ragmir"
description: "Connectez Cursor au serveur MCP local de Ragmir via le dossier du plugin ou .cursor/mcp.json, puis cherchez dans la documentation, les PDF et le code, avec citations."
h1: "Cursor et RAG MCP : cherchez dans votre documentation avec citations"
summary: "L’agent de Cursor peut appeler le serveur MCP local de Ragmir pour chercher dans la documentation, le code, les PDF et les fichiers Office d’un projet. Installez le dossier du plugin Ragmir ou ajoutez une entrée dans .cursor/mcp.json, indexez le projet, et chaque résultat revient avec une citation."
section: integration
setup: agents
translationKey: "integrations/cursor"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "mcp-rag-server", "integrations/claude-code", "docs/agent-integration"]
logo: "cursor"
group: "agents"
---

Connectez Cursor au serveur MCP de Ragmir, indexez le projet une fois, et l’agent pourra le chercher
avec citations.

L’agent cherche dans un index local des fichiers que vous sélectionnez. Cela inclut les PDF, les
fichiers Word et les présentations, dans lesquels grep ne peut pas chercher. Chaque résultat porte
une citation vers sa ligne, sa page, sa diapositive ou sa cellule de tableur. L’agent peut la
développer avant de s’appuyer sur le passage.

Cursor décide quand chercher et quelle citation ouvrir. Ragmir recherche et cite. L’index reste dans
le dossier `.ragmir/` du projet, ignoré par Git, sur votre machine.

## Installer le plugin Cursor

Le dépôt fournit un seul plugin, dans `plugins/ragmir`, avec un manifeste pour Cursor. Il regroupe
le serveur MCP avec les compétences de recherche et d’indexation. Le serveur exécute une version
fixée de Ragmir, publiée sur npm.

Tant que le plugin n’est pas référencé sur la Cursor Marketplace, copiez le dossier `plugins/ragmir`
du dépôt vers `~/.cursor/plugins/local/ragmir`.

Indexez ensuite chaque projet une fois. Utilisez la compétence `ragmir-index` incluse, ou lancez ces
commandes depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## Ou ajouter une entrée dans .cursor/mcp.json

Si Ragmir est installé dans le projet, `rgr setup` écrit un lanceur local dans `.ragmir/` :

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

Ajoutez ensuite cette entrée dans le fichier `.cursor/mcp.json` du projet, en remplaçant
`/absolute/project` par la racine du projet :

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

Le lanceur trouve le paquet Ragmir installé dans le projet en remontant depuis le dossier du projet.
Il exige Node.js 22.12 ou une version plus récente.

Sans Node.js, le [guide Docker](/docs/docker/) donne la même entrée. Elle utilise `docker` comme
commande et l’image officielle `ghcr.io/jcode-works/ragmir`.

## Vérifier la connexion

1. Rechargez Cursor, puis approuvez le serveur si Cursor le demande.
2. Demandez à l’agent d’appeler `ragmir_status`. La réponse indique la base, sa racine et si elle
   est prête.
3. Posez une question à laquelle les sources répondent. L’agent lance un seul `ragmir_search`.
   Vérifiez la citation renvoyée.

## Chercher dans la documentation depuis Cursor

Les filtres de chemins empêchent une question sur la documentation de tomber dans le code.
`includePaths` et `excludePaths` acceptent des dossiers, des fichiers ou des globs. `["docs"]`
cherche dans tout ce qui se trouve sous `docs/`, et `["**/*.pdf"]` uniquement dans les fichiers PDF.

Un périmètre nommé évite à l’agent de répéter les chemins. Définissez-le dans `ragmir.config.json` :

```json
{
  "scopes": {
    "docs": { "includePaths": ["docs", "README.md"], "description": "Product documentation" }
  }
}
```

Le serveur liste les noms et descriptions de périmètres dans ses instructions, afin que l’agent de
Cursor puisse passer `scope: "docs"`.

Pour un long document, `ragmir_sources` avec `outline: true` liste chaque titre avec la citation de
son premier passage. `ragmir_expand` suit `nextCitation` pour lire le document fenêtre par fenêtre.

## Limites

- Cursor transmet les extraits lus par son agent au modèle qu’il utilise. L’index reste local. La
  conversation, elle, ne l’est pas.
- Les plugins ont besoin de fichiers locaux : ils fonctionnent dans les agents de code, et non dans
  les applications de chat web ou mobiles.
- Ragmir ne gère aucun contrôle d’accès par utilisateur. Chaque poste construit son propre index.
  Partagez les sources via Git, puis lancez l’ingestion sur chaque machine :

  ```bash
  rgr ingest
  ```
- `ragmir_ingest` refuse de s’exécuter tant qu’une OCR locale ou un autre extracteur externe est
  configuré. Lancez l’ingestion depuis un terminal :

  ```bash
  rgr ingest
  ```

## Étapes suivantes

- [Fonctionnement du serveur MCP de Ragmir](/fr/serveur-mcp-rag/)
- [Exécuter Ragmir avec Docker](/docs/docker/)
