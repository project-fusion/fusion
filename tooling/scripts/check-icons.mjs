/**
 * Holds every `<helix-icon name="…">` to a glyph the set actually has.
 *
 * The name is a string, and a string in a template is checked by nothing. The
 * import beside it is: `import { plus } from '@helix-io/icons'` fails to
 * compile the moment `plus` is not there, which is why nobody thought to look
 * at the other spelling of the same mistake. A wrong name renders a
 * `<helix-icon>` that draws nothing at all: no error, no warning, and a control
 * that is simply empty.
 *
 * Twice in one day. `dots-three` was written into Breadcrumbs' overflow trigger
 * and was not in the set, so the control a reader was meant to press was a
 * blank box; and an Image example asked for `image-broken`, which has never
 * existed. Both survived review, both survived `verify`, and both were found by
 * a person looking at a screen.
 *
 * `icons.txt` is the source rather than the generated module, because it is the
 * file a person edits and the one under version control. The generated module
 * is derived from it and is gitignored, so a check reading that would pass on a
 * stale build and fail on a clean checkout.
 *
 * Examples and component sources both. The example is where this was filed
 * from, and the component source is where the worse instance was: an example
 * with a blank icon is a wrong picture on a docs page, and a component with one
 * ships the blank to everybody.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const known = new Set(
  readFileSync(join(ROOT, 'helix/icons/icons.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#')),
)

/* Every file under a root, minus the places a name is not an icon name: `dist`
   is generated, `node_modules` is somebody else's, and a spec naming a missing
   glyph on purpose is testing exactly that. */
const walk = (dir, take) => {
  const out = []
  if (!existsSync(dir)) {
    return out
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue
    }
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(path, take))
    } else if (take(entry.name)) {
      out.push(path)
    }
  }
  return out
}

const files = [
  ...walk(join(ROOT, 'helix'), (name) => name.endsWith('.html')),
  ...walk(join(ROOT, 'helix'), (name) => name.endsWith('.ts') && !name.includes('.spec.')),
  ...walk(join(ROOT, 'site/ui/app'), (name) => name.endsWith('.tsx') || name.endsWith('.html')),
]

/* `name` on a `helix-icon`, however the attribute is written: an HTML example
   puts it on its own line, a Lit template inlines it, and JSX may brace it. A
   braced value is an expression and is skipped, since the name is computed and
   this cannot know it. */
const usage = /<helix-icon\b[^>]*?\bname=(?:"([^"{}]+)"|'([^'{}]+)')/g

const problems = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(usage)) {
    const name = match[1] ?? match[2]
    if (name === undefined || known.has(name)) {
      continue
    }
    const line = text.slice(0, match.index).split('\n').length
    problems.push(
      `${file.slice(ROOT.length + 1)}:${line}: <helix-icon name="${name}"> is not in the set. ` +
        'An unknown name draws nothing and says nothing. Add it to `helix/icons/icons.txt` ' +
        'and run `bun run icons`, or use one that is there.',
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Icons named that do not exist (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`icons: ${files.length} files, every \`helix-icon\` names one of ${known.size} glyphs`)
