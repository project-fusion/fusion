import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { PROJECTS, STATUS } from '../../src/data'
import { Page } from '../../src/page'

/** `/projects`: every project, each row a link to its own route. */
export default function Projects() {
  const route = useHelixRoute()
  return (
    <Page>
      <helix-flex direction="column" gap="xl">
        <helix-flex direction="column" gap="2xs">
          <helix-text as="h1" scale="heading">
            Projects
          </helix-text>
          <helix-text emphasis="muted">{`${PROJECTS.length} projects`}</helix-text>
        </helix-flex>
        <helix-card>
          <helix-list divided label="Projects">
            {PROJECTS.map((project) => (
              <helix-list-item
                href={route.href(`/projects/${project.id}`)}
                key={project.id}
                value={project.id}
              >
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
    </Page>
  )
}
