---
title: "RAG pour incidents : diagnostic sourcé, puis correctif | Ragmir"
description: "Ancrez un correctif d’astreinte dans vos runbooks, post-mortems et code : Claude Code ou Codex diagnostique avec citations Ragmir, puis corrige et ajoute un test."
h1: "Diagnostiquer à partir de vos runbooks, puis corriger avec un test"
summary: "Indexez une fois vos runbooks, vos rapports d’incidents passés et votre code source. Quand un incident se déclenche, votre agent de code le diagnostique à partir de ces documents, cite chaque source, et seulement ensuite modifie le code et ajoute un test. Ragmir trouve et cite ; l’agent raisonne et modifie."
section: use-case
setup: agents
translationKey: "use-cases/incident-response"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "integrations/claude-code", "integrations/codex", "rag-citations"]
---

À 3 h du matin, le paiement expire. La réponse est souvent déjà écrite : une étape de runbook, un
post-mortem de la dernière fois, un commentaire dans le code qui appelle le service de paiement.
Ragmir permet à votre agent de code de retrouver ces pages et de les citer avant de toucher au code
de production.

## Ce qui entre dans la base

- **Runbooks et guides d’astreinte** en Markdown, cités à la ligne.
- **Post-mortems et rapports d’incidents** en Markdown, Word ou PDF, cités à la ligne ou à la page.
- **Notes d’architecture et ADR**, pour que l’agent sache pourquoi un délai d’attente ou une
  nouvelle tentative existe.
- **Code source et configuration**, cités à la ligne, dans les langages et formats que Ragmir lit.
- **Journaux exportés et règles d’alerte** que vous choisissez de garder, comme des fichiers `.log`,
  `.json` ou `.yaml`.

Ragmir indexe plus de 900 types de fichiers ; la liste des
[formats pris en charge](/docs/supported-formats/) les donne tous. Les identifiants, les fichiers
`.env` et les clés n’atteignent jamais l’index.

## Préparer le dossier

Lancez ces commandes dans le dépôt, ou dans un dossier qui contient les runbooks à côté :

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "docs/runbooks/**" "docs/postmortems/**" "src/**"
npx rgr ingest
```

Connectez ensuite votre agent. Les pages [Claude Code](/fr/integrations/claude-code/) et
[Codex](/fr/integrations/codex/) expliquent comment chacun lance le serveur MCP de Ragmir sur votre
machine. Les skills ci-dessous apprennent à l’agent la boucle de recherche, de développement et
d’affinage :

```bash
npx skills add jcode-works/ragmir
```

L’ingestion est incrémentale. Relancez `npx rgr ingest` après chaque post-mortem ajouté : il ne lit
que les fichiers nouveaux ou modifiés.

## Diagnostiquer avec des citations, puis corriger

Donnez à l’agent le symptôme, ainsi que la règle selon laquelle le correctif attend le diagnostic :

```prompt
Les requêtes de paiement expirent depuis le dernier déploiement. Avant de modifier le moindre code, cherchez dans les runbooks, les post-mortems passés et le client de paiement. Citez chaque source sur laquelle vous vous appuyez.

Cette panne s’est-elle déjà produite ? Qu’a changé le post-mortem, et ce changement est-il toujours dans le code ?

Proposez le correctif, nommez le passage cité qui le justifie, puis implémentez-le et ajoutez un test.
```

L’agent recherche, développe les passages dont il a besoin avec `ragmir_expand`, et cite chacun
d’eux. Lorsque les documents ne contiennent aucune preuve, Ragmir ne renvoie rien et l’agent le dit,
au lieu de deviner à partir du seul symptôme. Un passage marqué `weakEvidence` mérite un second
regard.

Vous pouvez aussi lancer vous-même la même recherche :

```bash
npx rgr search "délai dépassé paiement checkout" --compact
```

## Garder le runbook fiable

Un incident est aussi un test de vos documents. Si l’agent a dû répondre « aucune preuve », c’est
que le runbook présente une lacune. Rédigez l’étape manquante une fois l’incident clos, puis
relancez l’ingestion.

- L’agent peut lister ce qui a changé depuis la dernière session avec `ragmir_sources` et
  `changedSince`.
- `rgr audit` compare vos sources à l’index et liste les fichiers manquants, obsolètes ou ignorés.
- Le prompt `answer` du serveur MCP de Ragmir demande une citation pour chaque affirmation, et une
  déclaration claire lorsque les documents ne contiennent aucune preuve.

## Rester en local, ou utiliser une IA dans le cloud

Dans les deux cas, l’index reste sur votre machine. Claude Code et Codex envoient au modèle de leur
fournisseur les passages qu’ils lisent. Les runbooks et le code peuvent nommer des hôtes internes,
des clients ou des incidents : choisissez donc avec soin les dossiers qui entrent dans la base. Le
[guide local ou cloud](/fr/rag-local-ou-cloud/) liste les points à vérifier : entraînement,
conservation, région, accès et périmètre.

## Limites

- Ragmir ne surveille pas vos systèmes. Il lit des documents, et non des métriques, des traces ou
  des tableaux de bord en direct. Collez ou exportez les données dont l’agent a besoin.
- Les passages récupérés peuvent être incomplets. L’agent doit vérifier que le fait dont il a besoin
  y figure.
- L’agent rédige le correctif et le test. Relisez le diff et lancez les vérifications avant de
  déployer.
- Ragmir n’alerte personne, n’exécute aucune commande en production et ne clôt pas l’incident.

## Étapes suivantes

- [Claude Code avec Ragmir](/fr/integrations/claude-code/)
- [Codex avec Ragmir](/fr/integrations/codex/)
- [Citations RAG : ligne, page, diapositive et cellule](/fr/rag-citations/)
- [RAG local ou cloud : modèles, matériel et vos données](/fr/rag-local-ou-cloud/)
