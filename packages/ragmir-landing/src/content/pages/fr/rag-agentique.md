---
title: "RAG agentique : définition et quand l’utiliser | Ragmir"
description: "RAG agentique : l’agent décide quand chercher, reformule, développe les citations et s’arrête sur des preuves faibles. Avec la boucle et un exemple local."
h1: "Qu’est-ce que le RAG agentique, et quand faut-il l’utiliser ?"
summary: "Le RAG agentique laisse l’agent contrôler la recherche. Il décide quand chercher, reformule la question, ouvre les passages cités dont il a besoin et s’arrête lorsque les preuves sont faibles. Ragmir fournit la partie recherche. L’agent et son modèle assurent le raisonnement, la réponse et toute action."
section: guide
setup: agents
translationKey: "agentic-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-without-vector-database", "case-studies/ragmir-repository", "benchmarks", "mcp-rag-server"]
---

Le RAG agentique fait de la recherche un outil que l’agent appelle lorsqu’il a besoin de preuves.

Dans le RAG classique (génération augmentée par la recherche), une application prend la question de l’utilisateur, récupère les passages une seule fois et les transmet à un modèle. Dans le RAG agentique, l’agent lance la recherche quand il en a besoin. Il change de formulation entre deux appels, lit un passage en entier avant de décider quoi chercher ensuite, et peut conclure que les documents ne couvrent pas la question.

Ragmir est conçu pour ce schéma : il renvoie des citations compactes, développe celles que l’agent sélectionne, et ne renvoie rien lorsque les preuves sont faibles. Il n’exécute ni la boucle de l’agent ni la rédaction de la réponse.

## RAG agentique ou RAG classique

| | RAG classique | RAG agentique |
| --- | --- | --- |
| Moment de la recherche | Une seule fois, avant la génération | À chaque fois que l’agent juge avoir besoin de preuves |
| Ce qui est cherché | La question telle qu’elle est écrite | La question, les reformulations de l’agent et ses questions de suivi |
| Ce que lit le modèle | Les passages renvoyés | Les passages que l’agent développe, ou un document lu fenêtre par fenêtre |
| Sans bonne preuve | L’étape unique répond ou refuse | L’agent reformule une fois, cherche ailleurs, ou signale le manque |
| Interface Ragmir | `RagmirRetriever` ou `search()` | Outils MCP, ou `createRagmirTools` et `RagmirToolkit` pour les agents LangChain |

## La boucle de l’agent

<figure>
  <img src="/diagrams/agentic-rag-loop-fr.svg" alt="La boucle du RAG agentique : l’agent décide s’il a besoin de preuves, appelle ragmir_search, signale un manque quand le résultat est vide, développe la citation retenue avec ragmir_expand, puis relance une recherche jusqu’à ce que les preuves suffisent pour répondre ou agir." width="800" height="560" loading="lazy" decoding="async">
</figure>

En clair, la boucle décrite dans la documentation de Ragmir :

1. L’agent lit une seule fois l’identité, les périmètres et la fraîcheur de la base, depuis `ragmir://context` ou `ragmir_status`.
2. Il appelle `ragmir_search` avec une requête ciblée, ou envoie jusqu’à cinq questions liées dans `queries`.
3. Il développe avec `ragmir_expand` la citation sur laquelle s’appuiera sa réponse.
4. Lorsque les preuves sont incomplètes, il reformule avec `searches`, restreint la recherche à des dossiers ou à un périmètre nommé, ou liste les documents avec `ragmir_sources`.
5. Il répond en citant chaque affirmation, nomme les manques et vérifie les citations avant d’agir.

## Comment Ragmir met en œuvre la partie recherche

- **Plusieurs formulations dans une seule recherche.** `searches` ajoute jusqu’à cinq formulations du même besoin, fusionnées avec la question en un seul classement : `lex` pour les mots-clés (une `"expression"` est obligatoire, un `-mot` est exclu), `vec` pour une paraphrase, ou `hyde` pour un passage rédigé comme pourrait l’être la réponse. Chacune pèse la moitié des listes propres à la question (un passage `hyde` pèse un quart), et seule la question décide s’il existe une réponse : les formulations ne transforment jamais un refus en réponse.
- **Un contexte borné.** La recherche renvoie par défaut trois citations compactes, dans un budget de sortie de 32 Ko par appel. Les passages déjà renvoyés dans la session reviennent sous forme de courts stubs `seen`, afin qu’une seconde recherche consacre son budget aux nouvelles preuves.
- **Développement à la demande.** `ragmir_expand` renvoie une citation avec ses voisins, jusqu’à cinq citations à la fois, et un `nextCitation` pour lire un long document jusqu’au bout.
- **Des signaux exploitables par l’agent.** Un résultat vide signifie que la base ne contient aucune preuve pour la question. `weakEvidence` signale un appui fragile, `sourceStatus` signale un fichier modifié depuis l’indexation (`ragmir_ingest` rafraîchit l’index). Un avertissement nomme les mots de la question qu’aucun passage indexé ne contient.
- **Questions hors sujet.** Sur le dépôt de Ragmir, 23 à 28 questions hors sujet sur 30 n’ont renvoyé aucun résultat le 27 novembre 2026 ([benchmarks](/fr/benchmarks/)).

Une recherche avec formulations, telle que l’agent l’envoie :

```json
{
  "query": "How are API requests throttled?",
  "searches": [
    { "type": "lex", "query": "\"rate limit\" quota -deprecated" },
    { "type": "vec", "query": "limits on how many calls a client may send" },
    { "type": "hyde", "query": "Each API key may send 600 requests per minute." }
  ],
  "intent": "gateway configuration"
}
```

## Quand utiliser le RAG agentique, et quand le RAG classique suffit

Le RAG classique suffit lorsqu’une seule recherche avec les mots de l’utilisateur trouve le passage, et que l’application n’a plus qu’à répondre ou refuser. L’assistant contrats de la documentation de Ragmir en est le cas : `RagmirRetriever` renvoie la clause qui répond, avec sa citation de page, ou aucun document lorsque les contrats se taisent, si bien que l’application le dit au lieu de deviner. L’exemple de modèle local de la documentation est lui aussi une seule passe de recherche, et non un agent autonome.

Le RAG agentique convient aux tâches où un seul passage ne suffit pas à la réponse :

- implémenter une fonctionnalité à partir d’une spécification, puis rechercher à nouveau ses exceptions ;
- diagnostiquer un incident à partir d’un runbook, d’un rapport d’incident et du code de retry ;
- lire un long PDF ou une spécification fenêtre par fenêtre ;
- poser des questions formulées autrement que les documents, lorsque les mots-clés, la paraphrase ou la réponse probable de l’agent atteignent des passages que les mots de la question ne trouvent pas.

Sur un petit dépôt de code, la recherche propre à un agent de code suffit souvent, et grep reste l’outil pour lister toutes les occurrences ou trouver une expression régulière.

## L’exécuter en local

Indexez un projet et interrogez-le depuis le shell. Le même index sert les agents que `rgr setup` connecte :

```bash
npm install -D @jcode.labs/ragmir@6.20.0
npx rgr setup --no-ingest --agents claude,codex
npx rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
npx rgr ingest
npx rgr search "authentication contract" --compact
```

Depuis la CLI, `--lex`, `--vec` et `--hyde` ajoutent des formulations, et `--explain` liste les formulations qui ont trouvé chaque résultat.

Voici un tour de boucle, enregistré le 27 novembre 2026 avec Ragmir 6.20.0 et les onze guides du dossier `docs/` de Ragmir indexés :

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call [...]
```

Les sorties sont reproduites telles qu’elles ont été affichées, en anglais.

L’agent a lu 4 539 octets de réponses pour atteindre le passage et sa plage de lignes, alors que l’ouverture entière des trois fichiers cités aurait coûté 22 014 octets.

Pour une application, `createRagmirTools` depuis `@jcode.labs/ragmir/langchain` donne à un agent LangChain.js les mêmes outils `ragmir_search` et `ragmir_expand`, et `RagmirToolkit` fait de même en Python. L’[intégration LangChain](/fr/integrations/langchain/) montre les deux.

## Limites

- Ragmir n’embarque ni modèle, ni agent, et n’ouvre aucun port HTTP. La planification, la génération et les actions restent dans l’agent ou l’application.
- Les passages vont là où s’exécute le modèle de l’agent : avec un agent adossé au cloud, les extraits sélectionnés atteignent son fournisseur.
- Un hôte exposé au réseau assure l’authentification, l’autorisation par utilisateur, la sécurité du transport et les limites de débit ; Ragmir ne filtre pas les résultats par utilisateur.
- Le texte récupéré sert de preuve à évaluer pour l’agent, jamais d’instructions à suivre.

## Étapes suivantes

- [RAG sans base vectorielle](/fr/rag-sans-base-vectorielle/)
- [Serveur MCP de Ragmir pour les agents](/fr/serveur-mcp-rag/)
- [Guide d’intégration des agents](/docs/agent-integration/)
- [Comment le dépôt de Ragmir utilise Ragmir](/fr/etude-de-cas/depot-ragmir/)
