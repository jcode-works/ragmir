---
title: "RAG autoalojado en un VPS o en un servidor local | Ragmir"
description: "Ejecuta Ragmir en un VPS o en un servidor local con la imagen Docker slim o full: dónde viven el índice, cómo compartir una base y una lista de comprobación."
h1: "RAG autoalojado en tu VPS o en tu servidor local"
summary: "Ragmir es una capa de recuperación que alojas tú mismo. Analiza, indexa y busca tus documentos en tu servidor y devuelve pasajes citados al servicio o agente que lo llama. Tu servicio mantiene TLS, la autenticación, el acceso por usuario, los límites de tasa y el modelo."
section: guide
setup: server
translationKey: "self-hosted-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["air-gapped-rag", "local-rag", "use-cases/forward-deployed-engineers", "local-vs-cloud-rag"]
---

Ragmir funciona allí donde se ejecuta Node.js 22.12, o en Docker sobre amd64 y arm64. Eso incluye un
VPS, un servidor local, un runner de CI o un contenedor.

Ragmir es una biblioteca y una CLI, no un servicio alojado. No abre ningún puerto y no necesita
cuenta. El proveedor predeterminado `local-hash` no hace ninguna llamada de red.

Es una capa de recuperación, no una plataforma de chat. No incluye interfaz de chat, cuentas de
usuario ni modelo. Funciona junto a lo que redacta las respuestas: un modelo local de Ollama, tu
propio servidor vLLM o una API alojada que recibe los pasajes que le envías.

## Qué se ejecuta dónde

| Componente | Dónde se ejecuta |
| --- | --- |
| Análisis, OCR opcional, embeddings, índice y búsqueda | Dentro del proceso de Ragmir en el servidor |
| Índice | `storageDir`, por ejemplo un volumen en `/var/lib/ragmir` |
| TLS, autenticación, autorización y límites de tasa | Tu servicio o tu gateway |
| Generación | El modelo que elija tu aplicación |

## RAG con Docker: las imágenes slim y full

La imagen oficial `ghcr.io/jcode-works/ragmir` ejecuta la CLI y el servidor MCP sin Node.js. Su
variante `:full` añade el entorno de ejecución del modelo semántico y OCR local. La [guía de
Docker](/docs/docker/) indica qué contiene cada imagen, sus plataformas y sus etiquetas. Fija una
versión exacta en producción, como `6.20.0` o `6.20.0-full`.

Monta el proyecto y pasa tu ID de usuario para que los archivos que escribe Ragmir sean tuyos:

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir'
rgr init
rgr sources add "docs/**/*.md" "specs/**/*.pdf"
rgr ingest
rgr search "release approval" --compact
```

Para una ejecución muy restringida, añade `--read-only --tmpfs /tmp --network none`. La imagen slim
no necesita red después de descargarse.

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal con ghcr.io/jcode-works/ragmir:6.20.0 ejecutándose con --network none sobre un proyecto montado. La búsqueda devuelve specs/nist-sp-800-63b-4.pdf:p25#56 con el pasaje sobre los cambios periódicos de contraseña." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>La imagen oficial 6.20.0 busca en el índice de un proyecto montado con <code>--network none</code>.</figcaption>
</figure>

Para incluir una configuración en tu propia imagen y fijar las dependencias con un lockfile, parte
del Dockerfile de la [guía de servidor](/docs/server-deployment/). Se verificó en Debian y Alpine
como usuario no root, con un sistema de archivos raíz de solo lectura y sin acceso a la red.

## Dónde viven tus datos

`ragmir.config.json` define la base, selecciona las fuentes y puede sacar el índice del proyecto:

```json
{
  "name": "handbook",
  "description": "Runbooks and architecture decisions",
  "sources": ["docs/**/*.md", "docs/**/*.pdf", "docs/**/*.docx"],
  "storageDir": "/var/lib/ragmir/storage"
}
```

- **Índice:** en `.ragmir/storage/` por defecto, o en `storageDir` (`RAGMIR_STORAGE_DIR`) en un
  volumen persistente.
- **Modelos:** en `embeddingModelPath`, por defecto `.ragmir/models`, cargados desde una copia local.
- **Caché de OCR:** entradas privadas en `.ragmir/ocr-cache/`, indexadas por la suma de control del
  origen y la página, entre otros campos.
- **Aprobaciones:** `~/.config/ragmir/trust.json`, o una carpeta que defines en `RAGMIR_TRUST_DIR`.
- **Documentos:** incluidos en tu imagen o montados en solo lectura.

Incluye `ragmir.config.json` en el control de versiones junto con el despliegue, y mantén el índice,
los modelos y los documentos fuera de Git.

## Mantén el índice actualizado

Ejecuta la ingesta desde cron, un temporizador de systemd o tu CI cuando cambien los documentos:

```bash
rgr ingest
```

La ingesta es incremental y se puede reanudar:

- Los archivos sin cambios se reutilizan.
- Un archivo modificado que no se puede analizar conserva su última evidencia válida y se informa
  como obsoleto.
- Una reconstrucción mantiene activo el índice anterior hasta que su reemplazo supera la validación.

Las búsquedas siguen funcionando mientras se ejecuta una ingesta.

## Comparte una base entre máquinas y equipos

- **Un solo escritor por máquina.** Ragmir serializa los escritores con un bloqueo bajo
  `storageDir`, y los lectores siguen disponibles. El bloqueo no coordina máquinas. Nunca compartas
  un índice escribible por NFS o SMB. Da a cada host su propio índice, o deja que un host escriba y
  copie el resultado.
- **Las fuentes viajan por Git o por sincronización de archivos.** Incluye `ragmir.config.json` en el
  control de versiones y luego ejecuta la ingesta en cada estación de trabajo:

  ```bash
  rgr ingest
  ```

- **Solo lectura para los agentes.** `"mcpIngest": false` mantiene un despliegue compartido en solo
  lectura para los clientes MCP.
- **Una base por audiencia.** Ragmir no filtra los resultados por usuario. Da a cada audiencia su
  propia base y comprueba el acceso antes de llamar a `search`.

## Sirve la recuperación a tu servicio o agente

Un agente en la misma máquina lanza `rgr serve-mcp` por stdio, desde la carpeta del proyecto o con
`docker run -i ... serve-mcp`.

Tu propio servicio incorpora un cliente por raíz de proyecto en un proceso de larga duración. Llama
al cliente después de sus propias comprobaciones de autenticación y autorización:

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

Los pasajes devueltos contienen texto de los documentos. Registra las citas en lugar de los pasajes
cuando el corpus sea confidencial.

Los servicios en Python obtienen las mismas llamadas desde el cliente de Python ([guía de
Python](/docs/python/)). Instálalo con:

```bash
pip install ragmir
```

## Lista de comprobación para el despliegue en tus instalaciones

1. Fija la etiqueta de la imagen o la versión de npm en tu lockfile.
2. Incluye `ragmir.config.json` en el control de versiones con `name`, `description`, `sources` y
   `storageDir`.
3. Coloca `storageDir` en un volumen persistente con un solo escritor.
4. Ejecuta como usuario no root con un sistema de archivos raíz de solo lectura, y añade
   `--network none` cuando nada necesite la red.
5. Revisa la configuración y luego aprueba sus comandos y endpoints:

   ```bash
   rgr trust --yes
   ```

   En una imagen cuya configuración construyes y revisas tú mismo, define
   `RAGMIR_TRUST_PROJECT_CONFIG=1` en su lugar.

6. Programa la ingesta para cuando cambien los documentos:

   ```bash
   rgr ingest
   ```

7. Comprueba el estado del despliegue:

   ```bash
   rgr status --json
   ```

   Informa de `ready`, del nombre de la base y del número de archivos indexados. `rgr doctor`
   comprueba la actualidad, y `rgr audit --unsupported` lista los archivos omitidos.
8. Mide con preguntas reales, incluidos los negativos difíciles que no deben devolver nada:

   ```bash
   rgr evaluate --golden golden.json
   ```

9. Mantén en tu servicio el TLS, la autenticación, la autorización y los límites de tasa.

## Próximos pasos

- [RAG en red aislada, sin acceso a internet](/es/rag-sin-conexion/)
- [Ejecutar Ragmir en un servidor](/docs/server-deployment/)
- [Ejecutar Ragmir con Docker](/docs/docker/)
- [Desplegar RAG dentro del perímetro de un cliente](/es/casos-de-uso/forward-deployed-engineers/)
