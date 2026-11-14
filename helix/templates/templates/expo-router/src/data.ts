/* The app's data, written out so the pages have something to draw. Replace it
   with your own. */

/** A project on the list. */
export interface Project {
  /** The tasks done, out of `tasks`. */
  readonly done: number
  readonly due: string
  readonly id: string
  readonly name: string
  readonly owner: string
  readonly status: keyof typeof STATUS
  readonly summary: string
  readonly tasks: number
}

/** The words and the tone of each status. */
export const STATUS = {
  'at-risk': { label: 'At risk', tone: 'warning' },
  done: { label: 'Done', tone: 'success' },
  'on-track': { label: 'On track', tone: 'primary' },
} as const

export const PROJECTS: readonly Project[] = [
  {
    done: 18,
    due: '2026-12-04',
    id: 'website',
    name: 'Website',
    owner: 'Avery Kim',
    status: 'on-track',
    summary: 'A new home page and pricing page.',
    tasks: 30,
  },
  {
    done: 7,
    due: '2026-11-20',
    id: 'mobile-app',
    name: 'Mobile app',
    owner: 'Jordan Lee',
    status: 'at-risk',
    summary: 'Sign in and checkout on iOS and Android.',
    tasks: 24,
  },
  {
    done: 12,
    due: '2026-10-30',
    id: 'help-center',
    name: 'Help center',
    owner: 'Sam Rivera',
    status: 'done',
    summary: 'Forty articles moved to the new site.',
    tasks: 12,
  },
]

/** The project with this id, or `undefined`. */
export const projectOf = (id: string | undefined): Project | undefined =>
  PROJECTS.find((project) => project.id === id)
