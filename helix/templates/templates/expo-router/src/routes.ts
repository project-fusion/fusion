import { projectOf } from './data'

/** The destinations in the header. Add a route under `app` and list it here. */
export const DESTINATIONS = [
  { label: 'Home', route: '/' },
  { label: 'Projects', route: '/projects' },
] as const

/**
 * The words of each crumb in the trail to a route: `Projects`, then the
 * project's name. A route with no words has no crumb.
 */
export const crumbOf = (route: string): string | undefined => {
  const [, section, id] = route.split('/')
  if (section !== 'projects') {
    return undefined
  }
  return id === undefined ? 'Projects' : projectOf(id)?.name
}
