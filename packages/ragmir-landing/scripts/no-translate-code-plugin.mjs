// Sätteri HAST plugin for every long-form page: code keeps its exact spelling when a reader's
// browser translates the page, so commands, paths, and identifiers stay as written.
export function noTranslateCodePlugin() {
  return () => ({
    name: "ragmir-no-translate-code",
    element: {
      filter: ["pre", "code"],
      visit(node, context) {
        context.setProperty(node, "translate", "no")
      },
    },
  })
}
