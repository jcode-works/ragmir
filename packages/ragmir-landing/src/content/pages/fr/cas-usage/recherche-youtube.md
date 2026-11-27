---
title: "RAG pour la recherche YouTube : scripts sourcés | Ragmir"
description: "Faites de Ragmir le bureau de recherche de votre chaîne : indexez livres, publications et sous-titres, vérifiez vos scripts et tenez un wiki thématique à jour."
h1: "RAG pour les créateurs YouTube : recherche, scripts et wiki à partir de vos sources"
summary: "Indexez une fois les livres, publications, articles et fichiers de sous-titres derrière vos vidéos. Votre assistant IA répond ensuite aux questions de recherche avec des citations, vérifie un script à partir de vos sources et tient un wiki thématique qui s’enrichit d’une vidéo à l’autre. Ragmir trouve et cite ; il n’écrit, n’enregistre ni ne publie rien."
section: use-case
setup: creator
translationKey: "use-cases/youtube-research"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "rag-citations", "agentic-rag", "local-rag"]
---

Une vidéo fondée sur des recherches a besoin de sources que l’on puisse retrouver. Ragmir transforme
le dossier qui accompagne votre chaîne en une base que votre assistant IA peut interroger, et chaque
réponse renvoie à la page ou à la ligne d’où elle provient.

## Ce qui entre dans la base

- **Livres et lectures longues** au format PDF ou EPUB, cités à la page ou à la section de l’EPUB.
- **Publications scientifiques, rapports et articles** enregistrés en PDF, HTML ou Markdown.
- **Vos anciennes vidéos** sous forme de fichiers de sous-titres : `.srt`, `.vtt`, `.sbv` et les
  autres formats de sous-titres sont cités à leurs lignes, qui portent les horodatages.
- **Notes, scripts et figures** en Markdown, Word ou Excel, cités à la ligne, au passage ou à la
  cellule.

Ragmir indexe plus de 900 types de fichiers ; la liste des
[formats pris en charge](/docs/supported-formats/) les donne tous. Il lit du texte, pas du son : une
vidéo doit disposer de ses sous-titres ou d’une transcription avant que Ragmir puisse la citer.

## Préparer le dossier de recherche

Gardez les sources telles que vous les avez reçues dans un dossier, et les pages rédigées par votre
IA dans un autre. Cette organisation est celle du skill `ragmir-wiki` de Ragmir :

```text
channel/
  raw/    books, papers, articles, and caption files, never edited
  wiki/   topic pages your AI maintains, one topic per page
```

Installez Ragmir dans le dossier, ajoutez les deux parties comme sources, puis construisez l’index :

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "raw/**" "wiki/**"
npx rgr ingest
```

Connectez ensuite votre assistant. Un chat de bureau qui prend en charge les serveurs MCP locaux, ou un
agent de code comme Claude Code, Codex ou Cursor, lance le serveur de Ragmir sur ce dossier ; les
[intégrations](/integrations/) détaillent chacune. Pour donner à votre agent les skills qui pilotent
les étapes ci-dessous, dont `ragmir-wiki` :

```bash
npx skills add jcode-works/ragmir
```

## Rechercher pour une vidéo avec citations

Posez à votre assistant les questions auxquelles la vidéo doit répondre. Il interroge la base, lit les
passages dont il a besoin et cite chacun d’eux.

<figure>
  <img src="/guides/creator-search.webp" alt="Terminal exécutant rgr search avec la question Faut-il changer les mots de passe périodiquement. Les résultats citent une page du wiki, wiki/password-rotation.md:L8-L12#1, les sous-titres de l’épisode 12, raw/captions/ep-12-password-myths.vtt:L1-L16#0, et la page 25 d’un PDF du NIST, raw/papers/nist-sp-800-63b-4.pdf:p25#56." width="1440" height="934" loading="lazy" decoding="async">
  <figcaption>Une question posée sur le dossier d’une chaîne de démonstration : une page thématique du wiki, les sous-titres d’un épisode passé et la page du guide du NIST qui sous-tend les deux, chacun avec sa citation.</figcaption>
</figure>

Lorsque les sources ne contiennent aucune preuve, Ragmir ne renvoie rien, et l’assistant peut dire que
vos recherches ne couvrent pas la question. C’est alors le moment de trouver une nouvelle source, et
non d’improviser.

## Vérifier un script avant l’enregistrement

Collez un brouillon et demandez à l’assistant de vérifier chaque affirmation par rapport à la base. Le
serveur MCP de Ragmir fournit un prompt `answer` qui exige une citation pour chaque affirmation, et une
formulation simple lorsque les documents ne contiennent aucune preuve.

Un passage marqué `weakEvidence` mérite un second regard. Une affirmation sans aucun passage a besoin
d’une source ou d’une réécriture.

## Tenir un wiki thématique qui grandit avec la chaîne

Le wiki est l’endroit où s’accumulent les recherches : une page Markdown par sujet, rédigée par votre
assistant à partir des sources, avec une citation derrière chaque affirmation. Ragmir ne rédige jamais
une page. Il recherche, cite, liste et audite.

- Le prompt `compile-source` guide le modèle pour transformer une source en pages citées. Le skill
  `ragmir-wiki` met aussi à jour les pages qui couvrent déjà un sujet avant d’en créer de nouvelles.
- Chaque page consigne, dans son front matter, les sources dont elle est issue, et relie les pages
  connexes avec des `[[wikilinks]]`.
- `rgr audit --knowledge` contrôle le wiki : liens cassés, pages manquantes, citations modifiées et
  pages dont les sources ont changé depuis leur rédaction.

```bash
npx rgr audit --knowledge --path wiki
```

<figure>
  <img src="/guides/creator-audit.webp" alt="Terminal exécutant rgr audit --knowledge --path wiki sur le dossier de démonstration. Il signale une page avec deux liens et deux citations valides, deux pages manquantes, Passkeys et Password myths, que la page relie, et une page qu’aucune autre page ne relie encore." width="1440" height="681" loading="lazy" decoding="async">
  <figcaption>L’audit du wiki de démonstration : les deux citations tiennent toujours, et la page renvoie vers deux sujets qui n’ont pas encore de page, soit une liste prête pour la prochaine session de recherche.</figcaption>
</figure>

## Automatiser le bureau de recherche

La routine tourne sans vous une fois configurée :

- Déposez les nouvelles sources dans `raw/` et ingérez-les. Ragmir ne lit que les fichiers nouveaux ou
  modifiés :

  ```bash
  npx rgr ingest
  ```

- Au début d’une session, l’assistant liste ce qui a changé depuis la précédente avec `ragmir_sources`
  et `changedSince`, puis compile ces sources dans le wiki.
- Un `npx rgr audit --knowledge` planifié signale les pages à mettre à jour lorsqu’une source change.
- Pour la vidéo suivante, l’assistant rédige un plan à partir du wiki, avec les citations que vous
  vérifiez avant l’enregistrement.

L’enregistrement, le montage et la publication restent de votre ressort. Ragmir constitue la couche de
recherche qui les soutient.

## Garder vos recherches en local, ou utiliser une IA dans le cloud

Dans les deux cas, l’index reste sur votre machine. Avec un modèle local via Ollama, rien ne quitte la
machine. Avec un assistant dans le cloud, les passages qu’il lit parviennent à son fournisseur, ce qui
compte pour des scripts non publiés, des contrats de sponsoring ou des notes privées. Le
[guide local ou cloud](/local-vs-cloud-rag/) couvre les modèles, le matériel et les points à vérifier
avant de choisir.

## Limites

- Ragmir ne transcrit ni l’audio ni la vidéo. Exportez les sous-titres, ou transcrivez d’abord.
- Une citation de sous-titres renvoie à des lignes du fichier de sous-titres, dont les horodatages
  vous ramènent au bon moment ; elle n’ouvre pas le lecteur vidéo.
- L’assistant rédige le plan et le wiki. Vérifiez chaque extrait par rapport au passage cité avant
  qu’il n’apparaisse à l’écran.

## Étapes suivantes

- [RAG local ou cloud : modèles, matériel et vos données](/local-vs-cloud-rag/)
- [Citations RAG : ligne, page, diapositive et cellule](/rag-citations/)
- [RAG agentique : comment l’assistant recherche](/fr/rag-agentique/)
- [Formats pris en charge](/docs/supported-formats/)
