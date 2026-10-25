/** A project on the dashboard. */
export interface Project {
  readonly activity: readonly Change[]
  /** The tasks done and the tasks in all. */
  readonly done: number
  readonly due: string
  readonly id: string
  readonly members: readonly Person[]
  readonly name: string
  readonly owner: Person
  readonly started: string
  /** The stage the project is in, by its place in `STAGES`. */
  readonly stage: number
  readonly status: 'at-risk' | 'done' | 'on-track'
  readonly summary: string
  readonly tasks: number
}

export interface Person {
  readonly initials: string
  readonly name: string
}

/** One thing that happened on a project. */
export interface Change {
  readonly at: string
  readonly by: string
  readonly detail: string
  readonly title: string
  readonly tone?: 'danger' | 'primary' | 'success' | 'warning'
}

export const STAGES = ['Plan', 'Design', 'Build', 'Launch'] as const

export const STATUS = {
  'at-risk': { label: 'At risk', tone: 'warning' },
  done: { label: 'Done', tone: 'success' },
  'on-track': { label: 'On track', tone: 'primary' },
} as const

const ada: Person = { initials: 'AO', name: 'Ada Okonjo' }
const lin: Person = { initials: 'LW', name: 'Lin Wei' }
const sam: Person = { initials: 'SR', name: 'Sam Rivera' }
const noor: Person = { initials: 'NH', name: 'Noor Haddad' }
const jon: Person = { initials: 'JB', name: 'Jon Berg' }

export const PROJECTS: readonly Project[] = [
  {
    activity: [
      {
        at: '2026-10-21T16:40:00Z',
        by: 'Lin Wei',
        detail: 'The pricing page and the checkout now share one layout.',
        title: 'Merged the pricing page',
        tone: 'success',
      },
      {
        at: '2026-10-21T11:05:00Z',
        by: 'Ada Okonjo',
        detail: 'The header logo fails contrast in dark mode.',
        title: 'Opened a design review',
        tone: 'warning',
      },
      {
        at: '2026-10-20T15:20:00Z',
        by: 'Sam Rivera',
        detail: '1,204 tests across 18 packages.',
        title: 'Build passed',
        tone: 'primary',
      },
      {
        at: '2026-10-20T09:12:00Z',
        by: 'Lin Wei',
        detail: 'The design for the account pages is approved.',
        title: 'Moved to Build',
      },
    ],
    done: 34,
    due: '2026-11-14T17:00:00Z',
    id: 'website',
    members: [ada, lin, sam, noor],
    name: 'Website redesign',
    owner: ada,
    stage: 2,
    started: '2026-08-03T09:00:00Z',
    status: 'on-track',
    summary: 'A new marketing site and account pages on the shared design system.',
    tasks: 50,
  },
  {
    activity: [
      {
        at: '2026-10-21T13:30:00Z',
        by: 'Jon Berg',
        detail: 'Three tasks are past their due date.',
        title: 'Flagged as at risk',
        tone: 'danger',
      },
      {
        at: '2026-10-19T10:00:00Z',
        by: 'Noor Haddad',
        detail: 'Offline sync waits on the new API.',
        title: 'Blocked on the API',
        tone: 'warning',
      },
    ],
    done: 12,
    due: '2026-10-31T17:00:00Z',
    id: 'mobile',
    members: [noor, jon, sam],
    name: 'Mobile app',
    owner: noor,
    stage: 2,
    started: '2026-07-14T09:00:00Z',
    status: 'at-risk',
    summary: 'The first release of the phone app for iOS and Android.',
    tasks: 40,
  },
  {
    activity: [
      {
        at: '2026-10-18T14:00:00Z',
        by: 'Sam Rivera',
        detail: 'Every region reads from the new store.',
        title: 'Finished the migration',
        tone: 'success',
      },
    ],
    done: 22,
    due: '2026-10-18T17:00:00Z',
    id: 'billing',
    members: [sam, ada],
    name: 'Billing migration',
    owner: sam,
    stage: 3,
    started: '2026-06-02T09:00:00Z',
    status: 'done',
    summary: 'Invoices and payments moved to the new billing provider.',
    tasks: 22,
  },
  {
    activity: [
      {
        at: '2026-10-17T09:30:00Z',
        by: 'Jon Berg',
        detail: 'Interviews with eight customers are booked.',
        title: 'Started research',
        tone: 'primary',
      },
    ],
    done: 3,
    due: '2026-12-12T17:00:00Z',
    id: 'onboarding',
    members: [jon, lin],
    name: 'Onboarding flow',
    owner: jon,
    stage: 0,
    started: '2026-10-13T09:00:00Z',
    status: 'on-track',
    summary: 'A shorter first run for new teams, from sign-up to the first project.',
    tasks: 26,
  },
]
