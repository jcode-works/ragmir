import type * as React from "react"
import { RAGMIR_SETUP_PROMPT } from "../content/setup-prompt"
import { cn } from "../lib/utils"
import { CommandCopyBox } from "./command-copy"
import { PromptBlock } from "./prompt-block"
import { SectionHeader } from "./section-header"
import { TabIndicator } from "./tab-indicator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface PackageManager {
  id: string
  label: string
  add: string
  exec: string
}

interface LibrarySectionProps {
  translations: Record<string, string>
}

/**
 * Every panel stays mounted in one grid cell, as tall as the tallest, so switching between the
 * prompt and a package manager never moves the page. The selected one fades in; the others are
 * invisible, so they are neither read nor reached. Panels hold their own controls, so they are not
 * tab stops themselves.
 */
const PANEL_CLASS_NAME =
  "col-start-1 row-start-1 mt-0 grid min-w-0 content-start transition-[opacity,visibility] duration-[160ms] ease-out data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible data-[state=inactive]:opacity-0"

export function LibrarySection({ translations }: LibrarySectionProps): React.JSX.Element {
  const t = (key: string): string => translations[key] ?? key
  const searchQuery = t("quickstart_search_query")
  const packageManagers: PackageManager[] = [
    {
      id: "npm",
      label: "npm",
      add: "npm install -D @jcode.labs/ragmir",
      exec: "npx",
    },
    { id: "pnpm", label: "pnpm", add: "pnpm add -D @jcode.labs/ragmir", exec: "pnpm exec" },
    { id: "yarn", label: "yarn", add: "yarn add --dev @jcode.labs/ragmir", exec: "yarn exec" },
    { id: "bun", label: "Bun", add: "bun add -d @jcode.labs/ragmir", exec: "bunx" },
    {
      id: "mise",
      label: "mise",
      add: "mise exec node@22 -- npm install -D @jcode.labs/ragmir",
      exec: "mise exec node@22 -- npx",
    },
  ]
  const installSteps = [
    {
      key: "install",
      label: t("quickstart_install_label"),
      build: (manager: PackageManager) => manager.add,
    },
    {
      key: "setup",
      label: t("quickstart_setup_label"),
      build: (manager: PackageManager) => `${manager.exec} rgr setup --no-ingest --agents codex`,
    },
    {
      key: "sources",
      label: t("quickstart_sources_label"),
      build: (manager: PackageManager) =>
        `${manager.exec} rgr sources add "docs/**/*.md" "src/**/*.ts"`,
    },
    {
      key: "ingest",
      label: t("quickstart_ingest_label"),
      build: (manager: PackageManager) => `${manager.exec} rgr ingest`,
    },
    {
      key: "search",
      label: t("quickstart_search_label"),
      build: (manager: PackageManager) => `${manager.exec} rgr search "${searchQuery}"`,
    },
  ]

  return (
    <section
      className="container-default relative z-10 px-5 py-16 md:px-8 md:py-40"
      id="library"
      aria-labelledby="library-heading"
    >
      <div className="mb-10 md:mb-14">
        <SectionHeader
          id="library-heading"
          label={t("library_eyebrow")}
          num="004"
          text={t("library_text")}
          title={t("library_title")}
        />
      </div>

      <Card className="mx-auto min-w-0 max-w-3xl overflow-hidden">
        <CardHeader className="gap-2 p-5 pb-0 md:p-6 md:pb-0">
          <CardTitle className="type-subsection">{t("quickstart_title")}</CardTitle>
          <CardDescription className="leading-6">{t("quickstart_text")}</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 p-5 md:p-6">
          <Tabs className="min-w-0 gap-4" defaultValue="prompt">
            <div className="min-w-0">
              {/* Three columns on phones, one pill row from small screens up: no clipped tab. */}
              <TabsList
                aria-label={t("quickstart_tabs_label")}
                className="relative grid w-full grid-cols-3 gap-1 rounded-xl bg-background p-1 group-data-[orientation=horizontal]/tabs:h-auto sm:flex sm:rounded-full"
              >
                <TabIndicator activeSelector='[data-state="active"]' />
                <TabsTrigger
                  className="min-w-0 justify-center rounded-full px-2 py-1.5 text-center font-semibold text-xs sm:min-w-20 sm:flex-1 sm:px-3"
                  value="prompt"
                >
                  {t("quickstart_prompt_tab")}
                </TabsTrigger>
                {packageManagers.map((manager) => (
                  <TabsTrigger
                    className="min-w-0 justify-center rounded-full px-2 py-1.5 text-center font-semibold text-xs sm:min-w-16 sm:flex-1"
                    key={manager.id}
                    value={manager.id}
                  >
                    {manager.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="grid min-w-0">
              <TabsContent
                className={cn(PANEL_CLASS_NAME, "gap-4")}
                forceMount
                tabIndex={-1}
                value="prompt"
              >
                <div>
                  <p className="font-bold text-xs">{t("quickstart_prompt_title")}</p>
                  <p className="mt-1 text-micro text-muted-foreground leading-4">
                    {t("quickstart_prompt_text")}
                  </p>
                </div>
                <PromptBlock
                  className="min-w-0 bg-background"
                  copiedLabel={t("command_copied")}
                  copyLabel={t("copy_prompt")}
                  id="ragmir-setup-prompt"
                  label={t("quickstart_prompt_tab")}
                  prompt={RAGMIR_SETUP_PROMPT}
                  promptClassName="max-h-[7.5rem] px-4 py-3"
                />
              </TabsContent>
              {packageManagers.map((manager) => (
                <TabsContent
                  className={cn(PANEL_CLASS_NAME, "gap-3")}
                  forceMount
                  key={manager.id}
                  tabIndex={-1}
                  value={manager.id}
                >
                  {installSteps.map((step) => (
                    <CommandCopyBox
                      command={step.build(manager)}
                      copyLabel={t("copy_command")}
                      key={step.key}
                    />
                  ))}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}
