---
title: "RAG pour Codex via MCP : documentation locale du projet | Ragmir"
description: "Donnez à OpenAI Codex un accès cité à la documentation du projet, avec le plugin Ragmir ou un serveur MCP : installez, indexez une fois, puis cherchez avec citations."
h1: "Comment donner à Codex accès à la documentation du projet"
summary: "Ajoutez le plugin Ragmir à OpenAI Codex, ou enregistrez le serveur MCP de Ragmir dans le fichier .codex/config.toml du projet, puis indexez le projet une fois. Codex cherche alors dans vos spécifications, vos ADR, vos PDF et votre code grâce à des outils locaux, et cite chaque passage qu’il utilise."
section: integration
setup: agents
translationKey: "integrations/codex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/claude-code", "mcp-rag-server", "docs/agent-integration"]
logo: "terminal"
group: "agents"
---

Ajoutez le plugin, indexez le projet une fois, et Codex peut le chercher avec citations.

Codex peut lancer grep et lire quelques fichiers texte. Grep ne trouve que les mots exacts et ne
peut pas chercher à l’intérieur des fichiers PDF ou Office. Ragmir indexe les fichiers que vous
sélectionnez, sur votre machine. Ses outils MCP renvoient des passages cités à leur ligne, leur
page, leur diapositive ou leur cellule.

Codex décide quoi chercher et quelle citation ouvrir. Il rédige avec son propre modèle. L’index se
trouve dans le dossier `.ragmir/` du projet, ignoré par Git. La recherche par défaut n’exige ni
modèle, ni GPU, ni clé API.

## Installer le plugin Codex

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

Avec Codex CLI 0.172.0, le 27 novembre 2026, les deux commandes ont affiché (chemins raccourcis) :

```text
Added marketplace `ragmir` from https://github.com/jcode-works/ragmir.git.
Installed marketplace root: ~/.codex/.tmp/marketplaces/ragmir
Added plugin `ragmir` from marketplace `ragmir`.
Installed plugin root: ~/.codex/plugins/cache/ragmir/ragmir/1.7.5
```

Le plugin regroupe le serveur MCP avec les compétences de recherche et d’indexation. Le serveur
exécute une version fixée de Ragmir, publiée sur npm, et démarre dans le dossier de travail.

Indexez chaque projet une seule fois. Utilisez la compétence `ragmir-index` incluse, ou lancez ces
commandes depuis la racine du projet :

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

## Ou enregistrer un serveur de projet

Sans le plugin, installez Ragmir dans le projet et laissez `rgr setup` préparer l’assistant Codex :

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
```

La configuration écrit `.ragmir/codex-mcp.toml`, et `.ragmir/agent-setup.md` l’explique. Copiez
l’assistant dans le fichier `.codex/config.toml` du projet. Codex le charge une fois le projet
approuvé.

Choisissez une seule voie par projet. À côté du plugin, `rgr setup --agents codex` enregistrerait un
second serveur.

## Limiter le serveur à un seul projet

Évitez `~/.codex/config.toml`. Un serveur enregistré là répond pour tous les espaces de travail à
partir de la même base. Codex, dans un projet sans rapport, lirait alors les documents de ce projet
comme s’ils étaient les siens.

Codex ne partage aucune racine MCP. Le lanceur enregistre donc le répertoire depuis lequel Codex a
démarré le serveur, et le compare à la base. Un espace de travail sans rapport reçoit un
avertissement de périmètre avec chaque résultat. Définissez `mcpAllowedRoots` dans la configuration
pour le refuser à la place.

`rgr doctor` liste les serveurs Ragmir enregistrés dans Codex. Il signale ceux qui sont enregistrés
pour tous les projets.

## Poser des questions sur la documentation en un seul appel

Les questions sur la documentation arrivent souvent par groupes. Codex peut envoyer jusqu’à cinq
questions liées dans `queries`. Elles partagent un même budget de sortie et peuvent être restreintes
à un périmètre nommé :

```json
{ "queries": ["release approval", "rollback owner"], "scope": "docs", "maxBytes": 4096 }
```

Un passage trouvé par plusieurs questions n’apparaît qu’une fois.

Lorsque les documents emploient d’autres mots que la question, Codex peut envoyer cette `query` avec
`searches` :

- ses propres mots-clés (`lex`)
- une paraphrase (`vec`)
- une réponse probable (`hyde`)

Ces formulations sont fusionnées avec la question dans un seul classement. Elles réordonnent et
complètent les résultats. Elles ne transforment jamais un refus en réponse : un résultat vide
signifie donc toujours que les documents ne contiennent aucune preuve.

Codex lit ensuite la citation sur laquelle il s’appuie avec `ragmir_expand`.

## Limites

- Codex transmet les extraits qu’il lit à son fournisseur de modèle. L’index reste local. La
  conversation, elle, ne l’est pas.
- Ragmir ne peut pas utiliser le modèle de Codex pour son propre classement. Les modèles Codex ne
  produisent pas d’embeddings, et Codex ne prend pas en charge le sampling MCP.
- Les plugins ont besoin de fichiers locaux : ils fonctionnent dans les agents de code, et non dans
  les applications de chat web ou mobiles.
- `ragmir_ingest` refuse de s’exécuter tant qu’une OCR locale ou un autre extracteur externe est
  configuré. Lancez l’ingestion depuis un terminal :

  ```bash
  rgr ingest
  ```
- Chaque poste possède son propre index. Partagez les sources via Git, puis lancez l’ingestion sur
  chaque machine :

  ```bash
  rgr ingest
  ```

## Étapes suivantes

- [Fonctionnement du serveur MCP de Ragmir](/fr/serveur-mcp-rag/)
- [Guide d’intégration des agents](/docs/agent-integration/)
- [Configuration et périmètres](/docs/configuration/)
