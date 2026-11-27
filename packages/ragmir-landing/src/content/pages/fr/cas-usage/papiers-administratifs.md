---
title: "RAG privé pour vos papiers : IA locale, preuve à la page | Ragmir"
description: "Indexez relevés, bulletins de paie, contrats et avis d’imposition sur votre ordinateur. Un modèle local répond et indique la page exacte, sans rien envoyer ailleurs."
h1: "Gérez vos papiers avec une IA locale qui indique la page exacte"
summary: "Gardez relevés bancaires, bulletins de paie, contrats, attestations et avis dans un seul dossier sur votre ordinateur. Ragmir les indexe sur place, et un modèle local comme Ollama répond à vos questions ou constitue un dossier en citant la page exacte comme preuve. Aucun document n’est envoyé à un service cloud."
section: use-case
setup: local
translationKey: "use-cases/paperwork"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "air-gapped-rag"]
---

Les démarches administratives posent sans cesse les mêmes questions. Quels bulletins de paie
prouvent mes revenus ? Que dit le contrat sur le préavis ? Où est l’avis d’imposition de l’an
dernier ? Les réponses figurent dans des PDF que vous avez scannés ou téléchargés, et ces documents
sont privés. Ragmir les indexe sur votre machine : un modèle local peut ainsi répondre et montrer la
page.

## Ce qui entre dans la base

- **Relevés bancaires, bulletins de paie et factures** en PDF, cités à la page.
- **Contrats, polices d’assurance et baux** en PDF ou Word, cités à la page ou au passage.
- **Attestations, avis d’imposition et courriers** en PDF, ou sous forme de photos et de scans
  traités par OCR local.
- **Vos tableurs**, comme un budget dans Excel, cités à la feuille et à la cellule, ou un export
  CSV, cité à la ligne.
- **Courriels enregistrés** au format `.eml` ou `.mbox`.

Ragmir indexe plus de 900 types de fichiers ; la liste des
[formats pris en charge](/docs/supported-formats/) les donne tous. Les pages scannées et les images
nécessitent l’OCR local facultatif, qui exécute une commande sur votre machine.

## Préparer le dossier

Créez un dossier comme `paperwork/`, placez les documents dans un sous-dossier `documents/`, puis
ouvrez un terminal dans `paperwork/`. Cela nécessite Node.js 22.12 ou une version plus récente :

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "documents/**"
npx rgr ingest
```

Si certains fichiers sont des scans, vérifiez le moteur OCR local, puis configurez-le :

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

L’ingestion est incrémentale. Lorsqu’un nouveau relevé arrive, déposez-le dans le dossier et
relancez `npx rgr ingest`.

## Interroger avec une preuve à la page

La recherche fonctionne seule, sans aucun modèle. Chaque résultat porte une citation, comme une page
de PDF :

```bash
npx rgr search "préavis contrat de travail" --compact
```

Pour obtenir une réponse rédigée, ajoutez un modèle local. Le [tutoriel RAG local](/fr/rag-local/)
montre comment installer Ollama et lancer un court script qui n’envoie au modèle que les passages
sélectionnés. Posez-lui des questions de ce type :

```prompt
Listez les bulletins de paie des trois derniers mois, et citez la page de chacun.

À quelle page de mon bail le montant du dépôt de garantie est-il indiqué ?

J’ai besoin d’un justificatif de domicile et d’un justificatif de revenus pour un dossier. Quels documents les contiennent ? Indiquez la page, et dites-moi ce qui manque.
```

Si les documents ne contiennent aucune preuve, Ragmir ne renvoie rien et le modèle doit le dire. Une
correspondance faible est signalée par `weakEvidence`.

## Rester entièrement en local

Désactivez d’abord les fonctions cloud d’Ollama, comme l’explique le
[tutoriel RAG local](/fr/rag-local/) : ajoutez `"disable_ollama_cloud": true` dans
`~/.ollama/server.json`, puis redémarrez Ollama. Une adresse localhost ne prouve pas à elle seule
que le modèle tourne en local, car Ollama prend aussi en charge des modèles cloud.

Avec un modèle local et un chat local, l’index, la recherche et les appels au modèle restent sur
votre machine. Sauvegardez ce dossier comme vos autres fichiers privés.

## Utiliser plutôt une IA dans le cloud

Un assistant dans le cloud fonctionne aussi, mais il reçoit les passages qu’il lit. Pour des papiers
administratifs, cela peut inclure des numéros de compte, des salaires et des adresses. Le
[guide local ou cloud](/local-vs-cloud-rag/) liste les points à vérifier : entraînement,
conservation, région, accès et périmètre. Écartez de la base lue par un assistant cloud les
documents les plus sensibles.

## Limites

- Le modèle rédige, vous vérifiez. Ouvrez chaque page citée avant d’envoyer un dossier à qui que ce
  soit.
- Ragmir ne donne aucun conseil juridique, fiscal ou financier, et la réponse d’un modèle n’en est
  pas un non plus.
- Ragmir ne remplit pas de formulaires, n’envoie pas de courriels et ne contacte aucun guichet.
  C’est vous ou l’assistant qui le faites.
- L’OCR peut mal lire un scan. Comparez la page citée avec l’original.
- Un petit modèle local peut manquer des détails. Demandez la page, puis lisez-la.

## Étapes suivantes

- [Tutoriel RAG local : documents, Ollama et CPU uniquement](/fr/rag-local/)
- [RAG local ou cloud : modèles, matériel et vos données](/local-vs-cloud-rag/)
- [Citations RAG : ligne, page, diapositive et cellule](/rag-citations/)
- [Formats pris en charge](/docs/supported-formats/)
