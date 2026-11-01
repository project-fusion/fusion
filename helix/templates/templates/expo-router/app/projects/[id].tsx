import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { projectOf, STATUS } from '../../src/data'
import { Page } from '../../src/page'
import { crumbOf } from '../../src/routes'

/**
 * `/projects/<id>`: one project, under the trail of crumbs the route gives.
 * An id the data lacks goes back to the list.
 */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const route = useHelixRoute()
  const project = projectOf(id)
  if (project === undefined) {
    return <Redirect href="/projects" />
  }
  return (
    <Page>
      <helix-flex direction="column" gap="xl">
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
        <helix-card>
          <helix-flex direction="column" gap="lg">
            <helix-meter
              label="Tasks done"
              max={project.tasks}
              show-value
              value={project.done}
              value-text={`${project.done} of ${project.tasks}`}
            >
              <helix-text slot="label">Tasks done</helix-text>
            </helix-meter>
            <helix-description-list divided>
              <helix-description-list-item label="Owner">
                {project.owner}
              </helix-description-list-item>
              <helix-description-list-item label="Due">
                <helix-format-date
                  date={project.due}
                  day="numeric"
                  month="long"
                  time-zone="UTC"
                  year="numeric"
                ></helix-format-date>
              </helix-description-list-item>
            </helix-description-list>
          </helix-flex>
        </helix-card>
      </helix-flex>
    </Page>
  )
}
