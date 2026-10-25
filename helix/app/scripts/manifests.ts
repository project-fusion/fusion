/* Writes what Expo Go reads to open the exported gallery, beside the export
   `expo export` wrote into `dist`:

   - `ios.json` and `android.json`, the manifest for each platform, naming the
     bundle and every asset by its address under the base URL;
   - `host.json`, what the host answers beyond serving files: the headers a
     manifest needs, the address that picks a manifest by platform, and the
     answer at `/message`.

   **The same export gives the same bytes.** A manifest's `id` is derived from
   the files it names, and `createdAt` is the time of the commit, so the one
   input that differs between two builds of one commit is the base URL.

   **Expo Go opens an update only when its `createdAt` is later than the one
   it holds for the same `scopeKey`**, so each deploy is dated after the last,
   and the scope is the base URL: a gallery served from a laptop does not
   stand in for the one on the site.

   `--dist` names another folder holding what `expo export` wrote, so a host
   can copy the export and write the manifests for its own address beside
   the copy, leaving `dist` as `bundle` wrote it.

   bun scripts/manifests.ts --base https://example.com/gallery [--dist <folder>] */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { getConfig } from 'expo/config'
import { HOST } from './host'

const here = join(import.meta.dir, '..')

const { values } = parseArgs({
  options: { base: { type: 'string' }, dist: { type: 'string' } },
})
const dist = resolve(values.dist ?? join(here, 'dist'))
if (values.base === undefined) {
  console.error('Give the address the export is served from: --base https://example.com/gallery')
  process.exit(1)
}
const base = new URL(values.base).href.replace(/\/$/, '')

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  json: 'application/json',
  otf: 'font/otf',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  webp: 'image/webp',
}

/** What `expo export` says it wrote for one platform. */
interface Written {
  readonly assets: readonly { readonly ext: string; readonly path: string }[]
  readonly bundle: string
}

const metadata = JSON.parse(readFileSync(join(dist, 'metadata.json'), 'utf8')) as {
  fileMetadata: Readonly<Record<string, Written>>
}

/** A file's SHA-256, in the base64url Expo Go checks a download against. */
const hashOf = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('base64url')

/** A UUID read from a digest, so the same files give the same `id`. */
const uuidOf = (text: string): string => {
  const hex = createHash('sha256').update(text).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16)
  const at = hex.join('')
  return `${at.slice(0, 8)}-${at.slice(8, 12)}-${at.slice(12, 16)}-${at.slice(16, 20)}-${at.slice(20)}`
}

/** When the commit the export was built from was made, or now outside a repository. */
const createdAt = (): string => {
  const epoch = process.env.SOURCE_DATE_EPOCH
  if (epoch !== undefined && epoch !== '') {
    return new Date(Number(epoch) * 1000).toISOString()
  }
  try {
    const seconds = execFileSync('git', ['log', '-1', '--format=%ct'], {
      cwd: here,
      encoding: 'utf8',
    })
    return new Date(Number(seconds.trim()) * 1000).toISOString()
  } catch {
    console.warn('No commit to date the export by: createdAt is now, so two exports differ.')
    return new Date().toISOString()
  }
}

const { exp } = getConfig(here, { isPublicConfig: true, skipSDKVersionRequirement: false })
const sdk = exp.sdkVersion ?? ''
const when = createdAt()

for (const [platform, written] of Object.entries(metadata.fileMetadata)) {
  const bundle = readFileSync(join(dist, written.bundle))
  const assets = written.assets.map(({ ext, path }) => ({
    contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    fileExtension: `.${ext}`,
    hash: hashOf(readFileSync(join(dist, path))),
    key: path.split('/').pop() ?? path,
    url: `${base}/${path}`,
  }))
  const launchAsset = {
    contentType: 'application/javascript',
    hash: hashOf(bundle),
    key: createHash('md5').update(bundle).digest('hex'),
    url: `${base}/${written.bundle}`,
  }
  const manifest = {
    assets,
    createdAt: when,
    extra: {
      expoClient: exp,
      scopeKey: base,
    },
    id: uuidOf(JSON.stringify([launchAsset.hash, ...assets.map((asset) => asset.hash), base])),
    launchAsset,
    metadata: {},
    runtimeVersion: `exposdk:${sdk}`,
  }
  writeFileSync(join(dist, `${platform}.json`), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`${relative(process.cwd(), join(dist, platform))}.json: ${launchAsset.url}`)
}

writeFileSync(join(dist, 'host.json'), `${JSON.stringify({ base, ...HOST }, null, 2)}\n`)
console.log(`createdAt ${when}`)
const opened = new URL(base)
console.log(
  `Expo Go opens ${opened.protocol === 'https:' ? 'exps' : 'exp'}://${opened.host}${opened.pathname.replace(/\/$/, '')}`,
)
