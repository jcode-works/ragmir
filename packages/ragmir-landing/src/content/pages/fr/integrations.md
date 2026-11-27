---
title: "Intégrations : Claude Code, Codex, Cursor, LangChain | Ragmir"
description: "Choisissez la page Ragmir de votre outil : plugins pour Claude Code, Codex et Cursor, extensions pour Gemini CLI et Qwen Code, retrievers LangChain et LlamaIndex."
h1: "Connecter Ragmir à votre agent ou à votre framework"
summary: "Ragmir sert un seul index local et les mêmes citations à Claude Code, Codex, Cursor et Gemini CLI, via des plugins et MCP, ainsi qu’aux applications, via LangChain.js, LangChain, LangGraph et LlamaIndex. Changer d’outil ne demande pas de réindexer."
section: hub
translationKey: "integrations"
datePublished: 2026-11-27
dateModified: 2026-11-27
related: ["mcp-rag-server", "integrations/claude-code", "integrations/langchain", "docs/agent-integration"]
notes:
  - title: "Tout autre client MCP"
    cards:
      - title: "Kimi, OpenCode et Cline"
        text: "La configuration de Ragmir prépare les trois en une seule commande, dans le projet où vous la lancez."
        command: "npx --yes @jcode.labs/ragmir setup --agents kimi,opencode,cline"
      - title: "Tout client qui parle MCP sur stdio"
        text: "Lancez le serveur depuis une entrée générique. Le MCP Registry le référence sous io.github.jcode-works/ragmir."
        command: "node .ragmir/run.cjs serve-mcp"
        link: { href: "/fr/serveur-mcp-rag/", label: "Entrée et outils" }
      - title: "Agent Skills"
        text: "Les outils qui chargent des dossiers de skills peuvent installer ceux de Ragmir : recherche, configuration et wiki."
        command: "npx skills add jcode-works/ragmir"
  - title: "Ce qui reste identique dans chaque outil"
    cards:
      - title: "Un seul index local, les mêmes citations"
        text: "Chaque intégration lit l’index du dossier .ragmir/ du projet et cite des lignes, des pages PDF, des diapositives ou des cellules. La recherche par défaut local-hash n’exige ni modèle, ni GPU, ni clé API."
      - title: "Un modèle cloud voit ce que vous lui envoyez"
        text: "Un agent ou un fournisseur de modèle cloud reçoit les extraits que votre agent ou votre application lui envoie. Un index local ne rend pas cette conversation locale."
        link: { href: "/fr/rag-local-ou-cloud/", label: "RAG local ou cloud" }
      - title: "Le contrôle d’accès reste dans votre service"
        text: "Ragmir ne propose ni authentification ni contrôle d’accès par utilisateur. Le service qui l’expose assure les deux."
      - title: "Les plugins ont besoin de vos fichiers"
        text: "Les plugins et extensions s’exécutent dans les outils installés sur votre machine, à côté du projet, et non dans les applications de chat web ou mobiles."
---
