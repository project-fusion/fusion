import { useLocalSearchParams } from 'expo-router'
import { projectOf } from '../../../src/data'
import { Settings } from '../../../src/panels'

/** `/projects/<project>/settings`: who hears about the project, who sees it, and archiving it. */
export default function SettingsRoute() {
  const project = projectOf(useLocalSearchParams<{ project: string }>().project)
  return project === undefined ? null : <Settings project={project} />
}
