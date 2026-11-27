---
title: "Plugin RAG para Claude Code con búsqueda local citada | Ragmir"
description: "Añade RAG a Claude Code con el plugin de Ragmir: instálalo, indexa un proyecto con /ragmir:index y obtén pasajes citados a línea, página, diapositiva o celda."
h1: "Cómo añadir RAG a Claude Code"
summary: "Instala el plugin de Ragmir con un solo comando y ejecuta /ragmir:index una vez en cada proyecto. Claude Code podrá buscar en tu código, especificaciones, PDF y archivos de Office, y citar cada pasaje hasta su línea, página, diapositiva o celda, mientras el índice permanece en tu máquina."
section: integration
setup: agents
translationKey: "integrations/claude-code"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["compare/claude-vs-rag", "local-vs-cloud-rag", "mcp-rag-server", "docs/agent-integration"]
logo: "claude"
group: "agents"
---

Instala el plugin de Ragmir, indexa un proyecto una vez y Claude Code podrá buscar en él con citas.

Claude Code lee archivos y ejecuta grep. Eso funciona con unos pocos archivos de texto. El plugin
añade un índice de los archivos que elijas, creado en tu máquina. Las herramientas MCP devuelven
pasajes citados a la línea exacta, a la página PDF, a la diapositiva o a la celda de la hoja de
cálculo.

El plugin incluye tres elementos:

- el comando `/ragmir:index`
- la skill de recuperación (`/ragmir:ragmir`)
- un servidor MCP con cinco herramientas de solo lectura y `ragmir_ingest`

El servidor ejecuta una versión fijada de Ragmir desde npm sobre el proyecto que Claude Code tiene
abierto. No necesita cuenta, clave de API ni almacén alojado.

## Instalar el plugin RAG de Claude Code

1. Instala el plugin:

   ```text
   /plugin install ragmir --marketplace jcode-works/ragmir
   ```

   Desde una terminal, la misma instalación requiere dos comandos. Con Claude Code 2.1.329, el 27 de
   noviembre de 2026, imprimieron:

   ```text
   $ claude plugin marketplace add jcode-works/ragmir
   ✔ Successfully added marketplace: ragmir (declared in user settings)
   $ claude plugin install ragmir@ragmir
   ✔ Successfully installed plugin: ragmir@ragmir (scope: user)
   ```

2. En cada proyecto, indexa las fuentes que Claude pueda leer:

   ```text
   /ragmir:index docs/**/*.md specs/**/*.pdf src/**/*.ts
   ```

   Sin argumentos, Claude propone las fuentes y pregunta antes de indexar.

3. Vuelve a ejecutar el comando de indexado cada vez que añadas fuentes:

   ```text
   /ragmir:index
   ```

También puedes crear el mismo índice a mano desde la raíz del proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 init
npx --yes @jcode.labs/ragmir@6.20.0 sources add "docs/**/*.md" "specs/**/*.pdf" "src/**/*.ts"
npx --yes @jcode.labs/ragmir@6.20.0 ingest
```

Omite `rgr setup --agents claude` en un proyecto que use el plugin, porque registra un segundo
servidor a nivel de proyecto. Sin el plugin, ese comando es la alternativa.

Claude Code inicia el servidor declarado en `.mcp.json` solo después de que lo apruebes. Hasta
entonces, `rgr doctor` informa de `approval=pending`.

## Úsalo día a día

Pide en lenguaje sencillo. La skill de recuperación hace que Claude busque en el índice antes de
responder una pregunta sobre el proyecto. Menciona Ragmir en la petición para asegurarte de que lo
haga. Estas peticiones cubren casi todo el día a día.

### Responder una pregunta con sus fuentes

```prompt
Usa Ragmir: ¿cómo revertimos una versión que ha fallado? Cita el archivo y las líneas de cada paso.
```

Claude busca, abre con `ragmir_expand` las una o dos citas que necesita y responde con citas como
`docs/release.md:L40-L58`.

### Buscar en una carpeta o en un tipo de archivo

```prompt
Busca solo los PDF de specs/ con Ragmir: ¿qué tiempo de respuesta promete el contrato?
```

La carpeta o el glob se convierte en `includePaths`, de modo que el código y otros documentos no
compiten con el contrato.

### Revisar los documentos antes de un cambio

```prompt
Antes de cambiar la política de reintentos, usa Ragmir para encontrar lo que dicen los documentos y los registros de decisiones sobre los reintentos, y enumera lo que el cambio contradiría.
```

### Leer un documento largo en orden

```prompt
Lee docs/migration.md con Ragmir desde el principio y enumera cada cambio incompatible con su cita.
```

El agente expande el primer pasaje y sigue `nextCitation` ventana a ventana, en lugar de cargar el
archivo completo de una vez.

### Encontrar lo que le falta al índice

```prompt
Usa Ragmir para listar los PDF indexados y luego audita las fuentes para detectar archivos que faltan o están desactualizados.
```

`ragmir_sources` enumera los documentos, y `ragmir_audit` compara los archivos del disco con el
índice.

### Actualizar tras una edición

```prompt
He actualizado docs/release.md. Actualiza el índice de Ragmir y vuelve a responder.
```

El agente llama a `ragmir_ingest`, que lee solo los archivos nuevos o modificados. El índice
anterior sigue disponible para buscar hasta que el nuevo supere la validación.

## Lo que Claude Code gana frente a grep y a la lectura de archivos

| | Claude Code por sí solo | Con Ragmir |
| --- | --- | --- |
| PDF, Office y escaneos | Se abren uno a uno; grep no puede buscar dentro de ellos | Se indexan una vez; los escaneos pasan por OCR local opcional, y cada pasaje se cita a su línea, página, diapositiva o celda |
| Palabras distintas | Solo coinciden las palabras exactas | Hasta cinco reformulaciones fusionadas en una búsqueda, y un aviso que nombra las palabras que ningún archivo contiene |
| Ventana de contexto | Archivos completos, leídos de nuevo en cada sesión | Tres citas compactas por defecto, dentro de 32 KB por llamada; los pasajes ya vistos regresan como avisos breves `seen` |
| Lo que no está en los documentos | Una coincidencia parcial puede acabar convertida en respuesta | No se devuelve nada cuando ningún pasaje contiene evidencia real; los pasajes débiles se marcan con `weakEvidence` |

En un repositorio de código pequeño, la búsqueda de Claude Code suele bastar. Grep sigue siendo la
herramienta para listar todas las apariciones o para buscar con una expresión regular. Ragmir
devuelve pasajes ordenados por relevancia.

## Una búsqueda y, después, una cita ampliada

Esta sesión se ejecutó el 27 de noviembre de 2026 con Ragmir 6.20.0 desde npm. El proyecto estaba
limpio y contenía las once guías de la carpeta `docs/` de Ragmir (11 archivos, 256 fragmentos,
indexados en menos de un segundo). Las respuestas son JSON. Las líneas siguientes conservan sus
citas y sus encabezados.

```text
ragmir_search({ query: "How do I run Ragmir on a server without internet access?" })
  [1] docs/server-deployment.md:L123-L138#8  Run Ragmir on a server > Without internet access
  [2] docs/docker.md:L96-L105#5              Run Ragmir with Docker > Servers and CI
  [3] docs/python.md:L211-L218#12            Use Ragmir from Python > Without Node.js
  3 compact citations, 2,244 bytes of text

ragmir_expand({ citation: "docs/server-deployment.md:L123-L138#8" })
  ## Without internet access
  Build the image where the npm registry is reachable, then move it with `docker save` and
  `docker load`, or install from your internal npm mirror. At runtime, `local-hash` makes no
  network call: the container above ingests and searches with `--network none`.
  [...]
  one passage, 2,295 bytes of text
```

Claude leyó 4,5 KB para llegar a la respuesta y al rango de líneas de su fuente. Abrir los tres
archivos citados completos habría costado 22 KB.

En una tarea más larga, los pasajes ya devueltos regresan como avisos breves `seen`. Una segunda
búsqueda gasta entonces su presupuesto en evidencia nueva.

Para una sola pregunta, usa el prompt `answer` del plugin (`/mcp__plugin_ragmir_ragmir__answer`).
Pide a Claude que cite cada afirmación y que lo indique cuando los documentos no tengan evidencia.

## Mantener la base de conocimiento al día

Un resultado cuyo archivo cambió después de indexarlo lleva `sourceStatus`. Entonces Claude puede
llamar a `ragmir_ingest`, que solo lee los archivos nuevos o modificados. El índice anterior sigue
disponible para buscar hasta que el nuevo supere la validación.

Para actualizar el índice tras cada commit, merge o checkout, ejecuta esto desde la raíz del
proyecto:

```bash
npx --yes @jcode.labs/ragmir@6.20.0 hooks install
```

## Límites

- El plugin necesita archivos locales. Funciona en Claude Code, no en el chat de Claude en la web,
  en el escritorio ni en las apps móviles.
- Ragmir devuelve la evidencia y Claude escribe la respuesta. Los fragmentos que Claude lee se
  envían a su proveedor de modelos, así que un índice local no hace local la conversación.
- Ragmir no puede tomar el modelo de Claude para su propio ranking. Los modelos de Claude no generan
  embeddings, y Claude Code no admite MCP sampling.
- `ragmir_ingest` se niega mientras haya configurado OCR local u otro extractor externo. Ejecuta la
  ingesta desde una terminal en su lugar.
- No hay interfaz para previsualizar documentos. Las citas apuntan a los propios archivos.

## Próximos pasos

- [Cómo funciona el servidor MCP de Ragmir](/es/servidor-mcp-rag/)
- [Guía de integración con agentes](/docs/agent-integration/)
- [Formatos admitidos](/docs/supported-formats/)
- [La misma configuración para Codex](/es/integraciones/codex/)
