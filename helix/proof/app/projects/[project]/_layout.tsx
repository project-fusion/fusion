import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { Redirect, Slot, useLocalSearchParams } from 'expo-router'
import { projectOf } from '../../../src/data'
import { Page } from '../../../src/page'
import { ProjectFrame } from '../../../src/project'
import { TABS } from '../../../src/routes'

/**
 * `/projects/<project>` and its tabs: the project's frame, with the tab the
 * route names drawn in its panel. A project the data lacks goes back to the
 * list.
 */
export default function ProjectLayout() {
  const { project: id } = useLocalSearchParams<{ project: string }>()
  const route = useHelixRoute()
  const project = projectOf(id)
  if (project === undefined) {
    return <Redirect href="/projects" />
  }
  const last = route.path.split('/').at(-1)
  const tab = TABS.find((one) => one.value === last)?.value ?? 'overview'
  return (
    <Page>
      <ProjectFrame project={project} tab={tab}>
        <Slot />
      </ProjectFrame>
    </Page>
  )
}
