/** JCode Works, the studio that maintains Ragmir. */
export const JCODE_URL = "https://jcode.works"

/**
 * The maintainer's Person node in JSON-LD. The team page describes the maintainer and every article
 * names them as author, so both share this `@id`, url, and sameAs instead of two drifting copies.
 */
export const MAINTAINER = {
  "@id": "https://ragmir.com/#jb-thery",
  name: "Jean-Baptiste Thery",
  url: "https://github.com/jb-thery",
  sameAs: [
    JCODE_URL,
    "https://github.com/jb-thery",
    "https://www.linkedin.com/in/jean-baptiste-thery/",
    "https://www.malt.fr/profile/jeanbaptistethery/",
  ],
} as const
