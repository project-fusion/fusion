import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import type { ReactNode } from 'react'
import { type Project, STATUS } from './data'
import { crumbOf, TABS, type Tab, tabRoute } from './routes'

interface Props {
  /** The tab's own screen, which the router draws for the route showing. */
  readonly children?: ReactNode
  readonly project: Project
  /** The tab whose route is showing. */
  readonly tab: Tab
}

/**
 * One project: the trail down to it, where it stands, who is on it, and a
 * tab for each of its routes, with the route showing drawn in its tab's
 * panel. Each crumb and each tab links to its route.
 */
export function ProjectFrame({ children, project, tab }: Props) {
  const route = useHelixRoute()
  return (
    <helix-flex direction="column" gap="lg">
      <helix-breadcrumbs label="Project">
        {route.trail(crumbOf).map((crumb) => (
          <helix-breadcrumb
            current={crumb.current}
            href={crumb.current ? undefined : crumb.href}
            key={crumb.path}
          >
            {crumb.label}
          </helix-breadcrumb>
        ))}
      </helix-breadcrumbs>
      <helix-flex align-items="center" gap="md" justify-content="between" wrap>
        <helix-flex direction="column" gap="2xs">
          <helix-flex align-items="center" gap="sm">
            <helix-text as="h1" scale="heading">
              {project.name}
            </helix-text>
            <helix-tag emphasis="subtle" tone={STATUS[project.status].tone}>
              {STATUS[project.status].label}
            </helix-tag>
          </helix-flex>
          <helix-text emphasis="muted">{project.summary}</helix-text>
        </helix-flex>
        <helix-avatar-group label={`${project.members.length} people on ${project.name}`}>
          {project.members.map((person) => (
            <helix-avatar
              initials={person.initials}
              key={person.initials}
              name={person.name}
            ></helix-avatar>
          ))}
        </helix-avatar-group>
      </helix-flex>
      <helix-tabs active={tab} label={project.name}>
        {TABS.map((one) => (
          <helix-tab
            href={route.href(tabRoute(project.id, one.value))}
            key={one.value}
            value={one.value}
          >
            {one.label}
          </helix-tab>
        ))}
        {TABS.map((one) => (
          <helix-tab-panel key={one.value} slot="panels" value={one.value}>
            {one.value === tab ? children : null}
          </helix-tab-panel>
        ))}
      </helix-tabs>
    </helix-flex>
  )
}
