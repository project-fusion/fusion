/* The proof page: a project dashboard written once, as ordinary React, from
   Helix families alone. A browser draws each tag as the web element, and
   the gallery draws it as the native component. Nothing here names a
   platform, which `helix shared` checks. */
import '@fusion.dev/helix/avatar'
import '@fusion.dev/helix/badge'
import '@fusion.dev/helix/breadcrumbs'
import '@fusion.dev/helix/button'
import '@fusion.dev/helix/callout'
import '@fusion.dev/helix/card'
import '@fusion.dev/helix/description-list'
import '@fusion.dev/helix/divider'
import '@fusion.dev/helix/empty'
import '@fusion.dev/helix/flex'
import '@fusion.dev/helix/format-date'
import '@fusion.dev/helix/grid'
import '@fusion.dev/helix/icon'
import '@fusion.dev/helix/list'
import '@fusion.dev/helix/meter'
import '@fusion.dev/helix/outline'
import '@fusion.dev/helix/progress'
import '@fusion.dev/helix/radio'
import '@fusion.dev/helix/scroll-area'
import '@fusion.dev/helix/stat'
import '@fusion.dev/helix/steps'
import '@fusion.dev/helix/switch'
import '@fusion.dev/helix/tabs'
import '@fusion.dev/helix/tag'
import '@fusion.dev/helix/text'
import '@fusion.dev/helix/timeline'
import '@fusion.dev/helix/trend'
import { useState } from 'react'
import { PROJECTS } from './data'
import { ProjectList } from './list-screen'
import { ProjectScreen, type Tab } from './project-screen'

export { TABS, type Tab } from './project-screen'

interface Props {
  /** The project open at first, by its id. The list shows when it names none. */
  readonly project?: string | undefined
  /** The tab that project opens on. A project opened later opens on its overview. */
  readonly tab?: Tab | undefined
}

/** The dashboard: the list of projects, or one project. */
export function Projects({ project: first, tab: firstTab }: Props) {
  const [open, setOpen] = useState<string | null>(first ?? null)
  const [tab, setTab] = useState<Tab | undefined>(firstTab)
  const project = PROJECTS.find((one) => one.id === open)
  return project === undefined ? (
    <ProjectList onOpen={setOpen} />
  ) : (
    <ProjectScreen
      onBack={() => {
        setOpen(null)
        setTab(undefined)
      }}
      project={project}
      tab={tab}
    />
  )
}
