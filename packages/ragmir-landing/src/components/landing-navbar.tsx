import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Briefcase,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  FileCode,
  Gauge,
  GitCompareArrows,
  History,
  House,
  Layers,
  type LucideIcon,
  Menu,
  Puzzle,
  Rocket,
  Scale,
  Server,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react"
import type * as React from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  GITHUB_URL,
  isExternalLink,
  NPM_URL,
  PROJECT_LINK_LABEL_KEYS,
  PROJECT_LINKS,
  type ProjectLinkKey,
  PYPI_URL,
} from "../lib/project-links"
import { cn } from "../lib/utils"
import { GithubIcon, NpmIcon, PypiIcon } from "./brand-icons"
import { LanguageSelect } from "./language-select"
import { Button } from "./ui/button"

interface AlternateLocale {
  locale: string
  label: string
  href: string
}

interface LandingNavbarProps {
  translations: Record<string, string>
  locale: string
  alternateLocales: AlternateLocale[]
  localizedHomeUrl: string
  localizedUseCasesUrl: string
  localizedLibraryUrl: string
  localizedFeaturesUrl: string
  localizedAgentsUrl: string
  localizedDeployUrl: string
  localizedFaqUrl: string
  localizedTeamUrl: string
  /** Path of the page on screen, so the drawer can light its own row. */
  currentPath?: string
  /** Root-relative URL of the hub the page belongs to, so the bar can light its link. */
  currentSection?: string
}

const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const

interface DrawerLink {
  href: string
  label: string
  icon: LucideIcon
  external?: boolean
}

/** The drawer's sections under the pages card: documentation first, then the project's records. */
const DRAWER_SECTIONS: ReadonlyArray<{
  titleKey: string
  links: ReadonlyArray<{ key: ProjectLinkKey; icon: LucideIcon }>
}> = [
  {
    titleKey: "nav_section_docs",
    links: [
      { key: "docs", icon: BookOpen },
      { key: "guides", icon: Compass },
      { key: "apiReference", icon: FileCode },
      { key: "supportedFormats", icon: Layers },
      { key: "serverGuide", icon: Server },
      { key: "pythonGuide", icon: FileCode },
      { key: "benchmarks", icon: Gauge },
    ],
  },
  {
    titleKey: "nav_section_project",
    links: [
      { key: "releases", icon: Tag },
      { key: "changelog", icon: History },
      { key: "license", icon: Scale },
      { key: "commercialLicense", icon: Briefcase },
    ],
  },
]

/** One drawer row: a grey icon, the label, then a chevron, or an arrow for a link that leaves the site. */
const DRAWER_ROW_CLASS_NAME =
  "flex min-h-11 items-center gap-3 px-4 font-semibold text-foreground text-sm transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-foreground/10"

/** GitHub, npm, and PyPI in the bar: bare icons, like the social icons of the WorkoutGen bar. */
const HEADER_ICON_CLASS_NAME =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-[var(--card-hover)] active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** The hubs, named in the bar after Home on wide screens; narrower ones reach them through the drawer. */
const HUB_LINKS: ReadonlyArray<{ href: string; labelKey: string }> = [
  { href: PROJECT_LINKS.guides, labelKey: "nav_guides" },
  { href: PROJECT_LINKS.agentPlugins, labelKey: "nav_integrations" },
  { href: PROJECT_LINKS.docs, labelKey: "footer_link_docs" },
]

/**
 * Sends a language link to the section the reader is on: every language shares the section ids,
 * so the translated page opens at the same place, at once under reduced motion like any anchor.
 * The `href` that crawlers read stays the page itself; only the clicked link gains the fragment.
 */
function keepReadingPlace(event: React.MouseEvent<HTMLAnchorElement>, href: string): void {
  const line = window.innerHeight / 3
  let section = ""
  for (const candidate of document.querySelectorAll<HTMLElement>("main section[id]")) {
    if (candidate.getBoundingClientRect().top > line) break
    section = candidate.id
  }
  event.currentTarget.href = section && section !== "top" ? `${href}#${section}` : href
}

const DRAWER_SECTION_TITLE_CLASS_NAME =
  "mb-2 font-black text-foreground text-sm uppercase tracking-tight"

/** One card of the drawer: rows one under the other, the page on screen lit. */
function DrawerLinkList({
  links,
  currentPath,
  newTabLabel,
  onNavigate,
}: {
  links: readonly DrawerLink[]
  currentPath: string | undefined
  /** Read after the label of a row that opens a new tab. */
  newTabLabel: string
  onNavigate: () => void
}): React.JSX.Element {
  return (
    <ul className="overflow-hidden rounded-2xl bg-card">
      {links.map(({ href, label, icon: Icon, external }) => {
        const current = !external && currentPath !== undefined && href === currentPath
        return (
          <li className="border-foreground/[0.06] border-b last:border-b-0" key={href}>
            <a
              aria-current={current ? "page" : undefined}
              className={cn(DRAWER_ROW_CLASS_NAME, current && "bg-foreground/[0.06] font-bold")}
              href={href}
              onClick={external ? undefined : onNavigate}
              {...(external ? externalLinkProps : {})}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                {label}
                {external && <span className="sr-only">{` ${newTabLabel}`}</span>}
              </span>
              {external ? (
                <ArrowUpRight
                  aria-hidden="true"
                  className="arrow-out size-4 shrink-0 text-muted-foreground"
                />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                  className="arrow-forward size-4 shrink-0 text-muted-foreground"
                />
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/** One titled group of the drawer: the section title over a card of rows. */
function DrawerSection({
  title,
  links,
  currentPath,
  newTabLabel,
  onNavigate,
}: {
  title: string
  links: readonly DrawerLink[]
  currentPath: string | undefined
  newTabLabel: string
  onNavigate: () => void
}): React.JSX.Element {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="mt-6">
      <h2 className={DRAWER_SECTION_TITLE_CLASS_NAME} id={titleId}>
        {title}
      </h2>
      <DrawerLinkList
        currentPath={currentPath}
        links={links}
        newTabLabel={newTabLabel}
        onNavigate={onNavigate}
      />
    </section>
  )
}

export function RagmirLogo(): React.JSX.Element {
  return (
    <span
      className="logo-stack font-black text-2xl text-foreground leading-none tracking-tight md:text-3xl"
      data-logo-text="Ragmir"
      translate="no"
    >
      <span className="logo-index-1 logo-text">Ragmir</span>
    </span>
  )
}

export function LandingNavbar({
  translations,
  locale,
  alternateLocales,
  localizedHomeUrl,
  localizedUseCasesUrl,
  localizedLibraryUrl,
  localizedFeaturesUrl,
  localizedAgentsUrl,
  localizedDeployUrl,
  localizedFaqUrl,
  localizedTeamUrl,
  currentPath,
  currentSection,
}: LandingNavbarProps): React.JSX.Element {
  const t = (key: string): string => translations[key] ?? key
  const version = import.meta.env.PUBLIC_RAGMIR_VERSION?.trim()
  // Links that leave the site open a new tab and say so to screen readers.
  const newTab = t("new_tab_label")
  const [hasScrolled, setHasScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const drawerRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastScrollY = useRef(0)
  const isHidden = useRef(false)

  const localizedIntegrationsUrl = localizedLibraryUrl.replace(/#library$/u, "#integrations")
  const localizedComparisonUrl = localizedLibraryUrl.replace(/#library$/u, "#comparison")
  // In page order, so the drawer reads like the page.
  const homePath = localizedHomeUrl.replace(/#.*$/u, "")
  // Home, then the hubs: the bar lights the page on screen, or the hub that lists it.
  const barLinks = [
    { href: homePath, label: t("nav_home") },
    ...HUB_LINKS.map(({ href, labelKey }) => ({ href, label: t(labelKey) })),
  ]
  const drawerPageLinks: DrawerLink[] = [
    { href: homePath, label: t("nav_home"), icon: House },
    { href: localizedUseCasesUrl, label: t("nav_use_cases"), icon: Layers },
    { href: localizedFeaturesUrl, label: t("nav_features"), icon: Sparkles },
    { href: localizedComparisonUrl, label: t("nav_comparison"), icon: GitCompareArrows },
    { href: localizedLibraryUrl, label: t("nav_library"), icon: Download },
    { href: localizedIntegrationsUrl, label: t("nav_integrations"), icon: Puzzle },
    { href: localizedAgentsUrl, label: t("nav_agents"), icon: Bot },
    { href: localizedDeployUrl, label: t("nav_deploy"), icon: Rocket },
    { href: localizedFaqUrl, label: t("nav_faq"), icon: CircleHelp },
    { href: localizedTeamUrl, label: t("nav_team"), icon: Users },
  ]
  const drawerSections = DRAWER_SECTIONS.map((section) => ({
    title: t(section.titleKey),
    links: section.links.map(
      ({ key, icon }): DrawerLink => ({
        href: PROJECT_LINKS[key],
        label: t(PROJECT_LINK_LABEL_KEYS[key]),
        icon,
        external: isExternalLink(PROJECT_LINKS[key]),
      }),
    ),
  }))

  // The drawer is a native modal dialog: the platform traps focus inside it, makes the page inert,
  // closes it on Escape, and gives focus back to Menu. A link to a section of this page then moves
  // focus on to that section, as any in-page link does.
  const openMenu = useCallback(() => {
    const drawer = drawerRef.current
    if (!drawer || drawer.open) return
    drawer.showModal()
    // The platform would focus the first link; the way back comes first.
    closeButtonRef.current?.focus()
    setMenuOpen(true)
  }, [])

  const closeMenu = useCallback(() => drawerRef.current?.close(), [])

  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return
    // A tap on the dimmed page closes the drawer, a pointer shortcut for Escape and the Close
    // button. Such a click targets the dialog itself, since its content fills the whole panel.
    const onBackdropClick = (event: MouseEvent) => {
      if (event.target === drawer) drawer.close()
    }
    drawer.addEventListener("click", onBackdropClick)
    return () => drawer.removeEventListener("click", onBackdropClick)
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    // Hide-on-scroll: hide the header when scrolling down, reveal when scrolling up.
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollThreshold = 50
      setHasScrolled(currentScrollY > 0)

      if (currentScrollY < scrollThreshold) {
        if (isHidden.current) {
          header.style.transform = "translateY(0)"
          header.removeAttribute("data-hidden")
          isHidden.current = false
        }
        lastScrollY.current = currentScrollY
        return
      }

      const scrollDelta = currentScrollY - lastScrollY.current
      if (scrollDelta > 5 && !isHidden.current) {
        header.style.transform = "translateY(-100%)"
        header.setAttribute("data-hidden", "")
        isHidden.current = true
        lastScrollY.current = currentScrollY
      } else if (scrollDelta < -5 && isHidden.current) {
        header.style.transform = "translateY(0)"
        header.removeAttribute("data-hidden")
        isHidden.current = false
        lastScrollY.current = currentScrollY
      } else if ((scrollDelta > 0 && isHidden.current) || (scrollDelta < 0 && !isHidden.current)) {
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-28 bg-linear-to-b from-background via-background/82 to-transparent"
      />
      <header
        className={cn(
          // Only the slide is animated, and reduced motion hides or shows the bar at once.
          "fixed inset-x-0 top-0 z-40 transition-transform duration-300 motion-reduce:transition-none",
          hasScrolled && "bg-linear-to-b from-background via-background to-transparent",
        )}
        ref={headerRef}
      >
        <div className="container-navbar flex h-16 items-center justify-between px-5 md:px-8">
          <div className="flex items-center">
            <a aria-label="Ragmir" className="flex items-center" href={localizedHomeUrl}>
              <RagmirLogo />
            </a>
            {/* Below 420px the brand icons need its room; the drawer still shows the version. */}
            {version && (
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[0.7rem] font-medium text-muted-foreground/60 no-underline transition-colors hover:text-muted-foreground active:text-foreground max-[419px]:hidden"
              >
                v{version}
                <span className="sr-only">{` ${newTab}`}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1">
            <nav
              aria-label={t("nav_aria_label")}
              className="mr-3 hidden items-center gap-4 lg:flex xl:mr-5 xl:gap-6"
            >
              {barLinks.map(({ href, label }) => (
                <a
                  aria-current={
                    currentPath === href ? "page" : currentSection === href ? "true" : undefined
                  }
                  className="rounded-sm px-2 py-2 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-foreground/70 [&[aria-current]]:font-bold [&[aria-current]]:text-foreground"
                  href={href}
                  key={href}
                >
                  {label}
                </a>
              ))}
            </nav>
            <a
              aria-label={`${t("hero_github_cta")} ${newTab}`}
              className={HEADER_ICON_CLASS_NAME}
              href={GITHUB_URL}
              {...externalLinkProps}
            >
              <GithubIcon className="size-[18px]" />
            </a>
            <a
              aria-label={`${t("hero_npm_cta")} ${newTab}`}
              className={HEADER_ICON_CLASS_NAME}
              href={NPM_URL}
              {...externalLinkProps}
            >
              <NpmIcon className="size-[18px]" />
            </a>
            <a
              aria-label={`${t("hero_pypi_cta")} ${newTab}`}
              className={HEADER_ICON_CLASS_NAME}
              href={PYPI_URL}
              {...externalLinkProps}
            >
              <PypiIcon className="size-[18px]" />
            </a>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              aria-label={t("nav_menu")}
              className="ml-1 flex h-10 items-center gap-2 rounded-full bg-card px-3 font-bold text-foreground text-sm transition-colors hover:bg-[var(--card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-[var(--card-press)] sm:px-4"
              onClick={openMenu}
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" />
              <span aria-hidden="true" className="hidden sm:inline">
                {t("nav_menu")}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Closed, the dialog is not rendered, so nothing in it can take focus or be read. */}
      <dialog
        aria-label={t("nav_menu")}
        className="drawer"
        onClose={() => setMenuOpen(false)}
        ref={drawerRef}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background px-5 pt-3 pb-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-full h-4 bg-linear-to-b from-background to-transparent"
              />
              {/* The bar behind the drawer already shows the logo; the drawer leads with the language. */}
              <LanguageSelect
                label={t("language_label")}
                locale={locale}
                menuClassName="top-full left-0 mt-2"
                onSelect={keepReadingPlace}
                options={alternateLocales}
              />
              <button
                aria-label={t("nav_menu_close")}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-[var(--card-hover)] active:bg-[var(--card-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={closeMenu}
                ref={closeButtonRef}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <nav aria-label={t("nav_aria_label")} className="px-5 pt-4 pb-6">
              <DrawerLinkList
                currentPath={currentPath}
                links={drawerPageLinks}
                newTabLabel={newTab}
                onNavigate={closeMenu}
              />

              {drawerSections.map((section) => (
                <DrawerSection
                  currentPath={currentPath}
                  key={section.title}
                  links={section.links}
                  newTabLabel={newTab}
                  onNavigate={closeMenu}
                  title={section.title}
                />
              ))}

              <div className="mt-7 flex items-center justify-end gap-3">
                {version && (
                  <a
                    className="font-medium text-muted-foreground text-xs no-underline transition-colors hover:text-foreground active:text-foreground/70"
                    href={NPM_URL}
                    {...externalLinkProps}
                  >
                    Ragmir v{version}
                    <span className="sr-only">{` ${newTab}`}</span>
                  </a>
                )}
              </div>
            </nav>
          </div>

          <div className="grid gap-2 border-border border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button asChild className="h-11 w-full font-bold text-sm">
              <a href={GITHUB_URL} {...externalLinkProps}>
                <GithubIcon data-icon="inline-start" />
                {t("hero_github_cta")}
                <span className="sr-only">{` ${newTab}`}</span>
                <ArrowUpRight aria-hidden="true" className="arrow-out" />
              </a>
            </Button>
            <Button asChild className="h-11 w-full font-bold text-sm" variant="outline">
              <a href={NPM_URL} {...externalLinkProps}>
                <NpmIcon data-icon="inline-start" />
                {t("hero_npm_cta")}
                <span className="sr-only">{` ${newTab}`}</span>
                <ArrowUpRight aria-hidden="true" className="arrow-out" />
              </a>
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
