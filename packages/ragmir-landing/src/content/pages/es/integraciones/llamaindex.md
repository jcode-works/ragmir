---
title: "Retriever de LlamaIndex para archivos locales con citas | Ragmir"
description: "Instala llama-index-retrievers-ragmir para dar a un query engine de LlamaIndex un retriever sobre código, PDF y archivos de Office locales, con la cita en cada nodo."
h1: "Retriever de LlamaIndex para archivos locales"
summary: "El paquete llama-index-retrievers-ragmir añade un RagmirRetriever que aceptan los query engines de LlamaIndex. Busca en un índice de Ragmir de tus archivos locales, creado y consultado en tu máquina, y cada nodo lleva la cita de su pasaje."
section: integration
setup: app
translationKey: "integrations/llamaindex"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/langchain", "docs/python", "docs/supported-formats"]
logo: "library"
group: "frameworks"
---

El retriever de Ragmir devuelve nodos de LlamaIndex a partir de archivos locales, y cada nodo lleva
una cita.

Un query engine de LlamaIndex necesita un retriever que devuelva nodos para una pregunta. El
retriever de Ragmir los toma de un índice de los archivos que elijas. Pueden ser código, Markdown,
PDF, archivos de Word, PowerPoint y Excel, correo y exportaciones de diseño o de API. Ragmir los
analiza e indexa en la máquina que lo ejecuta.

Cada nodo lleva la cita de su pasaje. Una respuesta puede señalar la línea, la página PDF, la
diapositiva o la celda de la que procede. Ragmir recupera. LlamaIndex y el modelo que configures
escriben la respuesta.

## Instalación

```bash
pip install llama-index-retrievers-ragmir
```

El paquete requiere Python 3.11 o posterior. Usa el motor propio de Ragmir, así que también necesita
Node.js 22.12 o posterior, o Docker. Utiliza el primero que exista, en este orden:

- la instalación de `@jcode.labs/ragmir` con npm en el proyecto
- un `rgr` global
- la versión npm correspondiente a través de `npx`
- la imagen `ghcr.io/jcode-works/ragmir`

Define `RAGMIR_COMMAND` para elegir otro comando.

## Indexa los archivos locales

Selecciona las fuentes y crea el índice una vez, desde la raíz del proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Usa el nombre del paquete tal como aparece arriba. `npx rgr` solo funciona cuando un proyecto
instala `@jcode.labs/ragmir` con npm.

`sources add` acepta más globs, como `"specs/**/*.pdf"`, y exclusiones con `!`. La ingesta es
incremental, así que las ejecuciones posteriores solo leen los archivos nuevos o modificados.

El cliente de Python `ragmir` ofrece los mismos pasos como `init_project`, `add_sources` e
`ingest()`. Instálalo con:

```bash
pip install ragmir
```

## Consulta con el retriever

```python
from llama_index.core import Settings
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.ollama import Ollama
from llama_index.retrievers.ragmir import RagmirRetriever

Settings.llm = Ollama(model="gemma4:12b-it-qat", request_timeout=180.0)
retriever = RagmirRetriever("/path/to/project", similarity_top_k=4)
engine = RetrieverQueryEngine.from_args(retriever)
response = engine.query("How do I run Ragmir on a server without internet access?")
print(response)
for node in response.source_nodes:
    print(node.node.metadata["citation"])
```

El query engine usa el LLM definido en `Settings`. Aquí es un modelo local servido por Ollama, así
que toda la consulta permanece en la máquina. Instala la integración de Ollama con:

```bash
pip install llama-index-llms-ollama
```

Ejecutado el 27 de noviembre de 2026 con `llama-index-retrievers-ragmir` 6.20.0 sobre las once guías
de la carpeta `docs/` de Ragmir, tardó 53 segundos en un Apple M3 Max, sobre todo en la generación.
Terminó con las cuatro fuentes citadas:

```text
[...]
*   **Runtime:** The container can ingest and search with `--network none` because `local-hash` does not make any network calls.
[...]
docs/server-deployment.md:L123-L138#8
docs/docker.md:L96-L105#5
docs/python.md:L211-L218#12
docs/agent-integration.md:L43-L54#6
```

Desde los metadatos de los nodos, solo la cita y su ruta de contexto llegan al prompt del LLM.

Los nodos conservan el orden de ranking de Ragmir y no tienen puntuación de similitud. Lee su orden,
no una puntuación.

## Lo que el retriever aporta a los archivos locales

- Más de 900 extensiones y nombres de archivo se indexan sin instalar nada más. Los PDF escaneados,
  las fotos y los archivos `.doc` antiguos usan extractores locales que tú activas.
- Las citas siguen el formato de cada archivo. `docs/runbook.md:L12-L18#3` cita líneas, y
  `contracts/msa-acme-2026.pdf:p7#3` cita una página PDF. Otros formatos usan coordenadas de
  diapositiva, hoja y celda, o de sección con nombre.
- La búsqueda no devuelve nada cuando la evidencia es débil. Así, una pregunta que los documentos no
  cubren puede responderse como tal, en lugar de hacerlo con el pasaje más cercano.
- La recuperación predeterminada `local-hash` no necesita API de embeddings ni GPU. Un modelo
  semántico local es opcional.

## Límites

- Ragmir no llama a ningún modelo ni abre ningún puerto. El LLM que llama tu query engine recibe los
  pasajes en su prompt, así que un modelo alojado los verá.
- Ragmir no filtra resultados por usuario. Autentica a los llamantes en tu aplicación. Da a cada
  audiencia su propia base.
- Una ingesta iniciada desde el cliente de Python se rechaza mientras `rgr security-audit` emite
  avisos, por ejemplo cuando hay comandos de OCR local configurados. Ejecuta
  `run_cli("/path/to/project", "ingest")` desde un script de operador.
- En un servicio de larga ejecución, usa un cliente de Ragmir por proyecto y ciérralo al apagar.

## Próximos pasos

- [Usar Ragmir desde Python](/docs/python/)
- [Formatos admitidos](/docs/supported-formats/)
- [Retriever local de LangChain con citas](/es/integraciones/langchain/)
