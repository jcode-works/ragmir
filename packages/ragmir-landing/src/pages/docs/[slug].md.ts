import { getCollection } from "astro:content"
import type { APIRoute, GetStaticPaths } from "astro"

/**
 * Each guide's Markdown, served beside its page at `/docs/<guide>.md` exactly as `docs/` holds it,
 * for the "Copy page" button and for agents that read Markdown. Links between guides stay relative,
 * so `./cli-reference.md` resolves to the neighbouring file here as it does on GitHub.
 */
export const getStaticPaths = (async () => {
  const docs = await getCollection("docs")
  return docs.map((entry) => ({ params: { slug: entry.id }, props: { body: entry.body ?? "" } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(String(props.body), { headers: { "Content-Type": "text/markdown; charset=utf-8" } })
