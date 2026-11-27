---
title: "Citas en RAG: líneas, páginas, diapositivas y celdas exactas | Ragmir"
description: "Cómo es una cita de RAG verificable: coordenadas de línea, página de PDF, diapositiva, celda, elemento de EPUB o sección según el formato, y cómo Ragmir la verifica."
h1: "RAG con citas: fuentes exactas que puedes comprobar"
summary: "Una cita de RAG indica el pasaje de origen que respalda una respuesta. Ragmir cita cada pasaje con su ruta en el proyecto y una coordenada nativa: líneas, una página de PDF, una diapositiva, un rango de hoja y celdas, un elemento del lomo de un EPUB o una sección con nombre. Solo emite una coordenada cuando puede verificarla."
section: guide
setup: agents
translationKey: "rag-citations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["rag-vs-mcp", "local-rag", "use-cases/forward-deployed-engineers", "self-hosted-rag"]
---

Una buena cita permite al lector abrirla y llegar al texto que respalda la afirmación. Un nombre de
archivo por sí solo obliga al lector a buscar otra vez en el documento. Una página equivocada lo
lleva al texto equivocado.

Ragmir devuelve una cita con cada pasaje, construida a partir del origen analizado. Vuelve a
comprobar la cita cuando se amplía el pasaje. El agente o la aplicación que redacta la respuesta
cita la referencia junto a la afirmación que respalda.

## Cómo es una cita de Ragmir

```text
contracts/msa-acme-2026.pdf:p7#3
```

- `contracts/msa-acme-2026.pdf` es la ruta relativa al proyecto, guardada con barras normales y en
  Unicode NFC en todas las plataformas.
- `:p7` es la coordenada: la página 7 del PDF.
- `#3` es el índice del pasaje (el fragmento) dentro del documento.

La forma es la misma para todos los formatos. Solo cambia la coordenada. Por ejemplo,
`docs/adr/0012-authentication.md:L18-L26#2` cita las líneas 18 a 26.
`book.xlsx:sheet=Dashboard:cells=A2-F12#0` cita un rango de celdas.

<figure>
  <img src="/guides/citations-search.webp" alt="Terminal con dos búsquedas de rgr. La primera devuelve specs/nist-sp-800-63b-4.pdf:p25#56 con el pasaje sobre el cambio periódico de contraseñas. La segunda devuelve docs/server-deployment.md:L125-L140#8 con la sección sobre cómo ejecutar Ragmir sin acceso a internet." width="1440" height="763" loading="lazy" decoding="async">
  <figcaption>Dos búsquedas sobre un mismo índice de guías en Markdown y un PDF público del NIST, con Ragmir 6.20.0: una página para el PDF y un rango de líneas para el archivo Markdown.</figcaption>
</figure>

## Coordenadas de cita por formato

| Fuente | Coordenada | Ejemplo de la documentación |
| --- | --- | --- |
| Código, Markdown y otro texto, CSV, la mayoría de la configuración | Líneas de origen | `:L10-L12`, `docs/runbook.md:L12-L18#3` |
| PDF | Página, o un rango de páginas cuando páginas consecutivas cortas comparten un pasaje | `:p3`, `agenda.pdf:p1-p9#0` |
| PowerPoint | Diapositiva | `:slide12` |
| Excel | Rango de hoja y celdas; las filas consecutivas de una misma tabla comparten un pasaje | `:sheet=Finance%20Ops:cells=A7-D7` |
| EPUB | Elemento del lomo | `:spine2` |
| Word, JSON, YAML, correo `.eml` y `.msg` | Número de pasaje | `specs/account-recovery.docx#2` |
| Modelos de datos, diagramas, descripciones de API, buzones, archivos de diseño, notas, GeoJSON, SARIF | Sección con nombre por objeto, o líneas | `model.pdm:section=Table%20INVOICE#3` |
| Páginas escaneadas, imágenes, `.doc` heredado (extractor local opcional) | Página o pasaje | |

Los pasajes de Markdown también incluyen su ruta de encabezados. Dos tablas de una hoja de cálculo,
dos hojas o un gráfico de hoja nunca comparten un pasaje.

[Formatos compatibles](/docs/supported-formats/) enumera cada extensión y su cita.

## Citas por número de página en PDF

- Primero se extrae el texto incrustado del PDF. El OCR local opcional solo se ejecuta en las
  páginas sin texto extraído. Trabaja en lotes acotados, con una caché indexada por la suma de
  comprobación del origen y la página, entre otros campos.
- Cuando páginas consecutivas cortas comparten un pasaje, la cita nombra todo el rango, como
  `agenda.pdf:p1-p9#0`, en lugar de una sola página.
- Las coordenadas de línea aparecen solo en texto que conserva su origen. Un pasaje de PDF nunca
  recibe líneas de origen inventadas. Sus coordenadas no son desplazamientos de bytes dentro del
  archivo binario.

<figure>
  <img src="/guides/citations-pdf-page.webp" alt="Página 25 de NIST SP 800-63B-4, sección 3.1.1.2 Password Verifiers, con el requisito 6 resaltado: los verificadores y los CSP no deben exigir a los suscriptores que cambien sus contraseñas periódicamente." width="1536" height="1342" loading="lazy" decoding="async">
  <figcaption>El pasaje que cita <code>specs/nist-sp-800-63b-4.pdf:p25#56</code>, resaltado aquí en su página. <code>p25</code> cuenta las páginas del archivo: la propia página imprime el número 14.</figcaption>
</figure>

## Cuando las citas de página fallan

Las citas de página pueden fallar de al menos dos maneras:

- La página se desplaza y la cita apunta a una página de diferencia.
- El número de página se pierde entre la indexación y la visualización, así que el visor abre el
  documento al principio.

Dos informes públicos de errores del proyecto Open WebUI muestran ambos casos:

- [Issue #33603](https://github.com/open-webui/open-webui/issues/33603) informó de que los PDF
  indexados con Docling no tenían `page_label`. El modelo abrió y citó la página anterior a la
  correcta.
- [Issue #35108](https://github.com/open-webui/open-webui/issues/35108) informó de que las citas
  nativas de Knowledge perdían el número de página del PDF y se abrían al principio del documento.

Ambos están cerrados.

En Ragmir, la página forma parte de la cadena de la cita, así que viaja a donde vaya la cita. El
recuperador de LangChain.js también conserva la cita y su rango de líneas o páginas en los
`metadata` de cada documento. Las coordenadas solo se emiten cuando son verificables.

También puedes probarlas. En un archivo de referencia, `expectedCitations` exige citas exactas. Un
umbral `exactCitationRate` hace fallar `rgr evaluate` cuando se desvían. Reserva las citas exactas
para los hechos que deben citarse con precisión, porque cambian cuando se edita el archivo. El
[benchmark de evidencia
documental](https://github.com/jcode-works/ragmir/blob/main/packages/ragmir-core/examples/document-evidence-benchmark/README.md)
del repositorio aplica del mismo modo una cita exacta de página de PDF.

Ragmir no incluye visor de documentos. La aplicación que muestra la respuesta debe abrir el archivo
en la página citada y resaltar el pasaje. Prueba ese último paso en tu propia interfaz.

## Cómo comprueba la ampliación el origen

1. `sourceStatus: "modified"` o `"missing"` marca un resultado cuyo archivo cambió o desapareció
   después de indexarse. Cuesta un `stat` por archivo citado.
2. `evidence.id` identifica el pasaje indexado. Pásalo como `expectedEvidenceId` a `expandCitation`
   (o a `ragmir_expand`). El contenido indexado modificado se rechaza entonces con
   `EVIDENCE_CHANGED`.
3. Una cita cuyas líneas se han movido falla, y el mensaje indica la cita actual del pasaje. Una
   cita que no encuentra nada devuelve `found: false` con un `suggestedCitation` o `similarPaths`.
4. `rgr audit --knowledge` comprueba las citas escritas en páginas Markdown. Informa de
   `brokenCitations` cuando su pasaje cambió o salió del índice.

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

Una cita muestra de dónde procede un pasaje. No demuestra que el pasaje responda a todo lo que
plantea la pregunta. Amplía la evidencia y revisa excepciones y datos ausentes antes de actuar.

## Próximos pasos

- [Formatos compatibles y sus citas](/docs/supported-formats/)
- [API de TypeScript: búsqueda y ampliación](/docs/api-reference/)
- [RAG frente a MCP](/es/rag-vs-mcp/)
- [Tutorial de RAG local](/es/rag-local/)
