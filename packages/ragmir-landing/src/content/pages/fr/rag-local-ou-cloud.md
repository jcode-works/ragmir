---
title: "RAG local ou cloud : modèles, matériel et vos données | Ragmir"
description: "Exécutez un RAG en local, sur votre serveur ou avec une IA cloud : modèles requis, machine nécessaire et ce que reçoit le fournisseur."
h1: "RAG local ou cloud : quels modèles exécuter, et où vont vos documents"
summary: "L’index de Ragmir reste toujours sur la machine qui l’exécute. Ce qui change, c’est le modèle qui rédige les réponses : sur votre machine, sur votre serveur, ou chez un fournisseur cloud qui reçoit les passages envoyés. Voici la configuration et le matériel de chaque cas, et ce qu’il faut vérifier avant qu’un document n’atteigne un modèle cloud."
section: guide
setup: local
translationKey: "local-vs-cloud-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "air-gapped-rag", "self-hosted-rag", "docs/agent-integration"]
---

Une configuration RAG fait tourner deux modèles, et vous choisissez où s’exécute chacun. Ragmir
assure la recherche : il trouve les passages et les cite. Un autre modèle lit ces passages et
rédige la réponse.

## Deux modèles, deux décisions

| Partie | Rôle | Où elle s’exécute |
| --- | --- | --- |
| Recherche, dans Ragmir | Indexe vos fichiers, puis renvoie des passages cités pour chaque question | Sur la machine qui exécute Ragmir, toujours |
| Réponse, dans votre chat, votre agent ou votre application | Lit les passages et rédige la réponse | À votre choix : votre machine, votre serveur ou un fournisseur cloud |

Par défaut, la recherche n’a besoin d’aucun modèle. La réponse, elle, exige toujours un modèle, et
ce choix détermine où vont vos documents.

## Recherche : le modèle et la machine nécessaires

La recherche par défaut, `local-hash`, classe les preuves par mots-clés avec BM25 et n’exige ni
modèle, ni GPU, ni clé d’API. Ajoutez un modèle sémantique lorsque les questions emploient des
mots que vos documents n’utilisent pas, comme des synonymes ou une autre langue.

| Configuration | Minimum | Confortable |
| --- | --- | --- |
| Recherche par mots-clés, `local-hash` (par défaut) | Aucun modèle, GPU ni clé d’API, et rien à télécharger | La mémoire augmente avec le corpus |
| Sémantique, `mxbai-embed-xsmall-v1` (anglais) | 0,75 GB de mémoire pour indexer, téléchargement de 97 MB | 1,5 GB de mémoire et 2 CPU |
| Sémantique, Granite R2 (multilingue, retenu sur la plupart des machines) | 1 GB de mémoire, téléchargement de 124 MB | 2 GB et 2 CPU |
| Sémantique, `multilingual-e5-small` | 1,5 GB de mémoire, téléchargement de 492 MB | 3 GB et 2 CPU |
| Sémantique, `Qwen3-Embedding-0.6B` | 4 GB de mémoire, téléchargement de 624 MB | 8 GB et 2 CPU |

Ces valeurs proviennent des [prérequis système](https://github.com/jcode-works/ragmir#system-requirements)
du README de Ragmir. Dans un projet qui installe Ragmir, vérifiez-les sur votre propre machine, en
tenant compte de la limite de mémoire d’un conteneur :

```bash
npx rgr models list
```

Pour exécuter un modèle sémantique dans Ragmir, installez le runtime facultatif et laissez Ragmir
choisir le modèle adapté à la machine. Le téléchargement n’a lieu qu’une fois, et la recherche
normale garde désactivé le chargement distant de modèles.

```bash
npm install -D @huggingface/transformers
npx rgr setup --semantic
npx rgr ingest --rebuild
```

Pour calculer les embeddings avec un modèle que vous servez déjà avec Ollama, vLLM ou LM Studio,
pointez Ragmir vers son API compatible OpenAI dans `ragmir.config.json` :

```json
{
  "embeddingProvider": "openai-compatible",
  "embeddingEndpoint": "http://localhost:11434/v1",
  "embeddingModel": "nomic-embed-text"
}
```

Avec un point d’accès, le texte des passages et les requêtes partent vers ce point d’accès. Gardez-le
sur la machine ou sur votre propre serveur pour les sources confidentielles. `rgr security-audit`
signale un point d’accès qui n’est pas local.

## Réponse : trois endroits où exécuter le modèle

### Sur votre machine, avec Ollama

Rien ne quitte la machine lorsque le chat ou le script s’exécute aussi en local. Désactivez d’abord
les fonctions cloud d’Ollama avec `"disable_ollama_cloud": true` dans `~/.ollama/server.json`, puis
redémarrez Ollama : un point d’accès localhost ne suffit pas à prouver une inférence locale.

Le [tutoriel RAG local](/fr/rag-local/) met cette configuration en œuvre de bout en bout. Le 27
novembre 2026, `gemma4:12b-it-qat` (un téléchargement de 7,2 GB dans Ollama) a répondu à partir des
passages de Ragmir en 49 secondes sur un Apple M3 Max :

```bash
node answer.mjs "gemma4:12b-it-qat" "How do I run Ragmir on a server without internet access?"
```

En règle générale, un modèle local a besoin d’une mémoire libre supérieure à la taille de son
téléchargement, plus de la place pour les passages et la question que vous lui envoyez. Les petits
modèles répondent plus vite, mais passent plus souvent à côté des nuances.

### Sur votre propre serveur

Le même script appelle tout point d’accès qui parle le format chat completions, comme un serveur
vLLM que vous exploitez. Fournissez une éventuelle clé par la configuration secrète de votre
environnement d’exécution, puis définissez l’URL de chat et le modèle déployé :

```bash
LLM_API=chat-completions \
LLM_CHAT_URL=https://llm.example.org/v1/chat/completions \
node answer.mjs "your-deployed-model" "How is a release approved?"
```

La question et les passages développés traversent le réseau jusqu’à votre point d’accès. Vous
maîtrisez le déploiement, les accès, le transport, la conservation et les journaux.

### Chez un fournisseur cloud

Les agents de code comme Claude Code, Codex, Cursor et Gemini CLI exécutent le serveur MCP de Ragmir
sur votre machine, puis envoient les passages qu’ils lisent au modèle de leur fournisseur. Les
[intégrations](/fr/integrations/) détaillent chacun d’eux.

Une application peut faire de même avec le SDK du fournisseur. Le
[guide d’intégration d’agent](/docs/agent-integration/) contient un exemple avec Claude : trois
passages et la question atteignent l’API d’Anthropic, tandis que l’index et les autres documents
restent là où Ragmir s’exécute.

## Où vont vos documents

| Configuration | Où vont les preuves | Ce que vous maîtrisez |
| --- | --- | --- |
| Modèle local et chat local, par exemple Ollama | Les passages restent sur la machine lorsque toute l’application s’exécute localement, sans transmission externe | Poids du modèle, historique du chat, journaux, extensions et accès à la machine |
| Modèle auto-hébergé sur votre serveur ou une infrastructure cloud louée | Les passages sélectionnés traversent le réseau jusqu’à votre point d’accès d’inférence | Déploiement, contrôles d’accès, transport, journaux, sauvegardes et modalités d’hébergement |
| API de modèle gérée ou agent cloud | Les passages sélectionnés atteignent le fournisseur choisi via l’application qui les utilise | Choix des sources et réglages de l’application ; les politiques de données applicables du fournisseur comptent aussi |

Un index local ne rend pas local une conversation distante. Les résultats d’outils peuvent contenir
du texte de document, des citations, des noms de fichiers et des chemins de projet. Ragmir conserve
le texte source sans le masquer.

## Avant que vos documents n’atteignent un modèle cloud

Le fournisseur reçoit ce que votre agent ou votre application envoie. Ragmir n’applique pas la
politique d’un fournisseur et ne rend pas les passages anonymes. Avant de connecter un modèle cloud,
vérifiez ces points pour l’offre et le compte que vous utilisez réellement :

- **Entraînement.** Le fournisseur peut-il entraîner ses modèles sur vos requêtes et sur les passages
  qu’elles contiennent, et un réglage ou votre offre modifie-t-il cela ? Les applications de chat
  grand public et les offres professionnelles ou API peuvent avoir des valeurs par défaut différentes.
- **Conservation.** Durée de conservation des requêtes, des sorties et des journaux, et possibilité
  pour votre compte d’une conservation plus courte, voire nulle.
- **Région.** Lieu de traitement et de stockage des données.
- **Accès.** Qui peut lire les passages : chez le fournisseur, mais aussi dans votre propre pile,
  par exemple les proxys et les outils de supervision.
- **Périmètre.** Quelles sources peuvent quitter votre environnement. Gardez les autres hors de la
  base, ou donnez-leur une base propre que seul un modèle local lit.

Rien de ce qui précède ne constitue un conseil juridique. Vérifiez vos obligations auprès de la
personne chargée de la conformité pour ces documents.

## Trois configurations qui fonctionnent

| Objectif | Recherche | Réponses | Ce qui quitte la machine |
| --- | --- | --- | --- |
| Entièrement hors ligne | `local-hash` ou un modèle sémantique installé | Ollama, fonctions cloud désactivées | Rien |
| Infrastructure privée | Ragmir sur votre serveur | Un modèle que vous hébergez, comme vLLM | Les passages vers votre propre point d’accès |
| Meilleur modèle, index local | Ragmir via le plugin ou MCP | Le modèle cloud de votre agent de code | Les passages que l’agent lit |

Le [guide RAG hors ligne](/fr/rag-hors-ligne/) couvre la première configuration, sans accès à
internet, et le [guide RAG auto-hébergé](/fr/rag-auto-heberge/) la deuxième, sur un VPS ou un serveur
sur site.

## Étapes suivantes

- [Créer un RAG local sur votre machine](/fr/rag-local/)
- [Exécuter un RAG sans accès à internet](/fr/rag-hors-ligne/)
- [RAG auto-hébergé sur un VPS ou un serveur sur site](/fr/rag-auto-heberge/)
- [Intégration d’agent : en local, auto-hébergée ou cloud](/docs/agent-integration/)
