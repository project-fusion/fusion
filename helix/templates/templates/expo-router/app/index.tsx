import { PROJECTS } from '../src/data'
import { Page } from '../src/page'

const open = PROJECTS.filter((project) => project.status !== 'done')
const late = PROJECTS.filter((project) => project.status === 'at-risk')
const done = PROJECTS.reduce((sum, project) => sum + project.done, 0)

/** The files to open first, shown on the home screen. */
const START = [
  { file: 'app/index.tsx', what: 'This screen. Each file under app is a route.' },
  { file: 'src/header.tsx', what: 'The bar over every screen and its links.' },
  { file: 'helix.json', what: 'Your theme. Run npm run theme after you change it.' },
] as const

/** `/`: the week in numbers, and where to start. */
export default function Home() {
  return (
    <Page>
      <helix-flex direction="column" gap="xl">
        <helix-flex direction="column" gap="2xs">
          <helix-text as="h1" variant="heading">
            Home
          </helix-text>
          <helix-text emphasis="muted">
            One set of pages, drawn as a website and as a phone app.
          </helix-text>
        </helix-flex>
        <helix-stat-group
          columns={3}
          divided
          label="Projects"
          style={{ '--stat-group-gap': 'var(--helix-space-lg)' }}
        >
          <helix-stat value={open.length}>
            <helix-text slot="label">Open</helix-text>
          </helix-stat>
          <helix-stat value={late.length}>
            <helix-text slot="label">At risk</helix-text>
          </helix-stat>
          <helix-stat value={done}>
            <helix-text slot="label">Tasks done</helix-text>
          </helix-stat>
        </helix-stat-group>
        <helix-card>
          <helix-text as="h2" slot="header" variant="title">
            Start here
          </helix-text>
          <helix-list divided label="Files to open first">
            {START.map((one) => (
              <helix-list-item key={one.file} value={one.file}>
                {one.file}
                <helix-text slot="description">{one.what}</helix-text>
              </helix-list-item>
            ))}
          </helix-list>
        </helix-card>
      </helix-flex>
    </Page>
  )
}
