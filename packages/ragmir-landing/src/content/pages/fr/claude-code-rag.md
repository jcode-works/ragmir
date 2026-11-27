---
title: "RAG avec Claude Code : grep ou index local, mesurés | Ragmir"
description: "Claude Code fait-il du RAG ? Il lit des fichiers avec grep. Nous mesurons sa première passe face au serveur MCP de Ragmir sur 89 questions, puis ajoutons un RAG."
h1: "Claude Code fait-il du RAG ? grep contre un index local"
summary: "Claude Code ne conserve aucun index de votre code. Il charge CLAUDE.md, puis cherche avec grep et find et lit les fichiers au fil de son travail. Sur 89 questions portant sur le dépôt de Ragmir, une première passe grep a classé les fichiers qui répondent à peu près aussi bien que le serveur MCP de Ragmir. L’agent a lu une médiane de 71 KiB pour en atteindre un, contre moins de 5 KiB via Ragmir."
section: guide
setup: agents
translationKey: "claude-code-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["integrations/claude-code", "rag-vs-mcp", "benchmarks", "agentic-rag"]
---

Claude Code trouve le contexte comme le ferait un développeur dans un terminal. Il liste les
fichiers, cherche des mots avec grep et ouvre ce qui semble pertinent. Cela fonctionne bien sur du
code dont les identifiants correspondent à la question.

Le RAG ajoute une liste courte, classée et citée avant toute ouverture de fichier. Cette page mesure
les deux premières passes sur les mêmes questions, puis montre comment ajouter Ragmir lorsque cette
liste en vaut la peine.

## Claude Code fait-il du RAG ?

Pas par défaut. Anthropic décrit Claude Code comme un système hybride. Les fichiers `CLAUDE.md` sont
« déposés naïvement dans le contexte dès le départ », et « les primitives comme glob et grep lui
permettent de naviguer dans son environnement et de récupérer les fichiers au moment où il en a
besoin, en contournant efficacement les problèmes d’index obsolètes et d’arbres syntaxiques
complexes » ([Effective context engineering for AI
agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
Anthropic, 29 septembre 2025).

La [référence des outils](https://code.claude.com/docs/en/tools-reference) ajoute deux précisions.
Sous macOS, Linux et WSL, Claude cherche avec `find` et `grep` via l’outil Bash, par défaut.
Sous Windows, les outils dédiés Glob et Grep, construits sur ripgrep, restent par défaut. Aucun
index d’embeddings n’est construit ni interrogé.

Cette conception a de vrais atouts. Rien ne devient obsolète, les identifiants exacts sont toujours
trouvés, et il n’y a rien à installer. Ses coûts apparaissent ailleurs : dans la quantité de texte
que lit l’agent, et dans ce qui se passe lorsque la réponse ne figure pas du tout dans le dépôt.

## RAG de Claude Code contre grep, mesuré

Nous avons posé les 89 questions de développeurs du jeu de questions public de Ragmir. Chacune liste
tous les fichiers qui y répondent. Nous les avons lancées sur les mêmes 287 fichiers suivis du dépôt
de Ragmir. Nous y avons ajouté 30 questions hors sujet et 40 questions proches du domaine,
auxquelles le dépôt ne répond pas.

Côté grep, on cherche chaque mot de la question d’au moins trois caractères, après retrait des mots
anglais courants. Les fichiers sont classés selon le nombre de ces mots qu’ils contiennent. On les
ouvre entiers, dans cet ordre, jusqu’à ce que l’un d’eux réponde.

Côté Ragmir, on lance le serveur MCP : une recherche par défaut, une seconde recherche à dix
résultats si nécessaire, puis une seule expansion de la citation qui répond. Les octets comptent le
texte que lit le modèle.

| Première passe | Réponse dans le top 3 | Réponse dans le top 10 | Médiane d’octets lus pour l’atteindre | Hors sujet refusé | Proche du domaine refusé |
| --- | ---: | ---: | ---: | ---: | ---: |
| ripgrep, mots de la question, fichiers lus en entier | 85% | 100% | 71.4 KiB | 2 sur 30 | 0 sur 40 |
| Ragmir MCP, `local-hash`, sans modèle | 82% | 99% | 4.7 KiB | 23 sur 30 | 7 sur 40 |
| Ragmir MCP, hybride avec `mxbai-embed-xsmall-v1` | 87% | 100% | 4.8 KiB | 28 sur 30 | 13 sur 40 |

Mesuré le 27 novembre 2026 au commit `10bb9f6`, avec le code de Ragmir 6.20.0, ripgrep 15.2.0,
Node.js 22 et un Apple M3 Max. La commande est `pnpm bench:first-pass`. La méthode est décrite dans
le [README des
benchmarks](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/benchmarks/README.md),
et le rapport brut se trouve dans
[first-pass-2026-11-27.json](/benchmarks/first-pass-2026-11-27.json).

<figure>
  <img src="/guides/first-pass-chart.webp" alt="Graphiques à barres comparant la première passe de grep et le serveur MCP de Ragmir sur 89 questions de développeurs. Réponse dans le top 3 : grep 85%, Ragmir local-hash 82%, Ragmir hybride 87%. Médiane du texte lu pour atteindre la réponse : grep 71.4 KiB, Ragmir 4.7 et 4.8 KiB. Questions hors sujet refusées sur 30 : grep 2, Ragmir 23 et 28." width="1440" height="1163" loading="lazy" decoding="async">
  <figcaption>Le même tableau sous forme de graphique : le classement est proche, mais le texte lu et les refus ne le sont pas.</figcaption>
</figure>

Ce que disent les chiffres :

- **Le classement est proche.** Sur un dépôt dont les questions partagent des mots avec ses
  fichiers, grep place un fichier qui répond dans le top 10 à chaque fois. Un index de recherche
  n’est pas nécessaire pour trouver le bon fichier ici.
- **Le coût en contexte, lui, ne l’est pas.** Atteindre la réponse a demandé une médiane de 71.4 KiB
  de résultats grep et de fichiers entiers. C’est environ quinze fois les 4.7 à 4.8 KiB de citations
  compactes et d’un passage développé. Sur une longue tâche, la différence correspond à la fenêtre
  de contexte que l’agent conserve pour le travail lui-même.
- **grep dit rarement « rien ici ».** 28 des 30 questions hors sujet ont tout de même trouvé des
  fichiers, que l’agent lirait avant de conclure. Ragmir n’a rien renvoyé pour 23 à 28 de ces 30
  questions.

La mesure a des limites. Elle porte sur un seul dépôt, des questions en anglais et des fichiers
texte uniquement. Elle suppose aussi un agent qui s’arrête au premier fichier qui répond.

grep ne peut pas chercher à l’intérieur des PDF ni des fichiers Office, dont le texte est compressé
ou stocké dans une disposition binaire. Ragmir en extrait le texte et cite la page, la diapositive
ou la cellule.

Lancez `rgr evaluate` avec vos propres questions avant de faire confiance à un chiffre sur votre
projet.

## Recherche agentique contre RAG

Ces deux approches ne s’excluent pas. Avec Ragmir connecté, Claude Code décide toujours de ce qu’il
cherche. Il appelle `ragmir_search` comme n’importe quel autre outil, puis développe la seule
citation sur laquelle il va s’appuyer. Il garde grep pour ce qu’il fait le mieux : lister toutes les
occurrences d’un identifiant ou trouver une expression régulière.

La recherche ne change que la première étape. Au lieu d’ouvrir des fichiers et de les lire, l’agent
lit une liste courte, classée et citée, puis ouvre un seul passage. Voir [RAG vs
MCP](/fr/rag-vs-mcp/) pour la manière dont le protocole et la recherche s’articulent, et [RAG
agentique](/fr/rag-agentique/) pour la boucle.

## Quand Claude seul suffit, et quand ajouter un RAG

Claude peut accéder à vos documents de trois manières. Elles ne conviennent pas aux mêmes besoins.

| | Claude Code seul | Un projet dans les applications Claude | Claude Code ou un chat avec Ragmir |
| --- | --- | --- | --- |
| Où se trouvent les documents | Votre dépôt, sur votre machine | Importés chez Anthropic | Sur votre machine ; seuls les passages lus par Claude en sortent |
| Comment le texte est trouvé | grep, puis fichiers entiers | Fichiers entiers, ou recherche dans les connaissances du projet quand elles dépassent la fenêtre de contexte | Un index local renvoie des passages classés et cités |
| PDF et fichiers Office | grep ne peut pas chercher à l’intérieur | Importés comme n’importe quel fichier | Recherchés comme du texte, cités à la page, à la diapositive ou à la cellule |
| Texte lu par réponse sur ce dépôt | Une médiane de 71.4 KiB | Non mesuré | Une médiane de 4.7 à 4.8 KiB |
| Questions auxquelles les documents ne répondent pas | grep a tout de même trouvé des fichiers pour 28 sur 30 | Non mesuré | Aucun résultat pour 23 à 28 sur 30 |

La colonne des applications Claude provient du centre d’aide d’Anthropic, consulté le 27 novembre
2026 : sur les offres payantes, un projet bascule automatiquement vers la recherche lorsque ses
connaissances approchent la fenêtre de contexte, et il peut contenir jusqu’à dix fois plus de
contenu ([RAG pour les
projets](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)).

**Utilisez Claude Code seul** pour un dépôt de code composé de fichiers texte dont les questions
emploient les mots du code, et chaque fois qu’il faut toutes les occurrences d’un identifiant. Il
n’y a rien à installer.

**Utilisez un projet dans les applications Claude** pour discuter de documents que vous pouvez
importer chez Anthropic, sur une offre payante, sans rien configurer.

**Ajoutez Ragmir** lorsque les documents sont des PDF, des fichiers Office ou des scans, lorsqu’ils
doivent rester sur votre machine, lorsque vous avez besoin d’une citation vérifiable à la ligne ou à
la page, ou lorsque plusieurs agents et applications doivent partager un même index. Avec un modèle
local à la place de Claude, rien ne quitte la machine : voir [RAG local ou
cloud](/fr/rag-local-ou-cloud/).

## Comment ajouter un RAG à Claude Code

Installez le plugin, puis indexez chaque projet une fois :

```text
/plugin install ragmir --marketplace jcode-works/ragmir
/ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
```

Depuis un terminal, ces deux commandes effectuent la même installation :

```bash
claude plugin marketplace add jcode-works/ragmir
claude plugin install ragmir@ragmir
```

Avec Claude Code 2.1.329, elles ont affiché `✔ Successfully installed plugin: ragmir@ragmir (scope: user)`.

Le plugin exécute, sur le projet ouvert, une version épinglée de Ragmir publiée sur npm, sans compte
ni clé API. La [page d’intégration Claude Code](/fr/integrations/claude-code/) décrit la
configuration sans le plugin, la fraîcheur de l’index et les limites.

## Codex et Cursor

Le même index sert les autres agents de code. Codex installe le plugin avec :

```bash
codex plugin marketplace add jcode-works/ragmir
codex plugin add ragmir@ragmir
```

Cursor accepte le dossier du plugin tant qu’il n’est pas référencé dans sa marketplace.

Les deux lancent le même serveur MCP : les chiffres ci-dessus valent donc aussi pour leur première
passe. Voir les pages [Codex](/fr/integrations/codex/) et [Cursor](/fr/integrations/cursor/).

## Étapes suivantes

- [Ajouter le plugin à Claude Code](/fr/integrations/claude-code/)
- [Tous les benchmarks et comment les relancer](/fr/benchmarks/)
- [RAG vs MCP : protocole et recherche](/fr/rag-vs-mcp/)
- [Guide d’intégration des agents](/docs/agent-integration/)
