---
title: "RAG en las instalaciones para Forward Deployed Engineers | Ragmir"
description: "Pon RAG en marcha sobre los documentos de un cliente dentro de su red: indexa en sus servidores, mide con rgr evaluate y entrega la CLI y las imágenes Docker."
h1: "RAG para forward deployed engineers, dentro del perímetro del cliente"
summary: "Indexa los documentos del cliente en su propia infraestructura, mide la recuperación con sus preguntas antes de que nadie confíe en las respuestas y deja tras de sí una CLI fijada, una imagen Docker y una configuración versionada. La aplicación del cliente conserva la interfaz, la autenticación y el acceso por usuario."
section: use-case
setup: agents
translationKey: "use-cases/forward-deployed-engineers"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["self-hosted-rag", "air-gapped-rag", "rag-citations", "local-rag"]
---

Ragmir cubre la parte de recuperación de poner RAG en producción sobre los documentos de un cliente,
dentro del perímetro del cliente.

El análisis, los embeddings, el índice y la búsqueda se ejecutan en un solo proceso de Node.js en la
máquina del cliente. No hay que declarar en una revisión de seguridad ningún API de embeddings, base
de datos vectorial, telemetría ni almacén alojado.

El servicio o agente del cliente conserva el modelo, la interfaz de usuario y las reglas de acceso.

## De la demo en el portátil al servidor del cliente

Empieza con una demo citada en un portátil y luego ejecuta el mismo `ragmir.config.json` en el
servidor del cliente. Linux, macOS y Windows se prueban en cada versión.

Los contenedores de Debian o Alpine ejecutan Ragmir como usuario no root, con un sistema de archivos
raíz de solo lectura y sin red.

- Apunta `storageDir` a un volumen persistente y monta los documentos en solo lectura.
- `local-hash` no necesita modelo y no hace llamadas de red. Prepara antes un modelo semántico o
  motores de OCR cuando las preguntas o los escaneos los necesiten
  ([RAG en red aislada](/es/rag-sin-conexion/)).
- Revisa la configuración y luego aprueba sus comandos y endpoints:

  ```bash
  rgr trust --yes
  ```

  En una imagen que construyes y revisas tú mismo, define `RAGMIR_TRUST_PROJECT_CONFIG=1` en su lugar.

- Comprueba la cobertura antes de confiar en el corpus. La auditoría lista los archivos omitidos y el
  motivo:

  ```bash
  rgr audit --unsupported
  ```

La [guía de RAG autoalojado](/es/rag-autoalojado/) incluye los comandos del contenedor y una lista de
comprobación para el despliegue.

## Demuestra la calidad de la recuperación antes de pasar a producción

Mide la recuperación con las preguntas propias del cliente antes de que nadie confíe en las
respuestas.

Para empezar, reúne de 20 a 50 preguntas reales. Tómalas de usuarios, tickets o sesiones con agentes,
y redáctalas como las formulan las personas, no como copias de títulos.

Añade negativos difíciles. Son preguntas plausibles que los documentos no responden, incluidas las del
dominio cercano que comparten el vocabulario pero no el dato. Ragmir debe no devolver nada para ellas.

Guarda el archivo golden en `.ragmir/` cuando las propias preguntas sean confidenciales.

```json
{
  "topK": 5,
  "thresholds": { "recallAt5": 0.8, "maximumFalsePositiveRate": 0.2 },
  "queries": [
    { "id": "approval", "query": "Who signs off a production release?", "expectedPaths": ["docs/releases.md"] },
    {
      "query": "How long do we keep invoices?",
      "relevanceJudgments": [{ "kind": "path", "value": "policies/retention.pdf", "relevance": 3 }]
    },
    { "query": "Which Helm chart deploys the billing API?", "answerable": false, "category": "negative" }
  ]
}
```

```bash
rgr evaluate --golden ragmir.golden.json          # exits with status 1 when a threshold fails
rgr evaluate --golden ragmir.golden.json --json   # adds gates, per-category groups, and fingerprints
rgr evaluate --golden ragmir.golden.json --baseline before.json   # signed change per metric
```

<figure>
  <img src="/guides/evaluate-offline.webp" alt="Terminal con rgr evaluate ejecutándose en la imagen oficial 6.20.0 con --network none, sobre un archivo golden de ocho preguntas. Recall@5 es 1.000, pero falsePositiveRate es 1.000, el umbral maximumFalsePositiveRate no se cumple y los dos negativos difíciles enumeran los archivos que devolvieron." width="1440" height="1523" loading="lazy" decoding="async">
  <figcaption>Una ejecución real sobre un corpus de demostración con once guías en Markdown y un PDF. Cada pregunta con respuesta encuentra su archivo en el top 5, pero los dos negativos difíciles devuelven pasajes: el umbral de falsos positivos no se cumple y el comando termina con estado 1. Ese es el caso que hay que corregir antes de que nadie confíe en las respuestas.</figcaption>
</figure>

El informe cubre Recall@1/3/5/10, Precision@5, MRR@10, nDCG@10, la tasa de citas exactas, la tasa de
falsos positivos en negativos difíciles, y la latencia p50 y p95. Se ejecuta contra el índice local,
así que toda la medición se queda dentro del perímetro.

Cuando un caso falla, dos comandos ayudan:

```bash
rgr search "<query>" --explain --top-k 10
rgr preview --path <file> --json
```

El primero muestra el orden vectorial y por palabras clave de cada resultado. El segundo muestra cómo
se fragmentó el archivo esperado.

Cambia un ajuste cada vez y compara con la línea base. Conserva un cambio solo cuando el informe mejore
sin nuevos falsos positivos. Nunca edites las expectativas ni bajes los umbrales para que un cambio pase.

Una suite se considera apta para verificación cuando cumple todas estas condiciones:

- al menos 100 casos
- relevancia graduada
- citas exactas
- negativos difíciles
- todos los umbrales cumplidos

Una suite que supera la prueba guarda una huella en el índice. Después, `rgr doctor --deep` informa
de la calidad de recuperación como verificada mientras no cambien el archivo golden, el corpus, la
revisión del modelo, el perfil de recuperación ni la política del índice.

El mismo comando `rgr evaluate` controla la CI después de `rgr ingest`.

## Entrega la CLI y las imágenes

- **Una versión fijada.** El paquete de npm en el lockfile del cliente, o una etiqueta de imagen exacta
  como `ghcr.io/jcode-works/ragmir:6.20.0` (`6.20.0-full` añade el entorno semántico y el OCR).
- **Una sola configuración versionada.** `ragmir.config.json` se entrega con el despliegue, así que el
  siguiente equipo hereda las mismas fuentes y ajustes. El índice, los modelos y los documentos quedan
  fuera de Git.
- **Estado y diagnóstico.** `rgr status --json` informa de `ready`, del nombre de la base y del número
  de archivos indexados; `rgr doctor` comprueba la actualidad y la configuración y enumera los próximos
  pasos.
- **Actualizaciones seguras.** Empieza con la comprobación de actualización. Las actualizaciones
  mantienen el último índice validado hasta que su reemplazo supera la validación, así que una
  reparación nunca empieza borrando `.ragmir/storage/`.

  ```bash
  rgr upgrade --check
  ```

- **Skills para agentes.** Instala las skills de configuración y evaluación, entre otras, para los
  propios agentes del cliente:

  ```bash
  npx skills add jcode-works/ragmir
  ```

## Lo que sigue siendo responsabilidad de la aplicación del cliente

- **Sin interfaz de usuario.** Ragmir devuelve citas a una línea, página, diapositiva, celda o sección.
  No renderiza documentos ni muestra vistas previas resaltadas; abrir la página citada corresponde a la
  aplicación del cliente.
- **Sin autenticación ni control de acceso por usuario.** Ragmir no tiene servidor HTTP y no conoce a
  los usuarios. El anfitrión es responsable del TLS, la autenticación, la autorización y los límites de
  tasa. Da a cada audiencia su propia base y comprueba el acceso antes de llamar a `search`.
- **Sin modelo.** La generación va al modelo que elija la aplicación: local, autoalojado, o un proveedor
  que recibe los pasajes que se le envían.
- **Sin declaración de cumplimiento.** Las citas exactas, la selección explícita de fuentes y los
  informes de evaluación favorecen la trazabilidad. Por sí solos no hacen que un sistema cumpla con el
  RGPD ni con la Ley de IA de la UE, y nada de esto es asesoramiento jurídico.

Ragmir es de código abierto bajo AGPL-3.0-only. JCode Works ofrece además una licencia comercial para
los usos que la AGPL no cubre, como integrar Ragmir en software propietario o en un servicio alojado.

## Próximos pasos

- [RAG autoalojado y su lista de comprobación para el despliegue](/es/rag-autoalojado/)
- [RAG en red aislada, sin acceso a internet](/es/rag-sin-conexion/)
- [Referencia de la CLI, incluida la calidad de recuperación](/docs/cli-reference/)
- [La skill `ragmir-evaluate`](https://github.com/jcode-works/ragmir/blob/main/skills/ragmir-evaluate/SKILL.md)
