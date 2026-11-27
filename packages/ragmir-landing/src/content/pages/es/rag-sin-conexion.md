---
title: "RAG en red aislada: recuperación sin salida a internet | Ragmir"
description: "Ejecuta RAG sin internet: prepara una vez la imagen o el paquete npm de Ragmir, un modelo opcional y OCR, y verifica sin conexión que el tráfico saliente es cero."
h1: "RAG en red aislada: recuperación sin acceso a internet"
summary: "La recuperación predeterminada de Ragmir no hace ninguna llamada de red. En una red aislada solo necesitas preparar de antemano lo que se usa: la imagen de Docker o el paquete npm y, de forma opcional, un modelo semántico y los motores de OCR. Después, la indexación, la búsqueda y la evaluación se ejecutan con la red desconectada."
section: guide
setup: offline
translationKey: "air-gapped-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "local-rag", "use-cases/forward-deployed-engineers", "rag-citations"]
---

Un RAG sin conexión tiene dos mitades, y ambas deben estar dentro de la red.

Ragmir se encarga de la recuperación. El análisis de los archivos, el índice y la búsqueda se
ejecutan en su propio proceso. No hay telemetría, cuentas ni almacén alojado, y la recuperación
normal mantiene desactivada la carga remota de modelos.

La generación la sitúas tú, por ejemplo con un modelo de Ollama local o con un servidor de
inferencia dentro de la misma red. Un índice local no convierte en local una conversación remota. El
aislamiento solo se mantiene si el modelo y el cliente que lo llama también permanecen dentro de él.

## Qué necesita una descarga única

| Componente | Para qué se necesita | Cómo prepararlo |
| --- | --- | --- |
| Imagen `ghcr.io/jcode-works/ragmir` | La CLI y el servidor MCP sin Node.js | Descárgala donde el registro sea accesible y después muévela con `docker save` y `docker load` |
| Paquete npm `@jcode.labs/ragmir` | Ejecución con Node.js 22.12 o posterior | Instálalo donde el registro de npm sea accesible o desde tu réplica interna de npm |
| `@huggingface/transformers` y una instantánea del modelo | Recuperación semántica opcional | Descarga el modelo una vez donde haya red y después distribuye `.ragmir/models` junto con la configuración |
| Tesseract o OCRmyPDF | OCR opcional de escaneos y fotos | Instálalos en tu imagen o usa la imagen `:full`, que incluye Tesseract, Poppler y antiword |
| El modelo que redacta las respuestas | Generación | Fuera de Ragmir: un modelo local o autoalojado dentro de la red |

Fija la versión de lo que prepares, para que cada equipo ejecute la versión que probaste. Usa una
etiqueta de imagen exacta, como `6.20.0` (o `6.20.0-full`), o la versión que figure en tu archivo de
bloqueo.

## Preparar la imagen o el paquete

Descarga la imagen donde el registro sea accesible y después muévela con `docker save` y `docker load`. La imagen estándar no necesita red una vez descargada.

Para incluir una configuración en tu propia imagen, constrúyela desde el Dockerfile de la [guía del
servidor](/docs/server-deployment/) donde el registro de npm sea accesible. Muévela de la misma
forma.

Sin contenedores, instala Node.js 22.12 o posterior y `@jcode.labs/ragmir` desde tu réplica interna
de npm.

Mantén el paquete instalado en cada proyecto que usen los agentes. El ejecutor MCP generado lo
resuelve desde la carpeta del proyecto. Solo recurre a `npx --prefer-offline` cuando no existe un
paquete local, y `rgr doctor` informa de ese caso.

## Preparar un modelo semántico y el OCR

`local-hash` no necesita modelo. Para la recuperación semántica, descarga el modelo una vez en un
equipo conectado y después lleva la carpeta del proyecto a la red.

Sin Docker, añade `@huggingface/transformers` y ejecuta la configuración semántica:

```bash
rgr setup --semantic
```

Con la imagen completa, usa:

```bash
alias rgr='docker run --rm -it -v "$PWD:/workspace" --user "$(id -u):$(id -g)" ghcr.io/jcode-works/ragmir:full'
rgr models list                      # the recommended model, download size, and memory
rgr models pull --enable --model onnx-community/granite-embedding-97m-multilingual-r2-ONNX
```

El modelo se guarda en `.ragmir/models` del proyecto (`embeddingModelPath`). La configuración
registra su revisión fijada de 40 caracteres y el digest del artefacto.

Ragmir carga solo pesos ONNX mediante Transformers.js, sin objetos serializados con pickle ni código
remoto. Mantiene las descargas desactivadas después de la configuración, así que el servidor nunca
vuelve a descargar el modelo. El siguiente `rgr ingest` reconstruye el índice con vectores
semánticos.

Para los documentos escaneados, comprueba y configura el OCR dentro de la red:

```bash
rgr ocr doctor
rgr ocr setup
```

Después indexa desde una terminal, porque los clientes MCP no pueden iniciar una indexación mientras
haya extractores externos configurados:

```bash
rgr ingest
```

Un contenedor olvida las aprobaciones entre ejecuciones. Tras revisar la configuración, pasa `-e RAGMIR_TRUST_PROJECT_CONFIG=1` o monta una carpeta como `RAGMIR_TRUST_DIR`.

## Sin tráfico saliente por defecto

- `local-hash` no hace ninguna llamada de red. El contenedor de la guía del servidor indexa y busca
  con `--network none`.
- Algunos ajustes enviarían datos fuera del equipo. Permanecen inactivos hasta que alguien los
  apruebe en ese equipo con `rgr trust`. Se trata de un `embeddingEndpoint` situado fuera del
  equipo, de `embeddingApiKeyEnv` y de `transformersAllowRemoteModels: true`. Hasta entonces, las
  descargas de modelos siguen desactivadas y las llamadas de embeddings fallan con
  `UNTRUSTED_CONFIG` antes de que ninguna petición salga del proceso.
- El OCR se ejecuta mediante un comando local configurado, nunca a través de una shell ni de un
  servicio en la nube.
- Con Ollama, establece `"disable_ollama_cloud": true` en `~/.ollama/server.json`. Un endpoint en
  localhost no demuestra por sí solo la inferencia local, porque Ollama también admite modelos en la
  nube.

## Verifica la instalación sin conexión

1. Indexa y busca en un contenedor sin acceso a la red. Con la imagen construida desde el Dockerfile
   de la guía del servidor:

   ```bash
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook ingest
   docker run --rm --read-only --tmpfs /tmp --network none \
     -v /srv/handbook:/srv/ragmir/docs:ro -v ragmir-index:/var/lib/ragmir \
     ragmir-handbook search "checkout retry policy" --compact
   ```

2. Ejecuta la auditoría de seguridad. Avisa de un endpoint de embeddings que no es local y de los
   extractores externos configurados. Con el OCR activado, ese aviso es esperable, y el OCR sigue
   siendo utilizable mientras se informa de él.

   ```bash
   rgr security-audit
   ```

3. Comprueba el estado y `ready`. `rgr doctor` enumera las aprobaciones pendientes y los siguientes
   pasos.

   ```bash
   rgr status --json
   ```

4. Evalúa con preguntas reales, incluidas las negativas difíciles que no deben devolver nada.

   ```bash
   rgr evaluate --golden golden.json
   ```

5. Si la indexación semántica indica que Transformers.js cargó el modelo sin su tokenizador, la
   carpeta del modelo no es una instantánea apta para uso sin conexión. Vuelve a descargar el modelo
   en el equipo conectado:

   ```bash
   rgr models pull --enable
   ```

   Después distribuye la carpeta y reconstruye el índice:

   ```bash
   rgr ingest --rebuild
   ```

<figure>
  <img src="/guides/search-offline.webp" alt="Terminal con ghcr.io/jcode-works/ragmir:6.20.0 ejecutándose con --network none sobre un proyecto montado. La búsqueda devuelve specs/nist-sp-800-63b-4.pdf:p25#56 con el pasaje sobre los cambios periódicos de contraseña." width="1440" height="555" loading="lazy" decoding="async">
  <figcaption>La misma comprobación con la imagen oficial 6.20.0: con <code>--network none</code>, la búsqueda sigue devolviendo una página PDF citada del índice del proyecto.</figcaption>
</figure>

## Próximos pasos

- [RAG autoalojado en un VPS o en un servidor local](/es/rag-autoalojado/)
- [Ejecuta Ragmir con Docker](/docs/docker/)
- [Configuración y los ajustes que requieren aprobación](/docs/configuration/)
- [Desplegar RAG dentro del perímetro de un cliente](/es/casos-de-uso/forward-deployed-engineers/)
