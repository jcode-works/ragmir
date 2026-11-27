---
title: "RAG para incidentes: diagnóstico con citas antes de corregir | Ragmir"
description: "Basa una corrección de guardia en tus runbooks, postmortems y código: Claude Code o Codex diagnostica el incidente con citas de Ragmir y después añade una prueba."
h1: "RAG para respuesta a incidentes: diagnostica con tus runbooks y añade una prueba"
summary: "Indexa una sola vez tus runbooks, los informes de incidentes anteriores y el código fuente. Cuando se dispara un incidente, tu agente de código lo diagnostica a partir de esos documentos, cita cada fuente y solo entonces cambia el código y añade una prueba. Ragmir encuentra y cita; el agente razona y edita."
section: use-case
setup: agents
translationKey: "use-cases/incident-response"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["claude-code-rag", "integrations/claude-code", "integrations/codex", "rag-citations"]
---

A las 3 de la madrugada, el checkout agota el tiempo de espera. La respuesta suele estar escrita: un
paso del runbook, un postmortem de la última vez que pasó, un comentario en el código que llama al
servicio de pagos. Ragmir permite que tu agente de código encuentre esas páginas y las cite antes de
tocar el código de producción.

## Qué va a la base

- **Runbooks y guías de guardia** en Markdown, citados por línea.
- **Postmortems e informes de incidentes** en Markdown, Word o PDF, citados por línea o por página.
- **Notas de arquitectura y ADR**, para que el agente sepa por qué existe un timeout o un reintento.
- **Código fuente y configuración**, citados por línea, en los lenguajes y formatos que Ragmir lee.
- **Registros exportados o reglas de alertas** que decidas conservar, como archivos `.log`, `.json`
  o `.yaml`.

Ragmir indexa más de 900 tipos de archivo; la [lista de formatos
admitidos](/docs/supported-formats/) los enumera todos. Las credenciales, los archivos `.env` y las
claves nunca llegan al índice.

## Prepara la carpeta

Ejecuta estos comandos en el repositorio, o en una carpeta que contenga los runbooks junto a él:

```bash
npm install -D @jcode.labs/ragmir
npx rgr init
npx rgr sources add "docs/runbooks/**" "docs/postmortems/**" "src/**"
npx rgr ingest
```

Después, conecta tu agente. Las páginas de [Claude Code](/integrations/claude-code/) y
[Codex](/integrations/codex/) explican cómo cada uno inicia el servidor MCP de Ragmir en tu equipo.
Las skills de abajo enseñan al agente el bucle de búsqueda, ampliación y refinamiento:

```bash
npx skills add jcode-works/ragmir
```

La indexación es incremental. Vuelve a ejecutar `npx rgr ingest` después de cada postmortem que
añadas; solo lee los archivos nuevos o modificados.

## Diagnostica con citas y luego corrige

Dale al agente el síntoma y la regla de que la corrección espera al diagnóstico:

```prompt
Las peticiones de checkout agotan el tiempo de espera desde el último despliegue. Antes de cambiar cualquier código, busca en los runbooks, en los postmortems anteriores y en el cliente de pagos. Cita cada fuente en la que te apoyes.

¿Ha ocurrido antes este fallo? ¿Qué cambió el postmortem, y sigue ese cambio en el código?

Propón la corrección, nombra el pasaje citado que la justifica, y después implémentala y añade una prueba.
```

El agente busca, amplía con `ragmir_expand` los pasajes que necesita y cita cada uno. Cuando los
documentos no contienen evidencia, Ragmir no devuelve nada y el agente lo dice, en lugar de adivinar
solo a partir del síntoma. Un pasaje marcado con `weakEvidence` merece una segunda revisión.

También puedes ejecutar tú la misma búsqueda:

```bash
npx rgr search "tiempo de espera pago checkout" --compact
```

## Mantén el runbook honesto

Un incidente también es una prueba de tus documentos. Si el agente tuvo que decir «sin evidencia»,
el runbook tiene un hueco. Escribe el paso que falta una vez cerrado el incidente y vuelve a
indexarlo.

- El agente puede listar lo que cambió desde la última sesión con `ragmir_sources` y `changedSince`.
- `rgr audit` compara tus fuentes con el índice y enumera los archivos que faltan, están
  desactualizados u omitidos.
- El prompt `answer` del servidor MCP de Ragmir exige una cita para cada afirmación y una
  declaración clara cuando los documentos no tienen evidencia.

## Mantén el índice en local o usa una IA en la nube

El índice se queda en tu equipo en cualquiera de los dos casos. Claude Code y Codex envían al modelo
de su proveedor los pasajes que leen. Los runbooks y el código pueden nombrar hosts internos,
clientes o incidentes, así que elige qué carpetas entran en la base. La [guía de RAG local o en la
nube](/local-vs-cloud-rag/) enumera qué revisar: entrenamiento, retención, región, acceso y alcance.

## Límites

- Ragmir no vigila tus sistemas. Lee documentos, no métricas, trazas ni paneles en vivo. Pega o
  exporta los datos que necesite el agente.
- Los pasajes recuperados pueden estar incompletos. El agente debe comprobar que el dato que
  necesita está presente.
- El agente escribe la corrección y la prueba. Revisa el diff y ejecuta las comprobaciones antes de
  desplegar.
- Ragmir no avisa a nadie, no ejecuta comandos en producción ni cierra el incidente.

## Próximos pasos

- [Claude Code con Ragmir](/integrations/claude-code/)
- [Codex con Ragmir](/integrations/codex/)
- [Citas RAG: línea, página, diapositiva y celda](/rag-citations/)
- [RAG local o en la nube: modelos, hardware y tus datos](/local-vs-cloud-rag/)
