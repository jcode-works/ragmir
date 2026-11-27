---
title: "RAG en réseau isolé, sans sortie de données | Ragmir"
description: "Exécutez un RAG sans accès à internet : préparez une fois l’image ou le paquet npm, un modèle optionnel et l’OCR, gardez les sorties à zéro et vérifiez hors ligne."
h1: "RAG en réseau isolé : la recherche sans accès à internet"
summary: "La recherche par défaut de Ragmir ne fait aucun appel réseau. En réseau isolé, il suffit de préparer à l’avance l’image Docker ou le paquet npm, ainsi qu’un modèle sémantique et des moteurs OCR optionnels. Ensuite, l’ingestion, la recherche et l’évaluation fonctionnent réseau coupé."
section: guide
setup: offline
translationKey: "air-gapped-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

Le RAG hors ligne repose sur deux moitiés, et les deux doivent se trouver dans le réseau.

Ragmir couvre la recherche : l’analyse des fichiers, l’index et la recherche s’exécutent dans son
propre processus. Il n’y a ni télémétrie, ni compte, ni stockage hébergé, et la recherche normale
garde désactivé le chargement de modèles distants.

La génération vous revient, par exemple avec un modèle Ollama local ou un serveur d’inférence situé
dans le même réseau. Un index local ne rend pas une conversation distante locale. L’isolement ne
tient que si le modèle et le client qui l’appelle restent eux aussi à l’intérieur.

## Ce qui se télécharge une seule fois

| Composant | Utilisé pour | Comment le préparer |
| --- | --- | --- |
| Image `ghcr.io/jcode-works/ragmir` | La CLI et le serveur MCP sans Node.js | Téléchargez-la là où le registre est accessible, puis transférez-la avec `docker save` et `docker load` |
| Paquet npm `@jcode.labs/ragmir` | L’exécution sur Node.js 22.12 ou plus récent | Installez-le là où le registre npm est accessible, ou depuis votre miroir npm interne |
| `@huggingface/transformers` et un instantané de modèle | La recherche sémantique optionnelle | Téléchargez le modèle une fois là où le réseau est disponible, puis livrez `.ragmir/models` avec la configuration |
| Tesseract ou OCRmyPDF | L’OCR optionnel des scans et des photos | Installez-les dans votre image, ou utilisez l’image `:full`, qui embarque Tesseract, Poppler et antiword |
| Le modèle qui rédige les réponses | La génération | Hors de Ragmir : un modèle local ou auto-hébergé dans le réseau |

Épinglez ce que vous préparez, afin que chaque machine exécute la version que vous avez testée.
Utilisez une étiquette d’image exacte, comme `6.20.0` (ou `6.20.0-full`), ou la version figurant
dans votre fichier de verrouillage.

## Préparer l’image ou le paquet

Téléchargez l’image là où le registre est accessible, puis transférez-la avec `docker save` et
`docker load`. L’image standard n’a plus besoin du réseau une fois téléchargée.

Pour intégrer une configuration à votre propre image, construisez-la à partir du Dockerfile du
[guide serveur](/docs/server-deployment/) là où le registre npm est accessible. Transférez-la de la
même manière.

Sans conteneurs, installez Node.js 22.12 ou plus récent, ainsi que `@jcode.labs/ragmir` depuis votre
miroir npm interne.

Gardez le paquet installé dans chaque projet que les agents utilisent. Le lanceur MCP généré le
résout depuis le dossier du projet. Il ne revient à `npx --prefer-offline` que si aucun paquet local
n’existe, et `rgr doctor` signale ce cas.

## Préparer un modèle sémantique et l’OCR

`local-hash` n’exige aucun modèle. Pour la recherche sémantique, téléchargez le modèle une fois sur
une machine connectée, puis transférez le dossier du projet dans le réseau isolé.

Sans Docker, ajoutez `@huggingface/transformers` et lancez la configuration sémantique :

```bash
rgr setup --semantic
```

Avec l’image complète, utilisez :

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir:full'
rgr models list                      # the recommended model, download size, and memory
rgr models pull --enable --model onnx-community/granite-embedding-97m-multilingual-r2-ONNX
```

Le modèle est placé dans `.ragmir/models` du projet (`embeddingModelPath`). La configuration
enregistre sa révision épinglée de 40 caractères et l’empreinte de l’artefact.

Ragmir ne charge que les poids ONNX via Transformers.js, sans objets sérialisés ni code distant. Il
garde les téléchargements désactivés après la configuration : le serveur ne récupère donc plus
jamais le modèle. Le prochain `rgr ingest` reconstruit l’index avec des vecteurs sémantiques.

Pour les documents numérisés, vérifiez et configurez l’OCR dans le réseau :

```bash
rgr ocr doctor
rgr ocr setup
```

Puis lancez l’ingestion depuis un terminal, car les clients MCP ne peuvent pas démarrer une
ingestion lorsque des extracteurs externes sont configurés :

```bash
rgr ingest
```

Un conteneur oublie les approbations entre deux exécutions. Après avoir relu la configuration,
passez `-e RAGMIR_TRUST_PROJECT_CONFIG=1` ou montez un dossier comme `RAGMIR_TRUST_DIR`.

## Aucune sortie par défaut

- `local-hash` ne fait aucun appel réseau. Le conteneur du guide serveur ingère et cherche avec
  `--network none`.
- Certains réglages enverraient des données hors de la machine. Ils restent inactifs tant qu’une
  personne ne les a pas approuvés sur cette machine avec `rgr trust`. Il s’agit d’un
  `embeddingEndpoint` situé hors de la machine, de `embeddingApiKeyEnv` et de
  `transformersAllowRemoteModels: true`. Jusque-là, les téléchargements de modèles restent
  désactivés, et les appels d’embedding échouent avec `UNTRUSTED_CONFIG` avant qu’une requête ne
  quitte le processus.
- L’OCR passe par une commande locale configurée, jamais par un shell ni par un service cloud.
- Avec Ollama, réglez `"disable_ollama_cloud": true` dans `~/.ollama/server.json`. Un point d’accès
  localhost ne prouve pas à lui seul une inférence locale, car Ollama prend aussi en charge des
  modèles cloud.

## Vérifier l’installation hors ligne

1. Ingérez et recherchez dans un conteneur sans accès réseau. Avec l’image construite à partir du
   Dockerfile du guide serveur :

   ```bash
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook ingest
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook search "checkout retry policy" --compact
   ```

2. Lancez l’audit de sécurité. Il signale un point d’accès d’embedding non local et des extracteurs
   externes configurés. Avec l’OCR activé, cet avertissement est attendu, et l’OCR reste utilisable
   pendant qu’il est signalé.

   ```bash
   rgr security-audit
   ```

3. Vérifiez le statut et `ready`. `rgr doctor` liste les approbations en attente et les étapes
   suivantes.

   ```bash
   rgr status --json
   ```

4. Évaluez sur de vraies questions, y compris des négatifs difficiles qui ne doivent renvoyer aucun
   résultat.

   ```bash
   rgr evaluate --golden golden.json
   ```

5. Si l’ingestion sémantique signale que Transformers.js a chargé le modèle sans son tokenizer, le
   dossier du modèle n’est pas un instantané hors ligne. Téléchargez de nouveau le modèle sur la
   machine connectée :

   ```bash
   rgr models pull --enable
   ```

   Transférez ensuite le dossier et reconstruisez l’index :

   ```bash
   rgr ingest --rebuild
   ```

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal exécutant ghcr.io/jcode-works/ragmir:6.20.0 avec --network none sur un projet monté. La recherche renvoie specs/nist-sp-800-63b-4.pdf:p25#56, avec le passage sur le changement périodique des mots de passe." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>Le même contrôle avec l’image officielle 6.20.0 : avec <code>--network none</code>, la recherche renvoie toujours une page PDF citée depuis l’index du projet.</figcaption>
</figure>

## Étapes suivantes

- [RAG auto-hébergé sur un VPS ou un serveur sur site](/fr/rag-auto-heberge/)
- [Exécuter Ragmir avec Docker](/docs/docker/)
- [Configuration et réglages soumis à approbation](/docs/configuration/)
- [Déployer un RAG dans le périmètre d’un client](/fr/cas-usage/forward-deployed-engineers/)
