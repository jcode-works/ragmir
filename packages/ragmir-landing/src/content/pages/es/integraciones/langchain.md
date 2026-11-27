---
title: "Retriever local de LangChain con citas | Ragmir"
description: "Usa Ragmir como retriever local de LangChain en JavaScript o Python: cada documento incluye una cita exacta en sus metadatos, y herramientas de búsqueda para LangGraph."
h1: "Retriever local de LangChain con citas"
summary: "RagmirRetriever devuelve documentos de LangChain cuyos metadatos contienen una cita exacta, tanto en LangChain.js como en Python. Busca en un índice creado en tu máquina, no devuelve nada cuando los documentos no tienen evidencia e incluye herramientas de búsqueda y ampliación para agentes de LangChain y LangGraph."
section: integration
setup: app
translationKey: "integrations/langchain"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-vs-cloud-rag", "integrations/llamaindex", "docs/api-reference", "docs/python"]
logo: "langchain"
group: "frameworks"
---

El retriever de Ragmir da a una cadena o a un agente de LangChain documentos con una cita en sus
metadatos.

Un retriever de LangChain convierte una pregunta en documentos. El retriever de Ragmir busca en un
índice de los archivos que elijas, creado en la máquina que ejecuta Ragmir.

La recuperación predeterminada `local-hash` funciona sin conexión, en la CPU. No necesita GPU, API
de embeddings ni servidor de base de datos. El índice es un almacén LanceDB integrado en la carpeta
`.ragmir/`, que Git ignora.

LangChain.js y el paquete de Python leen el mismo índice que el servidor MCP y la CLI de Ragmir, y
devuelven las mismas citas.

## Indexa los documentos

Indexa fuera de la ruta de las peticiones: durante la configuración, el despliegue, la CI o un
trabajo programado. La búsqueda nunca indexa. Desde la raíz del proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

`sources add` admite más globs, como `"contracts/**/*.pdf"`, para indexar PDF, archivos de Office o
código junto al Markdown.

La indexación es incremental. Los archivos sin cambios se reutilizan. El índice anterior sigue
disponible para buscar hasta que el nuevo supere la validación.

## Retriever de LangChain.js

Instala la dependencia opcional `@langchain/core` 1.x junto a Ragmir:

```bash
npm install @jcode.labs/ragmir@6.20.0 @langchain/core
```

```ts
import { createRagmirClient } from "@jcode.labs/ragmir"
import { RagmirRetriever } from "@jcode.labs/ragmir/langchain"

const ragmir = await createRagmirClient({ cwd: process.cwd() })
const retriever = new RagmirRetriever({ client: ragmir, topK: 3, includePaths: ["docs"] })
try {
  const documents = await retriever.invoke("run on a server without internet access")
  for (const document of documents) {
    console.log(document.metadata.citation, document.pageContent.slice(0, 80))
  }
} finally {
  await ragmir.close()
}
```

Ejecutado el 27 de noviembre de 2026 con Ragmir 6.20.0 y `@langchain/core` 1.5.1, sobre las once
guías de la carpeta `docs/` de Ragmir, imprimió cada cita y el inicio de su pasaje:

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access

Build the image where the npm registry is reachable,
docs/docker.md:L96-L105#5 ## Servers and CI

Run `rgr ingest` from a scheduled job after the documents cha
docs/python.md:L211-L218#12 ## Without Node.js

Without Node.js, the client runs the official image, so Dock
```

Cada documento conserva en sus metadatos `source`, `citation`, los rangos de líneas o de páginas,
`contextPath`, `weakEvidence` y `sourceStatus`.

Una pregunta que las fuentes no pueden responder devuelve un array vacío. La cadena puede entonces
decirlo, en lugar de responder con texto no relacionado.

El retriever acepta las mismas opciones de búsqueda que `search` del cliente, como `includePaths`,
`scope` o `searches`. Las excepciones son `explain` y `signal`.

Pasa `projectRoot` en lugar de `client` para que el retriever abra su propio cliente. Después, llama
a `retriever.close()` al cerrar la aplicación.

## Retriever de Python

```bash
pip install langchain-ragmir
```

```python
from langchain_ragmir import RagmirRetriever

retriever = RagmirRetriever(project_root="/path/to/project", k=4, include_paths=["docs"])
for document in retriever.invoke("How do I run Ragmir on a server without internet access?"):
    print(document.metadata["citation"], document.page_content[:70].replace("\n", " "))
```

Con `langchain-ragmir` 6.20.0 sobre Python 3.12, el mismo índice respondió:

```text
docs/server-deployment.md:L123-L138#8 ## Without internet access  Build the image where the npm registry is
docs/docker.md:L96-L105#5 ## Servers and CI  Run `rgr ingest` from a scheduled job after the doc
docs/python.md:L211-L218#12 ## Without Node.js  Without Node.js, the client runs the official imag
docs/agent-integration.md:L43-L54#6 ## Choose where inference runs  | Setup | Where evidence goes | What y
```

El paquete requiere Python 3.11 o posterior. Usa el motor propio de Ragmir, así que también necesita
Node.js 22.12 o posterior, o Docker. Prefiérelo a `langchain-mcp-adapters`, que ya no se mantiene.

## RAG con citas en agentes de LangChain y LangGraph

Para RAG agéntico, da al agente herramientas en lugar de un paso de recuperación fijo:

```python
from langchain.agents import create_agent
from langchain_ragmir import RagmirToolkit

agent = create_agent(
    "anthropic:claude-sonnet-5-5",
    tools=RagmirToolkit(project_root="/path/to/project").get_tools(),
    system_prompt="Answer from the project documents and cite every claim with its citation.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "What is the refund policy?"}]})
```

Este agente llama a la API de Anthropic, así que necesita tu clave. No se ejecutó para esta página.

El toolkit tiene dos herramientas:

- `ragmir_search` responde al modelo con citas numeradas y el texto de los pasajes. Marca las
  coincidencias débiles y los archivos modificados, y conserva los documentos como artefacto del
  mensaje de la herramienta.
- `ragmir_expand` lee una cita con sus vecinos y la siguiente cita que conviene leer.

En LangChain.js, `createRagmirTools({ client })` da a `createAgent` y a los agentes de LangGraph las
mismas dos herramientas. Las herramientas superan las suites de pruebas estándar de LangChain para
retrievers y herramientas.

## Límites

- Ragmir no llama a ningún modelo ni abre ningún puerto. Tu aplicación elige el modelo, escribe el
  prompt y decide adónde van los pasajes. Un modelo alojado recibe los pasajes que le envíes.
- Ragmir no filtra resultados por usuario. Autentica y autoriza al llamante antes de buscar. Da a
  cada audiencia su propia base.
- En un proceso de larga ejecución, abre un cliente por raíz de proyecto y ciérralo al apagar. Un
  retriever nunca cierra un cliente que le hayas pasado.
- Revisa los pasajes marcados como `weakEvidence` (`weak_evidence` en Python) antes de apoyarte en
  ellos.

## Próximos pasos

- [Retriever de LlamaIndex para archivos locales](/es/integraciones/llamaindex/)
- [Referencia de la API de TypeScript](/docs/api-reference/)
- [Usar Ragmir desde Python](/docs/python/)
