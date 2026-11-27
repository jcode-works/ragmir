---
title: "RAG pour l’emploi : lettres citant vos preuves | Ragmir"
description: "Indexez vos CV, bilans annuels et rapports de projet, rapprochez une offre de vos preuves et rédigez des lettres sans rien inventer, chaque affirmation citée."
h1: "Recherche d’emploi avec RAG : confronter une offre à vos preuves, sans rien inventer"
summary: "Indexez tous vos CV, bilans annuels et rapports de projet. Confrontez ensuite une offre d’emploi à vos propres preuves, et rédigez une lettre de motivation où chaque affirmation renvoie à la page dont elle provient. Ragmir trouve et cite ; l’assistant rédige, et vous décidez de ce qui part."
section: use-case
setup: local
translationKey: "use-cases/job-search"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "use-cases/youtube-research"]
---

Une bonne lettre de motivation est précise : un résultat, un projet, un chiffre tiré de votre
dernier bilan. Au fil des années, ces preuves se retrouvent dispersées entre d’anciens CV, des
bilans et des rapports. Ragmir les indexe au même endroit : un assistant peut ainsi choisir les
preuves qui correspondent à une offre et citer leur origine.

## Ce qui entre dans la base

- **Chaque version de votre CV**, en PDF ou Word, citée à la page ou au passage.
- **Bilans annuels et retours** de vos employeurs, cités à la page.
- **Rapports de projet, présentations et comptes rendus** que vous avez rédigés, cités à la page, à
  la diapositive ou à la ligne.
- **Anciennes lettres de motivation et notes de candidature** en Markdown ou Word.
- **Attestations, références et liste de compétences** que vous conservez.

Ragmir indexe plus de 900 types de fichiers ; la liste des
[formats pris en charge](/docs/supported-formats/) les donne tous. Les scans et les images
nécessitent l’OCR local facultatif.

## Préparer le dossier

Rangez les documents dans un seul dossier, ajoutez-le comme source et construisez l’index. Cela
nécessite Node.js 22.12 ou une version plus récente :

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "career/**"
npx rgr ingest
```

Pour les documents scannés, vérifiez le moteur OCR local, puis configurez-le :

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

Enregistrez chaque offre d’emploi sous forme de fichier texte, Markdown ou PDF dans le dossier, ou
collez-la dans le chat. Relancez `npx rgr ingest` lorsque vous ajoutez des documents : il ne lit que
les fichiers nouveaux ou modifiés.

## Rapprocher l’offre, puis rédiger avec des citations

Demandez à l’assistant de travailler uniquement à partir de vos preuves. Par exemple :

```prompt
Voici une offre d’emploi. Listez ses cinq exigences principales. Pour chacune, trouvez la preuve dans mes documents et citez la page. Dites-moi pour lesquelles je n’ai aucune preuve.

Rédigez une lettre de motivation en n’utilisant que des affirmations que vous pouvez citer. Placez la citation après chaque affirmation, et n’ajoutez ni compétence, ni résultat, ni date que mes documents n’indiquent pas.

Lesquels de mes bilans annuels mentionnent le travail en équipe ? Citez le passage et sa source.
```

Vous pouvez lancer la même recherche à la main :

```bash
npx rgr search "résultats du projet de migration" --compact
```

Lorsque les documents ne contiennent aucune preuve, Ragmir ne renvoie rien. Une exigence sans
passage cité est une lacune à signaler honnêtement au recruteur, et non à combler. Un passage marqué
`weakEvidence` mérite un second regard. Le serveur MCP de Ragmir fournit aussi un prompt `answer`
qui demande une citation pour chaque affirmation.

## Modèle local ou assistant cloud

Les documents de carrière sont privés : les bilans contiennent des appréciations, les CV vos
coordonnées. Un modèle local via Ollama est le choix le plus sûr, car rien ne quitte votre machine.
Le [tutoriel RAG local](/fr/rag-local/) présente la configuration, y compris la désactivation des
fonctions cloud d’Ollama.

Un assistant cloud fonctionne aussi. Il reçoit les passages qu’il lit, et non tout le dossier, et la
politique de son fournisseur s’applique alors. Vérifiez l’entraînement, la conservation, la région,
l’accès et le périmètre dans le [guide local ou cloud](/fr/rag-local-ou-cloud/) avant d’en connecter
un.

## Limites

- L’assistant rédige, vous décidez. Vérifiez chaque page citée avant d’envoyer une lettre.
- Ragmir ne pose pas de candidature, ne remplit pas de formulaires et n’envoie pas de courriels. Il
  ne lit pas non plus les sites d’offres d’emploi.
- Il ne donne aucun conseil de carrière, juridique ou RH, et ne peut pas juger de votre adéquation à
  un poste.
- La lettre ne vaut que ce que valent vos documents : des preuves minces donnent une lettre courte.
- L’OCR peut mal lire un scan. Comparez la page citée avec l’original.

## Étapes suivantes

- [Tutoriel RAG local : documents, Ollama et CPU uniquement](/fr/rag-local/)
- [RAG local ou cloud : modèles, matériel et vos données](/fr/rag-local-ou-cloud/)
- [Citations RAG : ligne, page, diapositive et cellule](/fr/rag-citations/)
- [Formats pris en charge](/docs/supported-formats/)
