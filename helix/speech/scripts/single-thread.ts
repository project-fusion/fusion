/**
 * Places the single-thread Moonshine build in `dist/worker/single-thread`, after
 * checking each file against the digest `single-thread.json` pins.
 *
 * The files are assets of the GitHub release `single-thread.json` names, and
 * are downloaded once into `vendor/single-thread`. `build-single-thread.sh`
 * builds them from source into the same folder.
 *
 * **While the repository is private, a release asset needs a token.** This
 * reads `GH_TOKEN`, which CI sets, and asks `gh` for one otherwise.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPOSITORY = 'project-fusion/fusion'

const root = join(import.meta.dir, '..')
const pins = JSON.parse(readFileSync(join(root, 'single-thread.json'), 'utf8')) as {
  files: Record<string, string>
  release: string
}
const from = join(root, 'vendor', 'single-thread')
const to = join(root, 'dist', 'worker', 'single-thread')

const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

const token = (): string | undefined => {
  if (process.env.GH_TOKEN) {
    return process.env.GH_TOKEN
  }
  const gh = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' })
  return gh.status === 0 ? gh.stdout.trim() : undefined
}

/** Downloads one asset: through the API with a token, which a private repository needs, or by its public URL. */
const download = async (name: string): Promise<Uint8Array> => {
  const auth = token()
  let url = `https://github.com/${REPOSITORY}/releases/download/${pins.release}/${name}`
  const headers: Record<string, string> = {}
  if (auth) {
    headers.authorization = `Bearer ${auth}`
    const release = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/releases/tags/${pins.release}`,
      { headers },
    )
    if (!release.ok) {
      throw new Error(`Release ${pins.release} answered ${release.status}.`)
    }
    const { assets } = (await release.json()) as { assets: { name: string; url: string }[] }
    const asset = assets.find((each) => each.name === name)
    if (!asset) {
      throw new Error(`Release ${pins.release} has no asset named ${name}.`)
    }
    url = asset.url
    headers.accept = 'application/octet-stream'
  }
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(
      `${name} from release ${pins.release} answered ${response.status}. Set GH_TOKEN or sign in with gh.`,
    )
  }
  return new Uint8Array(await response.arrayBuffer())
}

mkdirSync(from, { recursive: true })
mkdirSync(to, { recursive: true })

for (const [name, pinned] of Object.entries(pins.files)) {
  const path = join(from, name)
  if (!existsSync(path) || digest(readFileSync(path)) !== pinned) {
    writeFileSync(path, await download(name))
  }
  const actual = digest(readFileSync(path))
  if (actual !== pinned) {
    throw new Error(`${path} has digest ${actual}, and single-thread.json pins ${pinned}.`)
  }
  copyFileSync(path, join(to, name))
}
