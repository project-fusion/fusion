import { projectOf } from './data'

/** The app's destinations, which the header's navigation links to. */
export const DESTINATIONS = [
  { label: 'Projects', route: '/projects' },
  { label: 'Activity', route: '/activity' },
] as const

/** A project's tabs: each one a route under the project's own. */
export const TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Activity', value: 'activity' },
  { label: 'Settings', value: 'settings' },
] as const

/** One of a project's tabs, by its value. */
export type Tab = (typeof TABS)[number]['value']

/** The route of a project's tab: the project's own route for its overview. */
export const tabRoute = (project: string, tab: Tab): string =>
  tab === 'overview' ? `/projects/${project}` : `/projects/${project}/${tab}`

/**
 * The words of each route in the trail to a project's tab: the list of
 * projects, the project, and the tab under it. The root and the overview,
 * which is the project's own route, have no crumb of their own.
 */
export const crumbOf = (route: string): string | undefined => {
  const [, section, id, tab] = route.split('/')
  if (section !== 'projects') {
    return undefined
  }
  if (id === undefined) {
    return 'Projects'
  }
  if (tab === undefined) {
    return projectOf(id)?.name
  }
  return TABS.find((one) => one.value === tab)?.label
}
