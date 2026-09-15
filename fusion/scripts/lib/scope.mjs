/**
 * Which families a change reaches, for the checks that compare examples.
 *
 * Shared by parity and the DSD check, which ask different questions of the
 * same corpus and must agree about which part of it a change could move. Each
 * names itself for its log lines and adds its own files, since a change to a
 * check is a change to every result it gives.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Paths that can move any picture in the corpus, so a change to one runs all of it.
 *
 * **Scoping by family is only safe because this list is not.** An example's
 * render is a function of far more than its own two files: the tokens it
 * resolves, the base element that upgrades it, the sheets under `shared/` that
 * seventeen families import, the icons it draws and the bundle both sides render
 * from. None of those live under a family, so none would be caught by a family
 * filter, and each of them changes every picture at once.
 *
 * `shared/` is checked before the family pattern deliberately: it sits at
 * `helix/styled/src/shared` and matches the shape of a family folder without
 * being one, which is the exception the repository's own layout rule names.
 */
const GLOBAL = [
  'helix/styles/',
  'helix/core/',
  'helix/styled/src/shared/',
  'helix/headless/src/shared/',
  'helix/icons/',
  'helix/theme/',
  'helix/testing/',
  'fusion/scripts/lib/',
  'fusion/site/scripts/build-frame.mjs',
]

/**
 * Each scoped check's own files, a change to which reaches every result it gives.
 *
 * Held here rather than in each check, so `plan-browser.mjs` sizes a check's
 * shards by the scope the check will compute and not by a copy of it.
 */
export const OWN = {
  dsd: ['fusion/scripts/check-dsd.mjs', 'fusion/scripts/render-server.mjs'],
  parity: ['fusion/scripts/check-visual-parity.mjs'],
}

const FAMILY_PATH = /^helix\/(?:headless|styled)\/src\/([^/]+)\//

/**
 * The families a change reaches, or `null` for all of them.
 *
 * **Reverse composition, because the arrow points the wrong way for us.**
 * Fifteen families render another inside their own shadow root, named through
 * `this.tag()`, which `helix component`'s `seams` already reads. If `listbox` changes, the
 * picture that moves is `select`'s, so the set has to grow from the changed
 * family outward to everything that composes it, and keep growing: a family
 * composing a family that composes the change is just as affected.
 *
 * **Over-inclusion is the safe direction and is chosen on purpose.** The scan
 * does not strip comments the way `helix component`'s `seams` does, so a `this.tag()` inside
 * a comment pulls a family in that did not need to be there. That costs seconds
 * of comparison. The opposite mistake costs a picture nobody looked at, which is
 * the whole failure this check exists to prevent.
 */
export const scopeFor = (ref, { label, own, root, tiers }) => {
  const global = [...GLOBAL, ...own]
  let changed
  try {
    changed = execFileSync('git', ['diff', '--name-only', `${ref}...HEAD`], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
  } catch {
    /* A shallow clone, an unknown ref, a first commit: any of them means the
       range cannot be resolved, and the honest answer to "what changed" is then
       "assume everything". Silently comparing a subset off a broken range is
       the one outcome worth refusing. */
    console.log(`${label}: cannot resolve ${ref}, comparing the whole corpus.`)
    return null
  }

  const changedGlobal = changed.find((one) => global.some((prefix) => one.startsWith(prefix)))
  if (changedGlobal !== undefined) {
    console.log(`${label}: ${changedGlobal} is read by every example, comparing the whole corpus.`)
    return null
  }

  const seed = new Set()
  for (const one of changed) {
    const found = FAMILY_PATH.exec(one)
    if (found !== null) {
      seed.add(found[1])
    }
  }

  /* Grow the set through whoever composes what is in it, until it stops
     growing. `composes` is family -> the families it renders. */
  const composes = new Map()
  for (const tier of tiers) {
    for (const entry of readdirSync(tier.source, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue
      }
      /* Merged across tiers rather than replaced. A family is one name with a
         folder in each tier, so a plain `composes.set` per tier lets the styled
         pass overwrite the headless one, dropping every composition declared
         only in the headless tier: a change to `button` then fails to reach
         `color-picker`, `steps` or `tour`. */
      const names = composes.get(entry.name) ?? new Set()
      for (const file of readdirSync(join(tier.source, entry.name), { recursive: true })) {
        if (typeof file !== 'string' || !file.endsWith('.ts')) {
          continue
        }
        const source = readFileSync(join(tier.source, entry.name, file), 'utf8')
        for (const [, name] of source.matchAll(/this\.tag\(\s*'([a-z-]+)'/g)) {
          names.add(name)
        }
      }
      composes.set(entry.name, names)
    }
  }

  const reached = new Set(seed)
  for (let grew = true; grew; ) {
    grew = false
    for (const [family, names] of composes) {
      if (reached.has(family)) {
        continue
      }
      if ([...names].some((name) => reached.has(name))) {
        reached.add(family)
        grew = true
      }
    }
  }

  const added = [...reached].filter((one) => !seed.has(one))
  if (added.length > 0) {
    console.log(`${label}: ${added.sort().join(', ')} compose something that changed.`)
  }
  return reached
}
