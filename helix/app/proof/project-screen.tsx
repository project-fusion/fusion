import { type Project, STATUS } from './data'
import { Activity, Overview, Settings } from './panels'

/** The project's tabs, by their values. */
export const TABS = ['overview', 'activity', 'settings'] as const

/** One of the project's tabs. */
export type Tab = (typeof TABS)[number]

interface Props {
  readonly onBack: () => void
  readonly project: Project
  /** The tab the project opens on, its overview by default. */
  readonly tab?: Tab | undefined
}

/** One project: where it sits, who is on it, and its overview, activity, and settings. */
export function ProjectScreen({ onBack, project, tab = 'overview' }: Props) {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-breadcrumbs label="Project">
        <helix-breadcrumb
          href="#projects"
          onhelix-select={(event: { preventDefault: () => void }) => {
            event.preventDefault()
            onBack()
          }}
        >
          Projects
        </helix-breadcrumb>
        <helix-breadcrumb current>{project.name}</helix-breadcrumb>
      </helix-breadcrumbs>
      <helix-flex align-items="center" gap="md" justify-content="between" wrap>
        <helix-flex direction="column" gap="2xs">
          <helix-flex align-items="center" gap="sm">
            <helix-text as="h1" variant="heading">
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
      <helix-tabs default-active={tab} label={project.name}>
        <helix-tab value="overview">Overview</helix-tab>
        <helix-tab value="activity">Activity</helix-tab>
        <helix-tab value="settings">Settings</helix-tab>
        <helix-tab-panel slot="panels" value="overview">
          <Overview project={project} />
        </helix-tab-panel>
        <helix-tab-panel slot="panels" value="activity">
          <Activity project={project} />
        </helix-tab-panel>
        <helix-tab-panel slot="panels" value="settings">
          <Settings project={project} />
        </helix-tab-panel>
      </helix-tabs>
    </helix-flex>
  )
}
