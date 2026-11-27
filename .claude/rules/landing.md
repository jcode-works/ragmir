---
paths:
  - "packages/ragmir-landing/**"
---

# Landing site

- The landing is a static, telemetry-free Astro site with no vendor deployment configuration and
  no runtime calls to third parties. Keep it that way.
- Interface strings live in `messages/en.json`, `fr.json`, `es.json`, and `zh.json` (Simplified
  Chinese); add each key to all four, in the same order. Long-form pages live in content
  collections: `src/content/pages/<locale>/<path>.md`, served at `/<path>/` in English and
  `/<locale>/<path>/` otherwise; the guides of `docs/` render at `/docs/<file>/` from their only
  copy, with their search metadata in `src/lib/docs-pages.ts`, and their Markdown is served at
  `/docs/<file>.md`. A page may exist in fewer locales; English always exists.
- The docs use their own layout, `src/components/docs-page.astro`, rather than Starlight, which
  would take over their routes, the Markdown pipeline, and the navigation bar they share with the
  rest of the site.
- Titles and body text use the type scale in `src/styles/global.css` (`type-title`,
  `type-section`, `type-subsection`, `type-lead`), the home hero apart; do not size headings
  with ad hoc text utilities.
- Translate new or changed copy for `fr`, `es`, and `zh` with a subagent on Haiku (Agent tool,
  `model: "haiku"`) or a direct Anthropic API call with the key exported in `~/.zshrc` and the
  model `claude-haiku-5-5`, never with a larger model. Review key order, placeholders, product
  names, and the no-em-dash rule before committing.
- `public/llms.txt` and `public/ai.txt` are copies of the root `llms.txt`: edit the root file,
  never a copy.
- The format list comes from `src/content/supported-formats.ts` and must match
  `docs/supported-formats.md`; integration cards live in `src/components/sections/integrations.astro`.
- Check with `pnpm --filter @jcode.labs/ragmir-landing check` and
  `pnpm --filter @jcode.labs/ragmir-landing test`; `pnpm dev:landing` serves it locally. Verify a
  visual change in a browser at desktop and mobile widths before calling it done.
