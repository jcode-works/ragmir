---
title: "RAG local o en la nube: modelos, hardware y tus datos | Ragmir"
description: "Ejecuta RAG en local, en tu servidor o con una IA en la nube: los modelos que necesita cada opción, la máquina para ejecutarlos y lo que recibe el proveedor."
h1: "RAG local o en la nube: qué modelos ejecutar y adónde van tus documentos"
summary: "El índice de Ragmir siempre se queda en la máquina que lo ejecuta. Lo que cambia es el modelo que redacta las respuestas: en tu equipo, en tu servidor o en un proveedor en la nube que recibe los pasajes que envías. Aquí tienes la configuración y el hardware de cada opción, y qué revisar antes de que los documentos lleguen a un modelo en la nube."
section: guide
setup: local
translationKey: "local-vs-cloud-rag"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "air-gapped-rag", "self-hosted-rag", "docs/agent-integration"]
---

Una configuración de RAG ejecuta dos modelos, y tú eliges dónde se ejecuta cada uno. Ragmir se
encarga de la recuperación: encuentra los pasajes y los cita. Otro modelo lee esos pasajes y redacta
la respuesta.

## Dos modelos, dos decisiones

| Parte | Qué hace | Dónde se ejecuta |
| --- | --- | --- |
| Recuperación, en Ragmir | Indexa tus archivos y devuelve pasajes citados para cada pregunta | En la máquina que ejecuta Ragmir, siempre |
| Respuesta, en tu chat, agente o aplicación | Lee los pasajes y redacta la respuesta | A tu elección: tu equipo, tu servidor o un proveedor en la nube |

Por defecto, la recuperación no necesita ningún modelo. La respuesta siempre necesita uno, y esa
elección decide adónde van tus documentos.

## Recuperación: el modelo y la máquina que necesita

La recuperación predeterminada, `local-hash`, ordena la evidencia por palabras clave con BM25 y no
necesita modelo, GPU ni clave de API. Añade un modelo semántico cuando las preguntas usen palabras
que tus documentos no usan, como sinónimos u otro idioma.

| Configuración | Mínimo | Cómodo |
| --- | --- | --- |
| Búsqueda por palabras clave, `local-hash` (la predeterminada) | Ningún modelo, GPU ni clave de API, y nada que descargar | La memoria crece con el corpus |
| Semántica, `mxbai-embed-xsmall-v1` (inglés) | 0,75 GB de memoria para indexar, descarga de 97 MB | 1,5 GB de memoria y 2 CPU |
| Semántica, Granite R2 (multilingüe, elegido en la mayoría de equipos) | 1 GB de memoria, descarga de 124 MB | 2 GB y 2 CPU |
| Semántica, `multilingual-e5-small` | 1,5 GB de memoria, descarga de 492 MB | 3 GB y 2 CPU |
| Semántica, `Qwen3-Embedding-0.6B` | 4 GB de memoria, descarga de 624 MB | 8 GB y 2 CPU |

Estas cifras proceden de los [requisitos del
sistema](https://github.com/jcode-works/ragmir#system-requirements) del README de Ragmir.
En un proyecto que instala Ragmir, compruébalas con tu propia máquina, incluido el límite de
memoria de un contenedor:

```bash
npx rgr models list
```

Para ejecutar un modelo semántico dentro de Ragmir, instala el entorno de ejecución opcional y deja
que Ragmir elija el modelo que encaja con la máquina. La descarga se hace una sola vez, y la
recuperación normal mantiene desactivada la carga remota de modelos.

```bash
npm install -D @huggingface/transformers
npx rgr setup --semantic
npx rgr ingest --rebuild
```

Para generar embeddings con un modelo que ya sirves con Ollama, vLLM o LM Studio, apunta Ragmir a su
API compatible con OpenAI en `ragmir.config.json`:

```json
{
  "embeddingProvider": "openai-compatible",
  "embeddingEndpoint": "http://localhost:11434/v1",
  "embeddingModel": "nomic-embed-text"
}
```

Con un endpoint, el texto de los pasajes y las consultas se envían a ese endpoint. Mantenlo en la
máquina o en tu propio servidor para fuentes confidenciales. `rgr security-audit` avisa cuando el
endpoint no es local.

## Respuesta: tres lugares para ejecutar el modelo

### En tu equipo, con Ollama

Nada sale de la máquina cuando el chat o el script también se ejecutan en local. Primero desactiva
las funciones en la nube de Ollama con `"disable_ollama_cloud": true` en `~/.ollama/server.json` y
reinicia Ollama: un endpoint en localhost, por sí solo, no demuestra que la inferencia sea local.

El [tutorial de RAG local](/es/rag-local/) ejecuta esta configuración de principio a fin. El 27 de
noviembre de 2026, `gemma4:12b-it-qat` (una descarga de 7,2 GB en Ollama) respondió a partir de los
pasajes de Ragmir en 49 segundos en un Apple M3 Max:

```bash
node answer.mjs "gemma4:12b-it-qat" "How do I run Ragmir on a server without internet access?"
```

Como regla general, un modelo local necesita memoria libre por encima de su tamaño de descarga,
además del espacio para los pasajes y la pregunta que le envías. Los modelos más pequeños responden
más rápido y captan menos matices.

### En tu propio servidor

El mismo script llama a cualquier endpoint que hable el formato de chat completions, como un
servidor vLLM que ejecutes tú. Pasa cualquier clave a través de la configuración de secretos de tu
entorno de ejecución y, después, define la URL del chat y el modelo desplegado:

```bash
LLM_API=chat-completions \
LLM_CHAT_URL=https://llm.example.org/v1/chat/completions \
node answer.mjs "your-deployed-model" "How is a release approved?"
```

La pregunta y los pasajes ampliados cruzan la red hasta tu endpoint. Tú controlas el despliegue, el
acceso, el transporte, la retención y los registros.

### En un proveedor en la nube

Los agentes de código como Claude Code, Codex, Cursor y Gemini CLI ejecutan el servidor MCP de
Ragmir en tu máquina y, después, envían los pasajes que leen al modelo de su proveedor. Las
[integraciones](/es/integraciones/) cubren cada uno.

Una aplicación puede hacer lo mismo con el SDK del proveedor. La [guía de integración con
agentes](/docs/agent-integration/) incluye un ejemplo con Claude: tres pasajes y la pregunta llegan
a la API de Anthropic, mientras el índice y los demás documentos se quedan donde se ejecuta Ragmir.

## Adónde van tus documentos

| Configuración | Adónde va la evidencia | Qué controlas |
| --- | --- | --- |
| Modelo y chat en local, por ejemplo Ollama | Los pasajes se quedan en la máquina cuando toda la aplicación se ejecuta en local, sin reenvíos externos | Los pesos del modelo, el historial del chat, los registros, las extensiones y el acceso a la máquina |
| Modelo autoalojado en tu servidor o en infraestructura de nube alquilada | Los pasajes seleccionados cruzan la red hasta tu endpoint de inferencia | El despliegue, los controles de acceso, el transporte, los registros, las copias de seguridad y el acuerdo de alojamiento |
| API de modelo gestionada o agente en la nube | Los pasajes seleccionados llegan al proveedor elegido a través de la aplicación que los consume | La selección de fuentes y la configuración de la aplicación; también importan las políticas de datos aplicables del proveedor |

Un índice local no convierte en local una conversación remota. Los resultados de las herramientas
pueden contener texto de los documentos, citas, nombres de archivo y rutas del proyecto. Ragmir
conserva el texto de origen sin enmascararlo.

## Antes de que tus documentos lleguen a un modelo en la nube

El proveedor recibe lo que envía tu agente o aplicación. Ragmir no aplica la política de un
proveedor y no anonimiza los pasajes. Antes de conectar un modelo en la nube, revisa estos puntos
para el plan y la cuenta que realmente usas:

- **Entrenamiento.** Si el proveedor puede entrenar sus modelos con tus prompts y con los pasajes
  que contienen, y si un ajuste o tu plan lo cambia. Las aplicaciones de chat para consumidores y
  los planes para empresas o de API pueden tener valores predeterminados distintos.
- **Retención.** Cuánto tiempo se conservan los prompts, las salidas y los registros, y si tu cuenta
  puede usar una opción de retención más corta o nula.
- **Región.** Dónde se procesan y se almacenan los datos.
- **Acceso.** Quién puede leer los pasajes: en el proveedor y en tu propia infraestructura, como los
  proxies y las herramientas de monitorización.
- **Alcance.** Qué fuentes pueden salir de tu entorno. Deja las demás fuera de la base, o dales una
  base propia que solo lea un modelo local.

Nada de esto es asesoramiento jurídico. Consulta tus obligaciones con quien sea responsable del
cumplimiento normativo de los documentos.

## Tres configuraciones que funcionan

| Objetivo | Recuperación | Respuestas | Qué sale de la máquina |
| --- | --- | --- | --- |
| Totalmente sin conexión | `local-hash` o un modelo semántico ya preparado | Ollama con las funciones en la nube desactivadas | Nada |
| Infraestructura privada | Ragmir en tu servidor | Un modelo que alojas tú, como vLLM | Los pasajes, hasta tu propio endpoint |
| Mejor modelo, índice local | Ragmir mediante el plugin o MCP | El modelo en la nube de tu agente de código | Los pasajes que lee el agente |

La [guía sin conexión](/es/rag-sin-conexion/) cubre la primera configuración sin acceso a internet,
y la [guía autoalojada](/es/rag-autoalojado/) cubre la segunda en un VPS o en un servidor local.

## Próximos pasos

- [Crea un RAG local en tu máquina](/es/rag-local/)
- [Ejecuta RAG sin acceso a internet](/es/rag-sin-conexion/)
- [RAG autoalojado en un VPS o en un servidor local](/es/rag-autoalojado/)
- [Integración con agentes: en local, autoalojada o en la nube](/docs/agent-integration/)
