---
title: "RAG para buscar empleo: cartas que citan tus pruebas | Ragmir"
description: "Indexa tu CV, evaluaciones anuales e informes de proyecto, cruza una oferta con tus pruebas y redacta cartas sin inventar nada, con cada afirmación citada."
h1: "Buscar empleo con RAG: relaciona cada oferta con tus pruebas, sin inventar nada"
summary: "Indexa todos tus CV, evaluaciones anuales e informes de proyecto. Después, compara una oferta de trabajo con tus propias pruebas y redacta una carta de presentación en la que cada afirmación apunte a la página de la que procede. Ragmir encuentra y cita; el asistente redacta, y tú decides qué se envía."
section: use-case
setup: local
translationKey: "use-cases/job-search"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "use-cases/youtube-research"]
---

Una buena carta de presentación es concreta: un resultado, un proyecto, una cifra de tu última
evaluación. Con los años, esas pruebas acaban repartidas entre CV antiguos, documentos de evaluación
e informes. Ragmir las indexa en un solo lugar, así que un asistente puede elegir la evidencia que
encaja con una oferta y citar de dónde procede.

## Qué va a la base

- **Todas las versiones de tu CV**, en PDF o Word, citadas por página o por pasaje.
- **Evaluaciones anuales y feedback** de tus empleadores, citados por página.
- **Informes de proyecto, presentaciones y textos** que hayas escrito, citados por página,
  diapositiva o línea.
- **Cartas de presentación anteriores y notas de candidaturas** en Markdown o Word.
- **Certificados, referencias y una lista de habilidades** que conserves.

Ragmir indexa más de 900 tipos de archivo; la [lista de formatos
admitidos](/docs/supported-formats/) los enumera todos. Los escaneos y las imágenes necesitan el OCR
local opcional.

## Prepara la carpeta

Guarda los documentos en una sola carpeta, añádela como fuente y construye el índice. Esto requiere
Node.js 22.12 o posterior:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "career/**"
npx rgr ingest
```

Para los documentos escaneados, comprueba el motor de OCR local y después configúralo:

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

Guarda cada oferta de empleo como archivo de texto, Markdown o PDF en la carpeta, o pégala en el
chat. Vuelve a ejecutar `npx rgr ingest` cuando añadas documentos; solo lee los archivos nuevos o
modificados.

## Cruza la oferta y después redacta con citas

Pide al asistente que trabaje solo con tu evidencia. Por ejemplo:

```prompt
Aquí tienes una oferta de trabajo. Enumera sus cinco requisitos principales. Para cada uno, busca la evidencia en mis documentos y cita la página. Dime para qué requisitos no tengo evidencia.

Redacta una carta de presentación usando solo afirmaciones que puedas citar. Pon la cita después de cada afirmación, y no añadas una habilidad, un resultado ni una fecha que mis documentos no indiquen.

¿Cuáles de mis evaluaciones anuales mencionan el trabajo en equipo? Cita el pasaje textualmente y su fuente.
```

Tú también puedes lanzar la misma búsqueda a mano:

```bash
npx rgr search "resultados del proyecto de migración" --compact
```

Cuando los documentos no contienen evidencia, Ragmir no devuelve nada. Un requisito sin pasaje
citado es un hueco que debes contar con honestidad al reclutador, no algo que rellenar. Un pasaje
marcado con `weakEvidence` necesita una segunda revisión. El servidor MCP de Ragmir también incluye
un prompt `answer` que exige una cita en cada afirmación.

## Modelo local o asistente en la nube

Los documentos de tu carrera son privados: las evaluaciones contienen juicios y los CV, tus datos de
contacto. Un modelo local a través de Ollama es la opción más segura, porque nada sale de tu equipo.
El [tutorial de RAG local](/es/rag-local/) muestra la configuración, incluido cómo desactivar las
funciones en la nube de Ollama.

Un asistente en la nube también funciona. Recibe los pasajes que lee, no toda la carpeta, y entonces
se aplica la política de su proveedor. Revisa entrenamiento, retención, región, acceso y alcance en
la [guía de RAG local o en la nube](/es/rag-local-o-nube/) antes de conectar uno.

## Límites

- El asistente redacta; tú decides. Revisa cada página citada antes de enviar una carta.
- Ragmir no presenta candidaturas, no rellena formularios ni manda correos. No lee portales de
  empleo.
- No ofrece asesoramiento profesional, legal ni de recursos humanos, y no puede juzgar si encajas en
  un puesto.
- La carta es tan buena como tus documentos. Pocas pruebas dan una carta corta.
- El OCR puede leer mal un escaneo. Compara la página citada con el original.

## Próximos pasos

- [Tutorial de RAG local: documentos, Ollama y solo CPU](/es/rag-local/)
- [RAG local o en la nube: modelos, hardware y tus datos](/es/rag-local-o-nube/)
- [Citas RAG: línea, página, diapositiva y celda](/es/rag-citas/)
- [Formatos admitidos](/docs/supported-formats/)
