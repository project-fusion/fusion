import { Page } from '../../src/page'
import { ProjectList } from '../../src/project-list'

/** `/projects`: the week in numbers, and every project. */
export default function ProjectsRoute() {
  return (
    <Page>
      <ProjectList />
    </Page>
  )
}
