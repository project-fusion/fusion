import { useLocalSearchParams } from 'expo-router'
import { projectOf } from '../../../src/data'
import { Activity } from '../../../src/panels'

/** `/projects/<project>/activity`: what happened on the project, newest first. */
export default function ActivityRoute() {
  const project = projectOf(useLocalSearchParams<{ project: string }>().project)
  return project === undefined ? null : <Activity project={project} />
}
