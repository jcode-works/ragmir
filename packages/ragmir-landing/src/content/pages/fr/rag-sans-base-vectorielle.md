---
title: "RAG sans base vectorielle, GPU ni clé d’API | Ragmir"
description: "Quand une recherche par mots-clés BM25, complétée d’embeddings locaux facultatifs, suffit pour un RAG : fonctionnement, mesures et compromis honnêtes."
h1: "RAG sans base vectorielle : quand la recherche par mots-clés suffit"
summary: "Un RAG a besoin d’un index de recherche, pas d’un serveur de base vectorielle. La recherche par défaut de Ragmir, `local-hash`, classe d’abord les preuves par mots-clés BM25 dans un index intégré, sous le dossier `.ragmir` du projet. Elle n’exige ni modèle d’embedding, ni GPU, ni clé d’API. Sur le dépôt de Ragmir lui-même, elle a placé un fichier de réponse dans le top 3 pour 82 % des 89 questions de développeurs, et dans le top 10 pour 99 %. Ajoutez un modèle d’embedding local lorsque les questions emploient des mots que vos documents n’utilisent pas."
section: guide
setup: agents
translationKey: "rag-without-vector-database"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["agentic-rag", "benchmarks", "local-rag"]
---

Un RAG a besoin d’un moyen de trouver les passages qui répondent à une question. Il n’a pas besoin de
serveur de base de données.

Ragmir fait cela dans un seul processus Node.js. L’analyse, l’index et la recherche s’exécutent là où
Ragmir tourne. L’index est un magasin LanceDB intégré, dans le dossier `.ragmir/` ignoré par Git.

Il n’y a ni serveur de base de données à déployer, ni API d’embedding à appeler. Avec le fournisseur
par défaut `local-hash`, il n’y a pas non plus de modèle à télécharger. L’agent ou l’application qui
appelle Ragmir rédige la réponse avec le modèle de son choix.

## Un RAG peut-il fonctionner sans base vectorielle ?

Oui, lorsque les preuves par mots-clés portent la réponse. Le fournisseur par défaut `local-hash`
fonctionne ainsi :

1. **BM25 en tête.** L’index plein texte couvre le corps de chaque passage, son contexte structurel et
   le texte de titre cité. Il couvre aussi le chemin relatif de la source, ainsi que les parties des
   identifiants en camelCase, PascalCase, en acronymes et en lettres et chiffres. Une question sur
   « login attempts » peut donc atteindre `LoginAttemptService.java`.
2. **Texte normalisé.** La casse, les accents et les autres signes diacritiques sont normalisés de la
   même façon dans les passages et les requêtes. L’analyseur applique ensuite la racinisation
   (stemming) anglaise et retire les mots vides anglais.
3. **Les vecteurs hachés ne départagent que les égalités.** Le vecteur `local-hash` est un signal
   lexical haché, sans fréquence inverse de document. Il reçoit un poids de 0,01 dans la fusion par
   rang réciproque. Il ne fait que départager les égalités ou ajouter des passages que l’index plein
   texte n’a pas renvoyés.
4. **Des preuves faibles ne renvoient rien.** `local-hash` exige des preuves lexicales. Il ne répond
   rien lorsque les mots introuvables dans l’index portent la moitié du poids IDF de la question.
   Exemple : « How does it sync with Pinecone? » sur un corpus qui ne mentionne jamais Pinecone. Une
   recherche dont les cinq premiers résultats sont tous faibles ne renvoie pas non plus de résultat.

Le chemin par défaut conserve donc tout de même des vecteurs. Ils sont hachés, ils vivent dans le
dossier `.ragmir/` du projet, et aucun serveur ne les héberge.

## Recherche hybride : BM25 et embeddings locaux facultatifs

Avec un modèle Transformers local, Ragmir fusionne les résultats vectoriels et plein texte par fusion
par rang réciproque avec `k = 60`, à poids égaux. Le modèle s’exécute via la dépendance pair
facultative `@huggingface/transformers` :

```bash
pnpm add -D @huggingface/transformers
pnpm exec rgr setup --semantic
pnpm exec rgr ingest
```

`rgr setup --semantic` installe le modèle adapté à cette machine (Granite R2 multilingue sur la
plupart), sauf si le projet en a déjà choisi un. `rgr models list` affiche la taille de téléchargement
de chaque modèle et la mémoire nécessaire à l’indexation. Changer de modèle prépare une reconstruction
validée lors de la prochaine ingestion.

Pour calculer les embeddings avec un modèle que vous servez déjà, réglez
`embeddingProvider: "openai-compatible"`. Ragmir transmet alors ses requêtes à Ollama, vLLM ou un autre
point d’accès compatible OpenAI. Le texte des passages et les requêtes partent vers ce point d’accès.

## RAG sans GPU ni clé d’API

- **La recherche n’en a besoin d’aucun.** `local-hash` fonctionne hors ligne sur le CPU, sans modèle,
  GPU ni clé d’API. Les modèles sémantiques tournent aussi sur le CPU. Un GPU est facultatif : il ne
  sert qu’à calculer les embeddings des lots d’ingestion (`ingestEmbeddingDevice: "webgpu"`). La
  recherche continue de calculer les embeddings des requêtes courtes sur le CPU.
- **La réponse est un choix distinct.** Le modèle appelé par votre agent ou votre application peut
  exiger une clé. Un modèle local garde les passages sur la machine lorsque toute l’application
  s’exécute localement. Un exemple : Ollama avec ses fonctions cloud désactivées. Le
  [guide d’intégration d’agent](/docs/agent-integration/) présente cet exemple.

## Ce que montrent les mesures

Le 27 novembre 2026, `pnpm bench:competitors` a soumis 89 questions de développeurs, 30 questions
hors sujet et 40 questions proches du domaine sur 287 fichiers du dépôt de Ragmir, dans Ragmir et
dans d’autres bibliothèques de recherche locales. Les [benchmarks](/fr/benchmarks/) donnent le
tableau complet, un graphique et le rapport brut.

Sans aucun modèle, Ragmir a classé un fichier de réponse dans le top 3 plus souvent (82 %) que le
pipeline LangChain.js avec un modèle d’embedding (70 %). Il n’a aussi rien renvoyé pour la plupart
des questions hors sujet.

Ajouter le modèle a fait passer le top 3 de 82 à 87 %. Il a aussi augmenté les refus pour les
questions hors sujet et proches du domaine.

## Compromis à peser

- **Vocabulaire.** Les mots-clés trouvent les termes qu’emploient vos documents. Ajoutez un modèle
  lorsque les questions utilisent d’autres mots (synonymes, paraphrases, autre langue). Ajoutez-en un
  aussi lorsque les refus doivent suivre le sens plutôt que les mots-clés. Sans modèle, un agent peut
  envoyer avec la question ses propres mots-clés `lex`, une paraphrase `vec` ou une réponse probable
  `hyde`. Ragmir recherche leurs termes, qui atteignent des passages que les mots de la question seule
  manquent.
- **Les refus suivent les mots-clés.** Une question proche du domaine qui partage le vocabulaire du
  projet peut tout de même renvoyer des passages, comme le montre la colonne correspondante.
- **Vitesse.** Les bibliothèques en mémoire ont répondu plus vite. Ragmir interroge un index sur disque,
  qui s’ingère de façon incrémentale.
- **Votre corpus décide.** Un seul dépôt n’est pas le vôtre. Lancez `rgr evaluate` sur vos propres
  questions, avec et sans modèle, avant de choisir.

## Est-ce un RAG sans vecteurs ?

Non, le RAG sans vecteurs est une autre idée. Le projet PageIndex le décrit comme la construction d’un
« hierarchical tree index » pour chaque document, semblable à « a table of contents optimized for LLMs
and agents ». Un LLM parcourt ensuite cet arbre par raisonnement, avec « no vector DBs or chunking ».

Ragmir découpe les documents en fragments et conserve des vecteurs hachés ou issus d’un modèle, à côté
d’un index de mots-clés. Il classe les passages sans demander à un modèle génératif de les choisir.

Un agent peut tout de même naviguer par structure. `ragmir_sources` avec `outline: true` renvoie les
sections d’un document, avec la citation du premier passage de chaque section. Développer chaque
`nextCitation` avec `ragmir_expand` permet de lire le document d’un bout à l’autre.

## Essayer

```bash
pnpm add -D @jcode.labs/ragmir
pnpm exec rgr setup --no-ingest --agents claude,codex
pnpm exec rgr sources add "docs/**/*.md" "specs/**/*.docx" "src/**/*.ts"
pnpm exec rgr ingest
pnpm exec rgr search "authentication contract" --compact
```

Ajoutez `--explain` à une recherche pour voir, pour chaque résultat, ses rangs par mots-clés et
vectoriels, ainsi que ses termes correspondants.

## Étapes suivantes

- [Qu’est-ce que le RAG agentique ?](/fr/rag-agentique/)
- [Benchmarks, méthode et limites](/fr/benchmarks/)
- [Configuration : classement et abstention](/docs/configuration/)
- [Construire un RAG local](/fr/rag-local/)
