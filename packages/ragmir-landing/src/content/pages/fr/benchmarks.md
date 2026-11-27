---
title: "Benchmarks de recherche RAG que vous pouvez relancer | Ragmir"
description: "La recherche de Ragmir mesurée sur son dépôt public face à grep, LangChain.js, Orama et MiniSearch : méthode, résultats datés, rapports bruts et commandes."
h1: "Benchmarks de recherche RAG que vous pouvez relancer"
summary: "Sur 89 questions de développeurs portant sur le dépôt public de Ragmir, le code de Ragmir 6.20.0 place un fichier qui répond dans le top 10 pour 99 à 100% d’entre elles, et ne renvoie rien pour 23 à 28 des 30 questions hors sujet. Une première passe grep d’un agent de code classe les fichiers à peu près aussi bien, mais lit une médiane de 71 KiB pour atteindre une réponse, contre moins de 5 KiB via Ragmir. Mesuré le 27 novembre 2026."
section: benchmark
setup: agents
translationKey: "benchmarks"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "rag-without-vector-database", "case-studies/ragmir-repository"]
highlights:
  - value: "99–100%"
    label: "des 89 questions de développeurs obtiennent un fichier de réponse dans le top 10"
  - value: "4.7 KiB"
    label: "médiane de texte lu par un agent pour atteindre la réponse, contre 71.4 KiB avec grep"
  - value: "28 sur 30"
    label: "questions hors sujet sans résultat avec le modèle hybride, 23 sans modèle"
  - value: "17.3 ms"
    label: "recherche médiane sans modèle, et 19.1 ms avec le modèle hybride"
---

Sur les questions de ce dépôt, Ragmir trouve un fichier qui répond à peu près aussi souvent que
grep. Il lit beaucoup moins de texte pour y parvenir, et il ne renvoie rien pour la plupart des
questions hors sujet.

Les benchmarks ne mesurent que la couche de recherche. Ils vérifient :

- si un fichier qui répond à une question remonte, et à quel rang ;
- si les questions auxquelles les sources ne peuvent pas répondre ne renvoient rien ;
- combien de temps dure une recherche ;
- quelle quantité de texte un agent lit pour atteindre la réponse.

Ils ne notent ni les réponses qu’un modèle rédige, ni les actions qu’un agent accomplit.

Chaque chiffre ci-dessous a été mesuré le 27 novembre 2026 au commit `10bb9f6`, qui contient le code
Core de Ragmir 6.20.0. La machine était un Apple M3 Max unique, avec Node.js 22. Chaque chiffre
renvoie à son rapport brut.

## Les questions et les fichiers

Les deux benchmarks indexent les mêmes 287 fichiers suivis par Git dans le dépôt de Ragmir. Ils
incluent la documentation, le code source Core, les skills, les sources et messages du site, ainsi
que les scripts. Les questions sont publiques dans
[`repository-questions.json`](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/fixtures/repository-questions.json) :

- **89 questions de développeurs**, chacune accompagnée de la liste de tous les fichiers qui y
  répondent.
- **30 questions hors sujet** sur le sport, la cuisine, la météo ou des formules absurdes, qui ne
  doivent renvoyer aucun résultat.
- **40 questions proches du domaine** qui associent le vocabulaire du projet à une intégration, un
  service ou un format qu’il n’a pas, comme ses paquets Chat et TTS retirés. Elles ne doivent pas
  non plus renvoyer de résultat.

Une question compte comme trouvée dans le top 3 ou le top 10 lorsqu’un de ses fichiers apparaît dans
ce rang.

MRR@10 est la moyenne des rangs réciproques du premier fichier qui répond, parmi les 10 premiers
résultats. Un refus correspond à un résultat vide.

## La première passe d’un agent de code : grep ou Ragmir

`pnpm bench:first-pass` compare la manière dont un agent atteint un fichier qui répond.

Côté grep :

1. Il cherche avec ripgrep, sans tenir compte de la casse, chaque mot de la question d’au moins
   trois caractères, après retrait des mots anglais courants.
2. Il classe les fichiers selon le nombre de ces mots qu’ils contiennent, puis selon le nombre
   d’occurrences.
3. Il ouvre les fichiers entiers jusqu’à ce que l’un d’eux réponde.

Côté Ragmir, le serveur MCP tourne dans une nouvelle session pour chaque question :

1. Il lance la recherche par défaut.
2. Il relance une recherche à dix résultats si la première ne contient aucun fichier qui répond.
3. Il développe une fois la citation qui répond.

Les octets comptent le texte que lit le modèle de l’agent.

| Première passe | Réponse dans le top 3 | Réponse dans le top 10 | Réponse atteinte | Médiane d’octets lus pour l’atteindre | Hors sujet refusé | Proche du domaine refusé |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ripgrep 15.2.0, mots de la question, fichiers lus en entier | 85% | 100% | 89 sur 89 | 71.4 KiB | 2 sur 30 | 0 sur 40 |
| Ragmir MCP, `local-hash` sans modèle | 82% | 99% | 88 sur 89 | 4.7 KiB | 23 sur 30 | 7 sur 40 |
| Ragmir MCP, hybride avec `mxbai-embed-xsmall-v1` | 87% | 100% | 89 sur 89 | 4.8 KiB | 28 sur 30 | 13 sur 40 |

Rapport brut : [first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

<figure>
  <img src="/guides/first-pass-chart.webp" alt="Graphiques à barres comparant la première passe de grep et le serveur MCP de Ragmir sur 89 questions de développeurs. Réponse dans le top 3 : grep 85%, Ragmir local-hash 82%, Ragmir hybride 87%. Médiane du texte lu pour atteindre la réponse : grep 71.4 KiB, Ragmir 4.7 et 4.8 KiB. Questions hors sujet refusées sur 30 : grep 2, Ragmir 23 et 28." width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>Le tableau de première passe ci-dessus, tracé à l’échelle.</figcaption>
</figure>

Sur ce dépôt, les questions partagent des mots avec les fichiers : grep classe donc aussi bien qu’un
index. La différence tient au contexte que dépense l’agent, et au fait qu’une question sans réponse
se termine ou non par un résultat vide. [RAG avec Claude Code](/fr/claude-code-rag/) explique ce que
cela implique pour les agents de code.

## Contre d’autres piles de recherche

`pnpm bench:competitors` fait passer les mêmes questions dans des bibliothèques TypeScript de
recherche locale.

Chaque variante vectorielle utilise la fonction d’embedding de Ragmir avec `mxbai-embed-xsmall-v1`,
afin que modèles, préfixes et vecteurs soient identiques. Les autres piles lisent les mêmes
fichiers, découpés par `RecursiveCharacterTextSplitter` de LangChain (1 000 caractères, 200
caractères de recouvrement, 4 365 fragments).

Orama s’exécute avec sa similarité hybride par défaut de 0.8, et avec 0.1, qui laisse sa partie
vectorielle classer. La recherche médiane est la médiane de recherches séquentielles à chaud, dans
un même processus.

| Système | Réponse dans le top 3 | Réponse dans le top 10 | MRR@10 | Hors sujet refusé | Proche du domaine refusé | Recherche médiane |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Ragmir**, hybride avec `mxbai-embed-xsmall-v1` | **87%** | **100%** | 0.658 | **28** sur 30 | **13** sur 40 | 19.1 ms |
| **Ragmir**, `local-hash` sans modèle | **82%** | **99%** | **0.675** | **23** sur 30 | **7** sur 40 | 17.3 ms |
| Découpage LangChain.js avec recherche cosinus exacte, en `MemoryVectorStore` | 70% | 93% | 0.581 | 0 sur 30 | 0 sur 40 | 6.5 ms |
| Orama hybride, similarité par défaut de 0.8 | 14% | 20% | 0.102 | 2 sur 30 | 0 sur 40 | 8.5 ms |
| Orama hybride, similarité de 0.1 | 35% | 71% | 0.303 | 0 sur 30 | 0 sur 40 | 9.9 ms |
| MiniSearch BM25 | 74% | 98% | 0.596 | 2 sur 30 | 0 sur 40 | 1.5 ms |

Rapport brut : [competitors-2026-11-27.json](/benchmarks/competitors-2026-11-27.json).

<figure>
  <img src="/guides/competitors-chart.webp" alt="Graphiques à barres comparant Ragmir à d’autres bibliothèques de recherche locale sur 89 questions de développeurs et 30 questions hors sujet. Réponse dans le top 3 : Ragmir hybride 87%, Ragmir local-hash 82%, MiniSearch BM25 74%, magasin en mémoire LangChain.js 70%, Orama similarité 0.1 35%, Orama par défaut 14%. Questions hors sujet refusées sur 30 : 28, 23, 2, 0, 0 et 2. Recherche médiane : 19.1, 17.3, 1.5, 6.5, 9.9 et 8.5 ms." width="1440" height="1703" loading="lazy" decoding="async">
  <figcaption>Le tableau ci-dessus, tracé à l’échelle : les bibliothèques cherchent plus vite, mais Ragmir classe mieux les réponses et ne renvoie rien pour la plupart des questions hors sujet.</figcaption>
</figure>

Les bibliothèques en mémoire répondent plus vite. Elles renvoient aussi des résultats pour presque
toutes les questions hors sujet, et aucune ne place aussi souvent un fichier qui répond dans le top
3.

## Résultats sur des corpus privés

La page d’accueil cite la mesure du mainteneur sur un monorepo privé en Java et TypeScript. Elle
provient de la [section benchmarks du
README](https://github.com/jcode-works/ragmir/blob/main/README.md#benchmarks).

La mesure utilisait Ragmir 6.5 le 1er novembre 2026, sur le même Apple M3 Max avec Node.js 24,
LanceDB 0.30 et le profil de recherche `quality`. Les corpus étant privés, vous ne pouvez pas
relancer ces deux lignes. La méthode est la même, et `rgr evaluate` l’applique à vos propres
documents.

| Corpus | Embeddings | Réponse dans le top 3 | Réponse dans le top 10 | Hors sujet refusé | Proche du domaine refusé | Recherche médiane |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Monorepo Java et TypeScript avec fichiers Office et scans : 2 325 fichiers, 30 171 fragments, 101 questions de développeurs | `multilingual-e5-base` | 77% | 94% | 22 sur 30 | 11 sur 30 | 36 ms |
| Documentation produit en français et en anglais : 299 fichiers, 21 011 fragments, 60 questions | `mxbai-embed-xsmall` | 100% | 100% | 23 sur 30 | 9 sur 30 | 26 ms |

## Reproduire la mesure

Depuis une copie du dépôt Ragmir au commit `10bb9f6`, à sa racine :

```bash
pnpm install --frozen-lockfile
pnpm bench:first-pass -- --model-path /path/to/models
pnpm bench:competitors -- --model-path /path/to/models
```

`bench:first-pass` nécessite ripgrep (`rg`) dans le chemin d’exécution. Les variantes vectorielles
nécessitent `mxbai-embed-xsmall-v1` déjà présent au chemin du modèle. Les benchmarks n’utilisent
Transformers qu’avec un modèle local, et les téléchargements de modèles distants restent désactivés.

Chaque exécution écrit son rapport sous `packages/ragmir-core/benchmarks/.results/`. Le rapport
contient le commit, la machine, les versions d’exécution et chaque métrique.

Le [guide des
benchmarks](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md)
décrit les deux méthodes et les autres harnais (portail de qualité, passage à l’échelle, index
vectoriel, analyseurs), avec les règles de validation que chacun applique. `pnpm bench:quality` est
un portail de non-régression, et non un résultat : ses moyennes ne sont donc pas reprises ici.

## Mesurer votre propre corpus

Ces chiffres décrivent un dépôt public, et non vos documents. `rgr evaluate` effectue la même mesure
sur vos fichiers.

Un fichier golden liste de vraies questions avec les fichiers qui y répondent. Il liste aussi des
questions `answerable: false` qui doivent ne rien renvoyer.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
npx rgr evaluate --golden ragmir.golden.json
npx rgr evaluate --golden ragmir.golden.json --baseline before.json
```

Le rapport donne Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, le taux de citations exactes et le
taux de faux positifs sur les négatifs difficiles.

Un seuil non atteint termine la commande avec le statut 1, si bien que la même commande peut
contrôler une tâche CI. `--baseline` affiche la variation signée de chaque métrique par rapport à un
rapport `--json` antérieur.

## Limites

- Tout a été exécuté sur une seule machine, un Apple M3 Max.
- Les lignes reproductibles utilisent un seul corpus public, le dépôt de Ragmir lui-même, en
  anglais, avec des fichiers texte uniquement. Mesurez la version que vous installez sur vos propres
  documents.
- L’agent de la première passe s’arrête au premier fichier qui répond. Un agent réel peut lire
  davantage, ou moins.
- Les questions proches du domaine restent le cas le plus difficile. Avec un modèle, 27 sur 40
  renvoient encore des passages.
- Les deux corpus privés ci-dessus sont décrits, mais non publiés, et ont été mesurés avec Ragmir
  6.5.

## Étapes suivantes

- [RAG avec Claude Code : grep contre un index local](/fr/claude-code-rag/)
- [RAG sans base vectorielle](/fr/rag-sans-base-vectorielle/)
- [Comment le dépôt de Ragmir utilise Ragmir lui-même](/fr/etude-de-cas/depot-ragmir/)
- [Référence CLI, dont `rgr evaluate`](/docs/cli-reference/)
