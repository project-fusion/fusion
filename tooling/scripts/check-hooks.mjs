#!/usr/bin/env node
/**
 * A documented CSS hook has to be read somewhere, or it does nothing at all.
 *
 * `@cssproperty` is how a component publishes a custom property a consumer may
 * set. It reaches the manifest, the reference doc and the API page, so a name
 * written there is a promise. Nothing checked that any rule read it, and the
 * failure is completely silent: the consumer sets the property, the cascade
 * carries it, and no declaration ever asks for it.
 *
 * Found the same way it is checked here, on `Button`. Its box moved to the base
 * layer and the shadow rules that read `--button-background-color`,
 * `--button-foreground-color` and `--button-radii` moved out from under it, so
 * three of its four documented hooks had been inert since that refactor while
 * the API page went on listing them.
 *
 * Both directions, because both are silent in their own way:
 *
 * - **Declared and never read** is a promise with nothing behind it.
 * - **Read and never declared** is a working feature nobody is told about, and
 *   one nothing stops a later edit from removing, since no document names it.
 *
 * Design tokens (`--helix-name`) are excluded, because `check:css:tokens` already
 * owns them and a component reading one is not publishing a hook.
 *
 * **Private properties (`--_name`) used to be excluded outright, and that was
 * the hole.** The reasoning was that they are a component talking to itself and
 * so nobody's API, which is true of what they promise and says nothing about
 * whether anyone answers. `--_toggle-height` was written by Toggle Group and
 * read by nothing at all: the item it was meant to size used a literal
 * `block-size: 100%` in its own sheet, and the property sat there through every
 * run of this check because the exemption was on the name rather than on the
 * question. A private property with no reader is the same broken promise as a
 * public one, and it is harder to see, because no API page lists it.
 *
 * So the third rule below: a private property declared in a component
 * stylesheet and read by nothing in its own package is dead. Package rather
 * than file, because that is where the underscore's contract lives: the value
 * never leaves the package, and Tabs sets `--_tab-radius` on its root for the
 * tab's own shadow root to read, one file over.
 *
 * Two things are deliberately outside it. `helix/styles` is excluded because
 * its primitives are a scale, and `check:css:tokens` says in as many words that a
 * rung with no reader is fine: `--_helix-neutral-500` is not dead, it is a step
 * nothing has needed yet. And `.examples/` is excluded because a headless
 * example's gray palette is written whole in every family's `preview.css`, so a
 * family that uses four of the seven is not a fault in the example. It was
 * emitted whole by a generator when this was written and is authored whole now,
 * which changes who repeats it and not that it repeats.
 *
 * **A hook is named after the family that owns it, and that is the third
 * silent failure this file covers.** A consumer predicts `--card-padding` from
 * `<helix-card>` and predicts nothing at all from a name that does not follow,
 * and a custom property naming no declaration is inert with no error: the same
 * class as a `::part()` that resolves to nothing. Six were unguessable.
 * `<helix-pin-input>` published `--pin-gap`. `<helix-breadcrumb>` published
 * `--breadcrumb-hover-color` and `--breadcrumb-control-size` beside its own
 * `--breadcrumbs-separator-color`, so one component shipped both spellings and
 * neither reading was wrong from inside it. The sandbox published
 * `--status-bar-color` and `--terminal-size`, which name no component at all.
 *
 * **The family, not the element**, which took a measurement to settle. The
 * obvious rule is the tag, and it is wrong in both tiers at once: the headless
 * elements are `helix-headless-slider` and publish `--slider-*` because the
 * hook is shared with the styled tier, and `<helix-tree-item>` publishes
 * `--tree-*` because the hook belongs to Tree rather than to the row. Fifty-odd
 * correct names fail a tag rule and none of them should change.
 *
 * **A public name may not be shared, which is the rule `--_color` was split
 * for.** Two elements in one family documenting one hook is inheritance and is
 * fine, `--table-columns` at both tiers being exactly that. Two *families* is a
 * collision: `--toolbar-gap` was declared by `<helix-toolbar>` defaulting to
 * `space-2xs` and by `<helix-sandbox-toolbar>` defaulting to `space-sm`, so one
 * declaration on a container holding both set two different things and neither
 * component could be blamed.
 *
 * Run with `bun run check:css:hooks` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/* Every tier that ships CSS or documents a component. `helix/styles` reads
   hooks without declaring any, which is exactly the pairing that made Button's
   go missing: the declaration stayed in one tier and the rule moved to
   another. */
const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styles/src', 'helix/styled/src']

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else {
      found.push(path)
    }
  }
  return found
}

/* Generated `.css.ts` files are the `.css` beside them wrapped in a template
   literal, so counting both would let a hook look read when the source it came
   from was deleted. */
const isSource = (path) => !path.endsWith('.css.ts') && !path.includes('.spec.')

const ours = (name) => !name.startsWith('--_') && !name.startsWith('--helix-')

/* Where the private rule applies: the component tiers, and not the base
   examples inside them. See the header for why `helix/styles` is not here. */
const OWNS_PRIVATE = (path) => !path.startsWith('helix/styles/') && !path.includes('.examples/')

/** The package a file belongs to, which is how far a private property travels. */
const packageOf = (path) => path.split('/').slice(0, 2).join('/')

/**
 * Prefixes owned by a shared vocabulary rather than by one family.
 *
 * **Registered rather than inferred, so the exemption is a decision somebody
 * made.** `--chart-*` is real: `helix/styled/src/shared/chart/series.css` is imported
 * by Legend and three chart families, `chart/terminus.css` by Sparkline, and
 * `MixinChartSource` in core writes `--chart-series-N` for all of them. A hook
 * five components read is not Sparkline's however it was declared, and naming
 * it `--sparkline-terminus-size` would be the lie.
 *
 * The bar for adding one is a file more than one family imports. Anything else
 * is a family hook that has drifted.
 */
const SHARED = new Set(['chart'])

/** Where the shared sheets live, which is not where a family lives. */
const SHARED_ROOT = 'helix/styled/src/shared'

/**
 * Every shared folder, discovered rather than listed.
 *
 * **Two jobs, and conflating them pre-grants an exemption nothing asked for.**
 * `SHARED` above is the naming exemption: it lets `--chart-*` be a hook not
 * named after the family that reads it, and it is an opt-in because granting it
 * is a decision. This is the other rule, that a sheet in a shared folder has the
 * second reader the folder exists for, and it applies to every folder in there
 * whether or not any of its rules declare a hook.
 *
 * `field/` is the case that separates them: seventeen families import it and it
 * declares no `--field-*` at all, reading only tokens. Registering it in `SHARED`
 * to get the two-reader rule would have handed it a naming exemption for hooks
 * that do not exist, so the day one appeared it would have escaped the check
 * silently. Discovered here, and named there when something needs it.
 */
const sharedFolders = () => {
  try {
    return readdirSync(SHARED_ROOT).filter((one) => statSync(join(SHARED_ROOT, one)).isDirectory())
  } catch {
    return []
  }
}

/**
 * The family a hook belongs to, which is the directory the component sits in.
 *
 * `helix/styled/src/tree/item/…` is Tree whichever element declares it, and a
 * controller in core is its own owner: `floating-controller` owns `--floating-*`.
 * A mixin has no family and reaches every one that applies it, so it declares
 * only shared names and `SHARED` is what clears it.
 */
const ownerOf = (path) => {
  const parts = path.split('/')
  if (parts[0] === 'helix' && parts[1] === 'core') {
    /* One level deeper than a tier, because core groups by kind first:
       `core/src/controllers/floating-controller` owns `--floating-*`. */
    return parts[4]?.replace(/-controller$/, '') ?? ''
  }
  return parts[3] ?? ''
}

/* A comment quoting `var(--_thing)` is prose about a reader, not one. The
   public halves above scan the file whole and have got away with it; this rule
   cannot, because a property's own explanation sits directly above it and
   routinely spells out the rule that was supposed to read it. */
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const declared = new Map()
/* `--name` -> family -> the first file in it that declared the hook. Two
   families under one name is the collision the header describes; two files in
   one family is a hook documented at both tiers, which is inheritance. */
const declaredBy = new Map()
/* Every declaration, not just the last, so a name written twice is visible.
   `declared` above is a Map and the second `set` overwrote the first, which is
   why this check has never been able to see a duplicate: by the time it counts,
   each name appears once. Measured on `Divider`, which declared
   `--divider-color` and `--divider-thickness` twice apiece under two different
   descriptions, and shipped all eight to the manifest and the API page. */
const declaredAt = new Map()
const read = new Map()
/* `--_name` -> package -> the file that declared it, and the packages that read it. */
const privateDeclared = new Map()
const privateRead = new Map()
/* Prefixes read through an interpolation, so `--chart-series-7` counts as read
   because something reads `var(--chart-series-${…})`. */
const families = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier).filter(isSource)) {
    const text = readFileSync(path, 'utf8')
    if (extname(path) === '.ts') {
      for (const [, name] of text.matchAll(/@cssproperty\s+(--[a-z0-9-]+)/g)) {
        declared.set(name, path)
        const key = `${path}\u0000${name}`
        declaredAt.set(key, (declaredAt.get(key) ?? 0) + 1)
        const owner = ownerOf(path)
        if (owner) {
          const owners = declaredBy.get(name) ?? new Map()
          if (!owners.has(owner)) {
            owners.set(owner, path)
          }
          declaredBy.set(name, owners)
        }
      }
    }
    if (extname(path) === '.css') {
      for (const [, name] of text.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
        if (ours(name) && !read.has(name)) {
          read.set(name, path)
        }
      }
    }
    if (OWNS_PRIVATE(path)) {
      const source = withoutComments(text)
      if (extname(path) === '.css') {
        for (const [, name] of source.matchAll(/^\s*(--_[a-z0-9-]+)\s*:/gm)) {
          const where = privateDeclared.get(name) ?? new Map()
          if (!where.has(packageOf(path))) {
            where.set(packageOf(path), path)
          }
          privateDeclared.set(name, where)
        }
      }
      for (const [, name] of source.matchAll(/var\(\s*(--_[a-z0-9-]+)/g)) {
        const where = privateRead.get(name) ?? new Set()
        where.add(packageOf(path))
        privateRead.set(name, where)
      }
    }
    /* A `style="--a: var(--b)"` in a template is a read too, and missing it
       reported twenty-four live hooks as dead. The charts put the series index
       into CSS this way precisely because CSS cannot count it: the component
       writes `--chart-series: var(--chart-series-3)` onto the rectangle, so
       `--chart-series-3` is read by the component rather than by a rule. Only
       inside a `style=` attribute, so an ordinary `var()` in prose or in a
       comment still does not count as one. */
    if (extname(path) === '.ts') {
      for (const [, attribute] of text.matchAll(/style="([^"]*)"/g)) {
        /* A family read through an interpolation, `var(--chart-series-${n})`.
           The number is chosen at runtime, so no literal `--chart-series-7`
           exists anywhere and matching names alone reported twenty-four live
           hooks as dead. What the component states is that it reads the whole
           family, so that is what is recorded. */
        for (const [, prefix] of attribute.matchAll(/var\(\s*(--[a-z0-9-]+)-\$\{/g)) {
          if (ours(prefix)) {
            families.set(prefix, path)
          }
        }
        for (const [, name] of attribute.matchAll(/var\(\s*(--[a-z0-9-]+)\)/g)) {
          if (ours(name) && !read.has(name)) {
            read.set(name, path)
          }
        }
      }
    }
  }
}

const problems = []

/**
 * A member of a family something reads through an interpolation.
 *
 * **The suffix used to have to be a number, and the family is what was
 * recorded.** `--chart-series-${n}` was the only case when this was written, and
 * an index is what a series has, so the two facts were conflated into one test.
 * Heatmap reads `--heatmap-tone-${tone}` where a tone is a name: `success` and
 * `danger` for a status strip, `1` through `5` for the ramp, and whatever a
 * consumer invents for their own. Under the digit test the ramp members passed
 * and the semantic ones did not, from one interpolation, so the family could be
 * published only in the half that happened to be numbered and the rest were API
 * nothing named.
 *
 * The collector above already records exactly the right thing, which is the
 * prefix a component says it reads the whole of. This now trusts it. It is a
 * real widening: any `--foo-bar-*` counts as read once something interpolates
 * `var(--foo-bar-${…})`. That is what "reads the whole family" means, and the
 * two directions this file exists for both survive it, because a name still has
 * to be declared by a rule somebody wrote and a family prefix still has to be
 * interpolated by a component somebody wrote.
 */
const inFamily = (name) => {
  const at = name.lastIndexOf('-')
  return at > 0 && families.has(name.slice(0, at))
}

/* A duplicate pairs with a rule exactly as a single declaration does, so it
   passes every test below it and is invisible to the two-way check this file is
   about. It is only ever a mistake: a hook is one thing, and two descriptions of
   it on one page is the reader being asked which to believe. */
for (const [key, count] of [...declaredAt].sort()) {
  if (count > 1) {
    const [path, name] = key.split('\u0000')
    problems.push(
      `${path}: \`${name}\` is declared ${count} times in one doc block. ` +
        'The manifest keeps every one, so the reference page lists the hook twice, and where the ' +
        'two descriptions differ it lists it twice saying different things.',
    )
  }
}

for (const [name, path] of [...declared].sort()) {
  if (!read.has(name) && !inFamily(name)) {
    problems.push(
      `${path}: documents \`${name}\` and no rule reads it. A hook nothing reads ` +
        'is listed on the API page and does nothing when a consumer sets it.',
    )
  }
}

for (const [name, path] of [...read].sort()) {
  if (!declared.has(name)) {
    problems.push(
      `${path}: reads \`${name}\` and no component documents it with ` +
        '`@cssproperty`. A hook that works and is not published is one a later ' +
        'edit removes without knowing it was API.',
    )
  }
}

/* Named after the family that owns it, or after a registered shared
   vocabulary. A name a consumer cannot predict is one they never try, and one
   they mistype resolves to nothing with no error to go on. */
for (const [name, owners] of [...declaredBy].sort()) {
  for (const [owner, path] of owners) {
    const bare = name.slice(2)
    if (bare.startsWith(`${owner}-`) || [...SHARED].some((one) => bare.startsWith(`${one}-`))) {
      continue
    }
    problems.push(
      `${path}: documents \`${name}\`, which \`${owner}\` does not own. A hook is named after ` +
        `its family, so this one reads as \`--${owner}-…\`, and the name a consumer guesses from ` +
        'the element resolves to nothing with no error. Rename it, or register a shared prefix in ' +
        '`SHARED` if more than one family reads the rule.',
    )
  }
}

/* One public name, one owner. Two tiers of one family is inheritance; two
   families is two components answering to one declaration. */
for (const [name, owners] of [...declaredBy].sort()) {
  if (owners.size > 1) {
    const where = [...owners].map(([owner, path]) => `${owner} (${path})`).join(' and ')
    problems.push(
      `\`${name}\` is documented by more than one family: ${where}. A consumer setting it on a ` +
        'container holding both sets two different things, and neither component is wrong. ' +
        'A public name cannot be shared.',
    )
  }
}

for (const [name, where] of [...privateDeclared].sort()) {
  for (const [pkg, path] of where) {
    if (!privateRead.get(name)?.has(pkg)) {
      problems.push(
        `${path}: declares \`${name}\` and nothing in ${pkg} reads it. A private ` +
          'property is a component talking to itself, and this one is talking to nobody.',
      )
    }
  }
}

/**
 * A sheet in a shared folder is imported by more than one family.
 *
 * **`SHARED` states that bar in prose and nothing held anything to it**, so a
 * sheet drifted in and stayed. `chart/terminus.css` sat there read by
 * `Sparkline` alone, which made `--chart-terminus-*` a hook exempted from the
 * family-naming rule as shared while being read by one family: the same
 * paragraph that grants the exemption calls that "a family hook that has
 * drifted". Worse, the claim reached a consumer, because Sparkline's `terminus`
 * documentation says the shapes are "shared with every other chart that ends a
 * line", which is on the published API page and was not true.
 *
 * So the folder is asked the question its own comment asks. One importer means
 * the sheet belongs inside that family, and the hooks belong to it too.
 */
for (const folder of sharedFolders()) {
  let sheets
  try {
    sheets = readdirSync(join(SHARED_ROOT, folder)).filter((one) => one.endsWith('.css'))
  } catch {
    problems.push(`${join(SHARED_ROOT, folder)}: is a shared folder and could not be read.`)
    continue
  }
  for (const sheet of sheets) {
    const readers = new Set()
    for (const path of walk('helix/styled/src')) {
      if (!path.endsWith('.ts') || path.endsWith('.css.ts') || path.includes('/shared/')) {
        continue
      }
      if (readFileSync(path, 'utf8').includes(`shared/${folder}/${sheet}.js`)) {
        readers.add(path.split('/')[3])
      }
    }
    if (readers.size < 2) {
      problems.push(
        `${join(SHARED_ROOT, folder)}/${sheet}: is in a shared folder and ${
          readers.size === 0 ? 'no family imports it' : `only \`${[...readers][0]}\` imports it`
        }. A folder under \`shared/\` exists so more than one family can take the sheet, and ` +
          'the bar is a file more than one family imports. Move it into the family that reads it, ' +
          'or give the other families the part it draws.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `CSS hooks that do not hold up, declared without a reader, read without a declaration, or declared twice (${problems.length}):\n`,
  )
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `hooks: ${declared.size} documented CSS properties, every one read by a rule, named after its ` +
    'family, and owned by one',
)
