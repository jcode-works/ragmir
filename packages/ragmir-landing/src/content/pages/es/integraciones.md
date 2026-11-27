---
title: "Integraciones: Claude Code, Codex, Cursor, LangChain | Ragmir"
description: "Página de Ragmir por herramienta: plugins para Claude Code, Codex y Cursor, extensiones para Gemini CLI y Qwen Code, y retrievers para LangChain y LlamaIndex."
h1: "Conecta Ragmir con tu agente o framework"
summary: "Ragmir sirve un único índice local y las mismas citas a Claude Code, Codex, Cursor y Gemini CLI mediante plugins y MCP, y a las aplicaciones mediante LangChain.js, LangChain, LangGraph y LlamaIndex. Cambiar de herramienta no obliga a volver a indexar."
section: hub
translationKey: "integrations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "integrations/claude-code", "integrations/langchain", "docs/agent-integration"]
notes:
  - title: "Cualquier otro cliente MCP"
    cards:
      - title: "Kimi, OpenCode y Cline"
        text: "La configuración de Ragmir prepara los tres en un solo comando, en la carpeta del proyecto desde la que lo ejecutes."
        command: "npx --yes @jcode.labs/ragmir setup --agents kimi,opencode,cline"
      - title: "Cualquier cliente que hable MCP por stdio"
        text: "Inicia el servidor desde una entrada genérica. El MCP Registry lo lista como io.github.jcode-works/ragmir."
        command: "node .ragmir/run.cjs serve-mcp"
        link: { href: "/es/servidor-mcp-rag/", label: "Entrada y herramientas" }
      - title: "Agent Skills"
        text: "Las herramientas que cargan carpetas de skills pueden instalar las de Ragmir: recuperación, configuración y la wiki."
        command: "npx skills add jcode-works/ragmir"
  - title: "Lo que se mantiene igual en todas las herramientas"
    cards:
      - title: "Un único índice local, las mismas citas"
        text: "Cada integración lee el índice de la carpeta .ragmir/ del proyecto y cita líneas, páginas PDF, diapositivas o celdas. La recuperación predeterminada local-hash no necesita modelo, GPU ni clave de API."
      - title: "Un modelo en la nube ve lo que le envías"
        text: "Un agente en la nube o un proveedor de modelos recibe los extractos que le envía tu agente o aplicación. Un índice local no convierte en local esa conversación."
        link: { href: "/es/rag-local-o-nube/", label: "RAG local o en la nube" }
      - title: "El control de acceso lo mantiene tu servicio"
        text: "Ragmir no tiene autenticación ni control de acceso por usuario. El servicio que lo expone es responsable de ambos."
      - title: "Los plugins necesitan tus archivos"
        text: "Los plugins y las extensiones se ejecutan en herramientas instaladas en tu equipo, junto al proyecto, no en aplicaciones de chat web o móvil."
---
