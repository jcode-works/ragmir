---
title: "RAG auto-hébergé sur un VPS ou un serveur sur site | Ragmir"
description: "Exécutez Ragmir sur un VPS ou un serveur sur site avec l’image Docker slim ou full : index, modèles, partage d’une base et liste de contrôle de déploiement."
h1: "RAG auto-hébergé sur votre VPS ou votre serveur sur site"
summary: "Ragmir est une couche de recherche que vous hébergez vous-même. Il analyse, indexe et interroge vos documents sur votre serveur, et renvoie des passages cités au service ou à l’agent qui l’appelle. Votre service garde le TLS, l’authentification, les accès par utilisateur, les limites de débit et le modèle."
section: guide
setup: server
translationKey: "self-hosted-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["air-gapped-rag", "local-rag", "use-cases/forward-deployed-engineers", "local-vs-cloud-rag"]
---

Ragmir s’exécute partout où Node.js 22.12 fonctionne, ou dans Docker sur amd64 et arm64. Cela
couvre un VPS, un serveur sur site, un runner CI ou un conteneur.

Ragmir est une bibliothèque et une CLI, et non un service hébergé. Il n’ouvre aucun port et ne
demande aucun compte. Le fournisseur `local-hash` par défaut n’effectue aucun appel réseau.

C’est une couche de recherche, et non une plateforme de discussion. Il ne fournit ni interface de
chat, ni comptes utilisateurs, ni modèle. Il fonctionne à côté de ce qui rédige les réponses : un
modèle Ollama local, votre propre serveur vLLM, ou une API hébergée qui reçoit les passages que
vous lui envoyez.

## Ce qui s’exécute où

| Élément | Où il s’exécute |
| --- | --- |
| Analyse, OCR optionnel, embeddings, index, recherche | Dans le processus Ragmir, sur le serveur |
| Index | `storageDir`, par exemple un volume monté sur `/var/lib/ragmir` |
| TLS, authentification, autorisation, limites de débit | Votre service ou votre passerelle |
| Génération | Le modèle que votre application choisit |

## RAG avec Docker : images slim et full

| Image | Contient |
| --- | --- |
| `ghcr.io/jcode-works/ragmir` | La CLI et le serveur MCP avec le fournisseur hors ligne `local-hash`, sur `node:22-bookworm-slim` |
| `ghcr.io/jcode-works/ragmir:full` | La même image, avec en plus le runtime du modèle sémantique, l’OCR Tesseract (anglais, français, allemand, espagnol, italien, portugais), Poppler et antiword |

Les deux images sont publiées pour `linux/amd64` et `linux/arm64`, avec des attestations SBOM et de
provenance. Elles s’exécutent sous l’utilisateur `node`, sans privilèges, et utilisent `/workspace`
comme répertoire de travail.

Chaque version publie les étiquettes `X.Y.Z`, `X.Y`, `X` et `latest`, ainsi que les variantes
`-full`. En production, figez une version exacte, par exemple `6.20.0` ou `6.20.0-full`.

Montez le projet et transmettez votre identifiant utilisateur pour que les fichiers écrits par
Ragmir vous appartiennent :

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir'
rgr init
rgr sources add "docs/**/*.md" "specs/**/*.pdf"
rgr ingest
rgr search "release approval" --compact
```

Pour une exécution verrouillée, ajoutez `--read-only --tmpfs /tmp --network none`. L’image slim n’a
pas besoin du réseau après son téléchargement.

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal exécutant ghcr.io/jcode-works/ragmir:6.20.0 avec --network none sur un projet monté. La recherche renvoie specs/nist-sp-800-63b-4.pdf:p25#56, avec le passage sur le renouvellement périodique des mots de passe." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>L’image officielle 6.20.0 interroge l’index d’un projet monté avec <code>--network none</code>.</figcaption>
</figure>

Pour intégrer une configuration à votre propre image et figer les dépendances avec un fichier de
verrouillage, partez du Dockerfile du [guide serveur](/docs/server-deployment/). Il a été vérifié sur
Debian et Alpine, en utilisateur non root, avec un système de fichiers racine en lecture seule et
sans accès réseau.

## Où vivent vos données

`ragmir.config.json` nomme la base, sélectionne les sources et peut sortir l’index du projet :

```json
{
  "name": "handbook",
  "description": "Runbooks and architecture decisions",
  "sources": ["docs/**/*.md", "docs/**/*.pdf", "docs/**/*.docx"],
  "storageDir": "/var/lib/ragmir/storage"
}
```

- **Index :** sous `.ragmir/storage/` par défaut, ou dans `storageDir` (`RAGMIR_STORAGE_DIR`) sur
  un volume persistant.
- **Modèles :** dans `embeddingModelPath`, `.ragmir/models` par défaut, chargés depuis une copie
  locale.
- **Cache OCR :** entrées privées de `.ragmir/ocr-cache/`, indexées par empreinte du fichier source
  et par page, parmi d’autres champs.
- **Approbations :** `~/.config/ragmir/trust.json`, ou un dossier défini dans `RAGMIR_TRUST_DIR`.
- **Documents :** intégrés à votre image, ou montés en lecture seule.

Versionnez `ragmir.config.json` avec le déploiement, et gardez l’index, les modèles et les documents
hors de Git.

## Garder l’index à jour

Lancez l’ingestion depuis cron, un timer systemd ou votre CI après chaque modification des documents :

```bash
rgr ingest
```

L’ingestion est incrémentale et reprenable :

- Les fichiers inchangés sont réutilisés.
- Un fichier modifié qui ne peut pas être analysé conserve sa dernière version valide et est
  signalé comme obsolète.
- Une reconstruction garde l’index précédent actif jusqu’à ce que son remplacement passe la
  validation.

Les recherches restent disponibles pendant une ingestion.

## Partager une base entre machines et équipes

- **Un seul écrivain par machine.** Ragmir sérialise les écritures grâce à un verrou sous
  `storageDir`, et les lecteurs restent disponibles. Ce verrou ne coordonne pas les machines. Ne
  partagez jamais un index inscriptible via NFS ou SMB. Donnez à chaque hôte son propre index, ou
  laissez un seul hôte écrire puis copiez le résultat.
- **Les sources voyagent par Git ou par synchronisation de fichiers.** Versionnez
  `ragmir.config.json`, puis lancez l’ingestion sur chaque poste de travail :

  ```bash
  rgr ingest
  ```

- **Lecture seule pour les agents.** `"mcpIngest": false` maintient un déploiement partagé en
  lecture seule pour les clients MCP.
- **Une base par public.** Ragmir ne filtre pas les résultats par utilisateur. Donnez à chaque
  public sa propre base, et vérifiez les droits d’accès avant d’appeler `search`.

## Exposer la recherche à votre service ou à votre agent

Un agent sur la même machine lance `rgr serve-mcp` sur stdio, depuis le dossier du projet, ou avec
`docker run -i ... serve-mcp`.

Votre propre service intègre un client par racine de projet, dans un processus de longue durée. Il
appelle le client après ses propres vérifications d’authentification et d’autorisation :

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"

const ragmir = await createRagmirClient({ cwd: "/srv/ragmir" })

/** Call from an authenticated route; Ragmir does not filter results per user. */
export async function retrieve(question: string) {
  const passages = await ragmir.search(question, { topK: 5, timeoutMs: 5_000 })
  return passages.map(({ citation, text, weakEvidence }) => ({ citation, text, weakEvidence }))
}

process.once("SIGTERM", () => {
  void ragmir.close().finally(() => process.exit(0))
})
```

Les passages renvoyés contiennent le texte des documents. Journalisez les citations plutôt que les
passages lorsque le corpus est confidentiel.

Les services Python disposent des mêmes appels grâce au client Python ([guide Python](/docs/python/)).
Installez-le avec :

```bash
pip install ragmir
```

## Liste de contrôle du déploiement sur site

1. Figez l’étiquette de l’image, ou la version npm dans votre fichier de verrouillage.
2. Versionnez `ragmir.config.json` avec `name`, `description`, `sources` et `storageDir`.
3. Placez `storageDir` sur un volume persistant, avec un seul écrivain.
4. Exécutez en utilisateur non root, avec un système de fichiers racine en lecture seule, et
   ajoutez `--network none` lorsque rien n’a besoin du réseau.
5. Relisez la configuration, puis approuvez ses commandes et ses points d’accès :

   ```bash
   rgr trust --yes
   ```

   Dans une image dont vous construisez et relisez vous-même la configuration, définissez plutôt
   `RAGMIR_TRUST_PROJECT_CONFIG=1`.

6. Planifiez l’ingestion après chaque modification des documents :

   ```bash
   rgr ingest
   ```

7. Contrôlez l’état du déploiement :

   ```bash
   rgr status --json
   ```

   La sortie indique `ready`, le nom de la base et le nombre de fichiers indexés. `rgr doctor` vérifie
   la fraîcheur de l’index, et `rgr audit --unsupported` liste les fichiers ignorés.
8. Mesurez sur de vraies questions, y compris des négatifs difficiles qui ne doivent renvoyer aucun
   résultat :

   ```bash
   rgr evaluate --golden golden.json
   ```

9. Gardez le TLS, l’authentification, l’autorisation et les limites de débit dans votre service.

## Étapes suivantes

- [RAG en réseau isolé, sans accès à internet](/fr/rag-hors-ligne/)
- [Exécuter Ragmir sur un serveur](/docs/server-deployment/)
- [Exécuter Ragmir avec Docker](/docs/docker/)
- [Déployer un RAG dans le périmètre d’un client](/fr/cas-usage/forward-deployed-engineers/)
