import { useLocalSearchParams } from 'expo-router'
import { projectOf } from '../../../src/data'
import { Overview } from '../../../src/panels'

/** `/projects/<project>`: how far the project is, its stages, and who runs it. */
export default function OverviewRoute() {
  const project = projectOf(useLocalSearchParams<{ project: string }>().project)
  return project === undefined ? null : <Overview project={project} />
}
