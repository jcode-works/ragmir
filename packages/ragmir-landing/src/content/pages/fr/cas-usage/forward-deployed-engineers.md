---
title: "RAG sur site pour les forward deployed engineers | Ragmir"
description: "Livrez un RAG sur les documents d’un client, dans son réseau : indexation sur ses serveurs, preuve avec rgr evaluate, puis remise de la CLI et des images Docker."
h1: "RAG pour les forward deployed engineers, dans le périmètre du client"
summary: "Indexez les documents du client sur sa propre infrastructure, mesurez la recherche sur ses questions avant que quiconque ne s’appuie sur les réponses, et laissez derrière vous une CLI et une image Docker figées, ainsi qu’une configuration versionnée. L’application du client garde l’interface, l’authentification et les accès par utilisateur."
section: use-case
setup: agents
translationKey: "use-cases/forward-deployed-engineers"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "air-gapped-rag", "rag-citations", "local-rag"]
---

Ragmir couvre la partie recherche de la mise en production d’un RAG sur les documents d’un client,
dans le périmètre de ce client.

L’analyse, les embeddings, l’index et la recherche s’exécutent dans un seul processus Node.js sur la
machine du client. Il n’y a ni API d’embeddings, ni base vectorielle, ni télémétrie, ni stockage
hébergé à déclarer dans une revue de sécurité.

Le service ou l’agent du client conserve le modèle, l’interface utilisateur et les règles d’accès.

## De la démo sur portable au serveur du client

Commencez par une démo citée sur un portable, puis exécutez le même `ragmir.config.json` sur le
serveur du client. Linux, macOS et Windows sont testés à chaque version.

Les conteneurs Debian ou Alpine exécutent Ragmir en utilisateur non root, avec un système de
fichiers racine en lecture seule et sans réseau.

- Pointez `storageDir` vers un volume persistant, et montez les documents en lecture seule.
- `local-hash` n’a besoin d’aucun modèle et n’effectue aucun appel réseau. Préparez d’abord un
  modèle sémantique ou des moteurs OCR lorsque les questions ou les numérisations l’exigent
  ([RAG en réseau isolé](/fr/rag-hors-ligne/)).
- Relisez la configuration, puis approuvez ses commandes et ses points d’accès :

  ```bash
  rgr trust --yes
  ```

  Dans une image que vous construisez et relisez vous-même, définissez plutôt
  `RAGMIR_TRUST_PROJECT_CONFIG=1`.

- Vérifiez la couverture avant de faire confiance au corpus. L’audit liste les fichiers ignorés et
  la raison de leur exclusion :

  ```bash
  rgr audit --unsupported
  ```

Le [guide du RAG auto-hébergé](/fr/rag-auto-heberge/) contient les commandes de conteneur et une
liste de contrôle du déploiement.

## Prouver la qualité de la recherche avant la production

Mesurez la recherche sur les propres questions du client avant que quiconque ne s’appuie sur les
réponses.

Commencez par réunir 20 à 50 questions réelles. Prenez-les chez les utilisateurs, dans les tickets
ou les sessions d’agent, et formulez-les comme les gens les posent, et non comme des copies de
titres.

Ajoutez des négatifs difficiles. Ce sont des questions plausibles auxquelles les documents ne
répondent pas, y compris des questions du même domaine qui partagent le vocabulaire sans contenir le
fait recherché. Ragmir ne doit rien renvoyer pour elles.

Gardez le fichier golden sous `.ragmir/` lorsque les questions elles-mêmes sont confidentielles.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    {
      "query": "How long do we keep invoices?",
      "relevanceJudgments": [{ "kind": "path", "value": "policies/retention.pdf", "relevance": 3 }]
    },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
rgr evaluate --golden ragmir.golden.json          # exits with status 1 when a threshold fails
rgr evaluate --golden ragmir.golden.json --json   # adds gates, per-category groups, and fingerprints
rgr evaluate --golden ragmir.golden.json --baseline before.json   # signed change per metric
```

<figure>
  <img src="/guides/evaluate-offline.webp" alt="Terminal exécutant rgr evaluate dans l’image officielle 6.20.0 avec --network none, sur un fichier golden de huit questions. Recall@5 vaut 1.000, mais falsePositiveRate vaut 1.000 : le seuil maximumFalsePositiveRate échoue, et les deux négatifs difficiles listent les fichiers qu’ils ont renvoyés." width="1440" height="1523" loading="lazy" decoding="async">
  <figcaption>Exécution réelle sur un corpus de démonstration de onze guides Markdown et un PDF. Chaque question à laquelle on peut répondre trouve son fichier dans le top 5, mais les deux négatifs difficiles renvoient des passages : le contrôle des faux positifs échoue et la commande se termine avec le statut 1. C’est le cas à corriger avant que quiconque ne s’appuie sur les réponses.</figcaption>
</figure>

Le rapport couvre Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, le taux de citations exactes, le
taux de faux positifs sur les négatifs difficiles, ainsi que les latences p50 et p95. Il s’appuie sur
l’index local : toute la mesure reste donc dans le périmètre.

Quand un cas échoue, deux commandes aident :

```bash
rgr search "<query>" --explain --top-k 10
rgr preview --path <file> --json
```

La première affiche le rang vectoriel et le rang par mots-clés de chaque résultat. La seconde montre
comment le fichier attendu a été découpé en fragments.

Modifiez un seul réglage à la fois, et comparez-le à la référence. Ne gardez une modification que si
le rapport s’améliore sans nouveaux faux positifs. Ne modifiez jamais les attentes, et n’abaissez
jamais les seuils pour faire passer une modification.

Une suite est retenue pour vérification lorsqu’elle remplit toutes ces conditions :

- au moins 100 cas
- pertinence graduée
- citations exactes
- négatifs difficiles
- tous les seuils atteints

Une suite réussie enregistre une empreinte dans l’index. `rgr doctor --deep` signale alors la qualité
de recherche comme vérifiée, tant que le fichier golden, le corpus, la révision du modèle, le profil
de recherche et la politique d’index restent identiques.

La même commande `rgr evaluate` contrôle la CI après `rgr ingest`.

## Remettre la CLI et les images

- **Une version figée.** Le paquet npm dans le fichier de verrouillage du client, ou une étiquette
  d’image exacte, comme `ghcr.io/jcode-works/ragmir:6.20.0` (`6.20.0-full` ajoute le runtime
  sémantique et l’OCR).
- **Une seule configuration versionnée.** `ragmir.config.json` est livré avec le déploiement, afin
  que l’équipe suivante hérite des mêmes sources et réglages. L’index, les modèles et les documents
  restent hors de Git.
- **Santé et diagnostic.** `rgr status --json` indique `ready`, le nom de la base et le nombre de
  fichiers indexés ; `rgr doctor` vérifie la fraîcheur et la configuration, et liste les étapes
  suivantes.
- **Mises à niveau sûres.** Commencez par la vérification de mise à niveau. Les mises à niveau
  conservent le dernier index validé jusqu’à ce que son remplacement réussisse : une réparation ne
  commence donc jamais par la suppression de `.ragmir/storage/`.

  ```bash
  rgr upgrade --check
  ```

- **Skills d’agent.** Installez, entre autres, les skills d’installation et d’évaluation pour les
  propres agents du client :

  ```bash
  npx skills add jcode-works/ragmir
  ```

## Ce qui reste à la charge de l’application du client

- **Pas d’interface utilisateur.** Ragmir renvoie des citations vers une ligne, une page, une
  diapositive, une cellule ou une section. Il ne rend pas les documents et n’affiche pas d’aperçus
  surlignés : ouvrir la page citée relève de l’application du client.
- **Pas d’authentification ni de contrôle d’accès par utilisateur.** Ragmir n’a pas de serveur HTTP
  et ne connaît pas les utilisateurs. L’hôte gère le TLS, l’authentification, l’autorisation et les
  limites de débit. Donnez à chaque public sa propre base, et vérifiez les droits d’accès avant
  d’appeler `search`.
- **Pas de modèle.** La génération est confiée au modèle choisi par l’application : local,
  auto-hébergé, ou fourni par un prestataire qui reçoit les passages qui lui sont envoyés.
- **Aucune revendication de conformité.** Les citations exactes, le choix explicite des sources et
  les rapports d’évaluation favorisent la traçabilité. Ils ne suffisent pas, à eux seuls, à rendre un
  système conforme au RGPD ou à l’AI Act européen, et rien de tout cela ne constitue un conseil
  juridique.

Ragmir est un logiciel libre sous AGPL-3.0-only. JCode Works propose aussi une licence commerciale
pour les usages que l’AGPL ne couvre pas, comme l’intégration de Ragmir dans un logiciel propriétaire
ou dans un service hébergé.

## Étapes suivantes

- [RAG auto-hébergé et sa liste de contrôle de déploiement](/fr/rag-auto-heberge/)
- [RAG en réseau isolé, sans accès à internet](/fr/rag-hors-ligne/)
- [Référence CLI, y compris la qualité de recherche](/docs/cli-reference/)
- [Le skill `ragmir-evaluate`](https://github.com/jcode-works/ragmir/blob/main/skills/ragmir-evaluate/SKILL.md)
