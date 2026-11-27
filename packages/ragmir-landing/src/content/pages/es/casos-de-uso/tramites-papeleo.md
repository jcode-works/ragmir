---
title: "RAG privado para trámites: IA local con prueba de página | Ragmir"
description: "Indexa extractos bancarios, nóminas, contratos y avisos fiscales en tu ordenador. Un modelo local responde y señala la página exacta, y nada sale del equipo."
h1: "Gestiona tus trámites con una IA local que señala la página exacta"
summary: "Guarda extractos bancarios, nóminas, contratos, certificados y avisos en una sola carpeta de tu ordenador. Ragmir los indexa allí, y un modelo local como Ollama responde preguntas o reúne un expediente con la página exacta como prueba. Ningún documento se envía a un servicio en la nube."
section: use-case
setup: local
translationKey: "use-cases/paperwork"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["local-rag", "local-vs-cloud-rag", "rag-citations", "air-gapped-rag"]
---

El papeleo plantea una y otra vez las mismas preguntas. ¿Qué nóminas demuestran mis ingresos? ¿Qué
dice el contrato sobre el preaviso? ¿Dónde está el aviso fiscal del año pasado? Las respuestas están
en PDF que escaneaste o descargaste, y son privados. Ragmir los indexa en tu equipo, así que un
modelo local puede responder y mostrar la página.

## Qué va a la base

- **Extractos bancarios, nóminas y facturas** en PDF, citados por página.
- **Contratos, pólizas de seguro y contratos de alquiler** en PDF o Word, citados por página o por
  pasaje.
- **Certificados, avisos fiscales y cartas** en PDF, o como fotos y escaneos con OCR local.
- **Hojas de cálculo propias**, como un presupuesto en Excel, citadas por hoja y celda, o una
  exportación CSV, citada por línea.
- **Correos que hayas guardado** como archivos `.eml` o `.mbox`.

Ragmir indexa más de 900 tipos de archivo; la [lista de formatos
admitidos](/docs/supported-formats/) los enumera todos. Las páginas escaneadas y las imágenes
necesitan el OCR local opcional, que ejecuta un comando en tu equipo.

## Prepara la carpeta

Crea una carpeta, por ejemplo `paperwork/`, guarda los documentos en una carpeta `documents/` dentro
de ella y abre una terminal en `paperwork/`. Esto requiere Node.js 22.12 o posterior:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "documents/**"
npx rgr ingest
```

Si algunos archivos son escaneos, comprueba el motor de OCR local y después configúralo:

```bash
npx rgr ocr doctor
npx rgr ocr setup
```

La indexación es incremental. Cuando llegue un extracto nuevo, colócalo en la carpeta y vuelve a
ejecutar `npx rgr ingest`.

## Pregunta con prueba de página

La búsqueda funciona por sí sola, sin ningún modelo. Cada resultado lleva una cita, como una página
de PDF:

```bash
npx rgr search "preaviso contrato de trabajo" --compact
```

Para obtener una respuesta en palabras, añade un modelo local. El [tutorial de RAG
local](/es/rag-local/) muestra cómo instalar Ollama y ejecutar un script corto que envía al modelo
solo los pasajes seleccionados. Pregúntale cosas como estas:

```prompt
Enumera las nóminas de los últimos tres meses y cita la página de cada una.

¿En qué página de mi contrato de alquiler figura el importe de la fianza?

Necesito un justificante de domicilio y otro de ingresos para una solicitud. ¿Cuáles de mis documentos los contienen? Indica la página y dime qué falta.
```

Si los documentos no contienen evidencia, Ragmir no devuelve nada y el modelo debe decirlo. Una
coincidencia débil se marca como `weakEvidence`.

## Mantenlo todo en local

Desactiva antes las funciones en la nube de Ollama, como explica el [tutorial de RAG
local](/es/rag-local/): establece `"disable_ollama_cloud": true` en `~/.ollama/server.json` y
reinicia Ollama. Una dirección localhost, por sí sola, no demuestra que el modelo funcione en local,
porque Ollama también admite modelos en la nube.

Con un modelo local y un chat local, el índice, la búsqueda y las llamadas al modelo se quedan en tu
equipo. Haz copias de seguridad de la carpeta como haces con tus otros archivos privados.

## Usa una IA en la nube

Un asistente en la nube también funciona, pero recibe los pasajes que lee. En trámites, eso puede
incluir números de cuenta, salarios y direcciones. La [guía de RAG local o en la
nube](/es/rag-local-o-nube/) enumera qué revisar: entrenamiento, retención, región, acceso y alcance.
Mantén fuera de la base que lee un asistente en la nube los documentos más sensibles.

## Límites

- El modelo redacta; tú compruebas. Abre cada página citada antes de enviar un documento a alguien.
- Ragmir no ofrece asesoramiento legal, fiscal ni financiero, y la respuesta de un modelo tampoco lo
  es.
- Ragmir no rellena formularios, no envía correos ni contacta con ninguna oficina. Lo haces tú o el
  asistente.
- El OCR puede leer mal un escaneo. Compara la página citada con el original.
- Un modelo local pequeño puede pasar por alto detalles. Pide la página y léela.

## Próximos pasos

- [Tutorial de RAG local: documentos, Ollama y solo CPU](/es/rag-local/)
- [RAG local o en la nube: modelos, hardware y tus datos](/es/rag-local-o-nube/)
- [Citas RAG: línea, página, diapositiva y celda](/es/rag-citas/)
- [Formatos admitidos](/docs/supported-formats/)
