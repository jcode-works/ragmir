---
title: "Citations RAG : lignes, pages et cellules exactes | Ragmir"
description: "Une citation RAG vérifiable : lignes, pages PDF, diapositives, cellules, spine EPUB ou sections selon le format, et la vérification de chaque source par Ragmir."
h1: "RAG avec citations : des sources exactes que vous pouvez vérifier"
summary: "Une citation RAG désigne le passage source à l’origine d’une réponse. Ragmir cite chaque passage par son chemin dans le projet, complété d’une coordonnée native : lignes, page PDF, diapositive, plage de feuille et de cellules, élément du spine EPUB ou section nommée. Il n’émet une coordonnée que lorsqu’il peut la vérifier."
section: guide
setup: agents
translationKey: "rag-citations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-vs-mcp", "local-rag", "use-cases/forward-deployed-engineers", "self-hosted-rag"]
---

Une bonne citation permet au lecteur de l’ouvrir et d’atterrir sur le texte qui étaye l’affirmation.
Un nom de fichier seul le renvoie à une recherche dans le document. Une mauvaise page le conduit vers
le mauvais texte.

Ragmir renvoie une citation avec chaque passage, construite à partir de la source analysée. Il vérifie
de nouveau la citation lorsque le passage est développé. L’agent ou l’application qui rédige la
réponse cite la citation à côté de l’affirmation qu’elle étaye.

## À quoi ressemble une citation Ragmir

```text
contracts/msa-acme-2026.pdf:p7#3
```

- `contracts/msa-acme-2026.pdf` est le chemin relatif au projet, stocké avec des barres obliques et
  en Unicode NFC sur toutes les plateformes.
- `:p7` est la coordonnée : la page 7 du PDF.
- `#3` est l’index du passage (le fragment) dans le document.

La forme est la même pour tous les formats ; seule la coordonnée change. Par exemple,
`docs/adr/0012-authentication.md:L18-L26#2` cite les lignes 18 à 26, et
`book.xlsx:sheet=Dashboard:cells=A2-F12#0` cite une plage de cellules.

<figure>
  <img src="/guides/citations-search.webp" alt="Terminal affichant deux recherches rgr. La première renvoie specs/nist-sp-800-63b-4.pdf:p25#56, avec le passage sur le changement périodique des mots de passe. La seconde renvoie docs/server-deployment.md:L125-L140#8, avec la section sur l’exécution sans accès à internet." width="1440" height="763" loading="lazy" decoding="async">
  <figcaption>Deux recherches sur un même index de guides Markdown et d’un PDF public du NIST, avec Ragmir 6.20.0 : une page pour le PDF, une plage de lignes pour le fichier Markdown.</figcaption>
</figure>

## Coordonnées de citation par format

| Source | Coordonnée | Exemple tiré de la documentation |
| --- | --- | --- |
| Code, Markdown et autres textes, CSV, la plupart des fichiers de configuration | Lignes de la source | `:L10-L12`, `docs/runbook.md:L12-L18#3` |
| PDF | Page, ou plage de pages lorsque de courtes pages consécutives partagent un passage | `:p3`, `agenda.pdf:p1-p9#0` |
| PowerPoint | Diapositive | `:slide12` |
| Excel | Plage de feuille et de cellules ; les lignes consécutives d’un même tableau partagent un passage | `:sheet=Finance%20Ops:cells=A7-D7` |
| EPUB | Élément du spine | `:spine2` |
| Word, JSON, YAML, courriels `.eml` et `.msg` | Numéro de passage | `specs/account-recovery.docx#2` |
| Modèles de données, schémas, descriptions d’API, boîtes aux lettres, fichiers de conception, notes, GeoJSON, SARIF | Section nommée par objet, ou lignes | `model.pdm:section=Table%20INVOICE#3` |
| Pages numérisées, images, `.doc` anciens (extracteur local facultatif) | Page ou passage | |

Les passages Markdown portent aussi leur chemin de titres. Deux tableaux d’une feuille de calcul,
deux feuilles ou un graphique de feuille ne partagent jamais un passage.

La liste des [formats pris en charge](/docs/supported-formats/) donne chaque extension et sa citation.

## Citations de numéro de page pour les PDF

- Le texte PDF intégré est extrait en premier. L’OCR local facultatif ne s’exécute que sur les pages
  sans texte extrait. Il travaille par lots bornés, avec un cache indexé notamment par somme de
  contrôle de la source et par page.
- Lorsque de courtes pages consécutives partagent un passage, la citation nomme toute la plage, comme
  `agenda.pdf:p1-p9#0`, au lieu d’une seule page.
- Les coordonnées de ligne n’apparaissent que pour un texte qui conserve sa source. Un passage PDF ne
  reçoit jamais de lignes source inventées. Ses coordonnées ne sont pas des décalages d’octets dans
  le fichier binaire.

<figure>
  <img src="/guides/citations-pdf-page.webp" alt="Page 25 du NIST SP 800-63B-4, section 3.1.1.2 Password Verifiers, avec l’exigence 6 surlignée : les vérificateurs et les CSP ne doivent pas exiger des abonnés qu’ils changent périodiquement leurs mots de passe." width="1536" height="1342" loading="lazy" decoding="async">
  <figcaption>Le passage cité par <code>specs/nist-sp-800-63b-4.pdf:p25#56</code>, surligné ici sur sa page. <code>p25</code> compte les pages du fichier : la page elle-même imprime le numéro 14.</figcaption>
</figure>

## Quand les citations de page se trompent

Les citations de page peuvent échouer de deux manières au moins :

- La page dérive : la citation pointe une page à côté.
- Le numéro de page se perd entre l’indexation et l’affichage : le lecteur ouvre le document au début.

Deux signalements publics dans le projet Open WebUI les illustrent :

- [Issue #33603](https://github.com/open-webui/open-webui/issues/33603) signalait que les PDF indexés
  par Docling n’avaient pas de `page_label`. Le modèle ouvrait et citait la page précédant la bonne.
- [Issue #35108](https://github.com/open-webui/open-webui/issues/35108) signalait que les citations
  natives de Knowledge perdaient le numéro de page du PDF et s’ouvraient au début du document.

Les deux sont désormais fermées.

Dans Ragmir, la page fait partie de la chaîne de citation : elle voyage donc avec la citation, où
qu’elle aille. Le retriever LangChain.js conserve aussi la citation et sa plage de lignes ou de pages
dans les `metadata` de chaque document. Les coordonnées ne sont émises que lorsqu’elles sont
vérifiables.

Vous pouvez aussi les tester. Dans un fichier de référence (golden), `expectedCitations` exige des
citations exactes. Un seuil `exactCitationRate` fait échouer `rgr evaluate` lorsqu’elles dérivent.
Gardez les citations exactes pour les faits qui doivent être cités avec précision, car elles changent
lorsque le fichier est modifié. Le
[benchmark de preuves documentaires](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/examples/document-evidence-benchmark/README.md)
du dépôt contrôle de la même façon une citation exacte de page PDF.

Ragmir ne dispose d’aucune visionneuse de documents. L’application qui affiche la réponse doit ouvrir
le fichier à la page citée et surligner le passage. Testez cette dernière étape dans votre propre
interface.

## Comment le développement vérifie la source

1. `sourceStatus: "modified"` ou `"missing"` signale un résultat dont le fichier a changé ou disparu
   après l’indexation. Cela coûte un `stat` par fichier cité.
2. `evidence.id` identifie le passage indexé. Transmettez-le comme `expectedEvidenceId` à
   `expandCitation` (ou à `ragmir_expand`). Un contenu indexé modifié est alors refusé avec
   `EVIDENCE_CHANGED`.
3. Une citation dont les lignes ont bougé échoue, et le message donne la citation actuelle du passage.
   Une citation qui ne trouve rien renvoie `found: false`, avec un `suggestedCitation` ou des
   `similarPaths`.
4. `rgr audit --knowledge` vérifie les citations écrites dans les pages Markdown. Il signale les
   `brokenCitations` lorsque leur passage a changé ou a quitté l’index.

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"

const ragmir = await createRagmirClient({ cwd: process.cwd() })
try {
  await ragmir.ingest()
  const passages = await ragmir.search("authentication contract", { topK: 3 })
  for (const passage of passages) {
    console.log(passage.citation, passage.weakEvidence ? "(verify)" : "", passage.text)
  }
  if (passages[0]) {
    console.log(await ragmir.expandCitation(passages[0].citation, {
      expectedEvidenceId: passages[0].evidence?.id,
    }))
  }
} finally {
  await ragmir.close()
}
```

Une citation indique d’où vient un passage. Elle ne montre pas que le passage couvre tout ce que
demande la question. Développez les preuves, et vérifiez les exceptions et les faits manquants avant
d’agir.

## Étapes suivantes

- [Formats pris en charge et leurs citations](/docs/supported-formats/)
- [API TypeScript : recherche et développement](/docs/api-reference/)
- [RAG et MCP](/fr/rag-vs-mcp/)
- [Tutoriel RAG local](/fr/rag-local/)
