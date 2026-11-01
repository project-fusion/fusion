import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { PROJECTS, STATUS } from './data'

const open = PROJECTS.filter((project) => project.status !== 'done')
const late = PROJECTS.filter((project) => project.status === 'at-risk')

/**
 * The first screen: the week in numbers, the projects, and what needs a
 * look. Each row links to its project's route. The numbers take a gap
 * narrower than the group's default, so three columns and their rules fit a
 * phone with each label on one line.
 */
export function ProjectList() {
  const route = useHelixRoute()
  return (
    <helix-flex direction="column" gap="lg">
      <helix-flex direction="column" gap="2xs">
        <helix-text as="h1" scale="heading">
          Projects
        </helix-text>
        <helix-text emphasis="muted">{`${open.length} active, ${late.length} at risk`}</helix-text>
      </helix-flex>
      <helix-stat-group
        columns={3}
        divided
        label="This week"
        style={{ '--stat-group-gap': 'var(--helix-space-lg)' }}
      >
        <helix-stat value={42}>
          <helix-text slot="label">Open</helix-text>
          <helix-trend good="down" movement="down" slot="trend">
            12%
          </helix-trend>
        </helix-stat>
        <helix-stat value={9}>
          <helix-text slot="label">Due soon</helix-text>
        </helix-stat>
        <helix-stat value={31}>
          <helix-text slot="label">Done</helix-text>
          <helix-trend good="up" movement="up" slot="trend">
            18%
          </helix-trend>
        </helix-stat>
      </helix-stat-group>
      {late.map((project) => (
        <helix-callout key={project.id} tone="warning">
          <helix-text slot="heading">{project.name} is behind schedule</helix-text>
          {`${project.activity[0]?.detail ?? ''} Open the project to see its activity.`}
        </helix-callout>
      ))}
      <helix-card label="Projects">
        <helix-text as="h2" scale="title" slot="header">
          All projects
        </helix-text>
        <helix-list divided label="Projects">
          {PROJECTS.map((project) => (
            <helix-list-item
              href={route.href(`/projects/${project.id}`)}
              key={project.id}
              value={project.id}
            >
              <helix-avatar
                initials={project.owner.initials}
                name={project.owner.name}
                size="sm"
                slot="start"
              ></helix-avatar>
              {project.name}
              <helix-text slot="description">
                {`${project.done} of ${project.tasks} tasks done`}
              </helix-text>
              <helix-tag emphasis="subtle" slot="end" tone={STATUS[project.status].tone}>
                {STATUS[project.status].label}
              </helix-tag>
            </helix-list-item>
          ))}
        </helix-list>
      </helix-card>
    </helix-flex>
  )
}
