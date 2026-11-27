// Sätteri HAST plugin for every long-form page: a table whose top-left header cell is empty
// compares rows, so its first column names each row. Those cells become row headers, and the
// empty corner a plain cell, so every data cell has a column and a row header for screen readers.
export function tableRowHeadersPlugin() {
  const elements = (node) => (node?.children ?? []).filter((child) => child.type === "element")
  return () => ({
    name: "ragmir-table-row-headers",
    element: {
      filter: ["table"],
      visit(table, context) {
        const sections = elements(table)
        const head = sections.find((section) => section.tagName === "thead")
        const corner = elements(elements(head)[0])[0]
        if (corner?.tagName !== "th" || context.textContent(corner).trim() !== "") return
        context.replaceNode(corner, {
          type: "element",
          tagName: "td",
          properties: {},
          children: [],
        })
        for (const body of sections.filter((section) => section.tagName === "tbody")) {
          for (const row of elements(body)) {
            const first = elements(row)[0]
            if (first?.tagName !== "td") continue
            context.replaceNode(first, {
              type: "element",
              tagName: "th",
              properties: { ...first.properties, scope: "row" },
              children: first.children,
            })
          }
        }
      },
    },
  })
}
