#!/usr/bin/env node
/**
 * Fails the build when component CSS bypasses the semantic token layer.
 *
 * The token layer only holds if nothing routes around it. One `#f5f5f5` in one
 * component is invisible in review and then invisible in every theme that
 * component appears in: the theme changes, that one value does not, and the
 * bug surfaces as "the disclosure looks wrong in dark mode" months later.
 *
 * Two rules:
 *
 *   1. No raw values in properties that have tokens. Colors, spacing, radii,
 *      durations, font sizes, weights, and z-index must come from
 *      `var(--helix-*)`.
 *   2. No reaching past the semantic layer. `--_helix-*` primitives are
 *      internal to @fusion.dev/helix-styles; a component referencing one is coupled to
 *      a ramp position rather than a role.
 *   3. No references to tokens that do not exist. A renamed or mistyped token
 *      resolves to nothing and the property silently falls back to the browser
 *      default. This is the failure mode rules 1 and 2 cannot see, because the
 *      code looks correct.
 *
 * Scans `css` tagged templates in .ts files and plain .css files.
 * Run with `bun run check:css:tokens` (part of `check` and `verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

/* A git worktree is a second checkout of this repository, and a check that
     walks into one is reading another branch. `.claude/worktrees/*` holds the
     ones the agent tooling makes, so a session working on a different branch
     puts a whole second copy of `helix/` inside this directory tree.
     
     This was not theoretical. `check:css:tokens` passed locally and failed in CI on
     the same commit, because the sibling worktree was checked out before
     `--helix-color-border-strong` was removed and its `tokens.css` put the
     token back into the "defined" set. A real violation on `main` was masked by
     a branch nobody was looking at. */
const IGNORED = new Set([
  '.claude',
  '.git',
  '.local',
  '.next',
  '.next-dev',
  '.turbo',
  'dist',
  'node_modules',
  // Build output, not source. The sandbox frame's stylesheet is the style
  // layers concatenated, so it holds the primitives by construction.
  'public',
  'target',
])

/** The styles package owns primitives and raw values by definition. */
const OWNS_PRIMITIVES = /helix[/\\]styles[/\\]/

/** Properties whose values must come from a token, and which category serves them. */
const TOKENIZED = [
  {
    category: 'color',
    property:
      /(?:^|[^-\w])(?:color|background-color|border-color|outline-color|fill|stroke|caret-color|text-decoration-color|border-(?:block|inline)(?:-(?:start|end))?-color)\s*:/,
  },
  {
    category: 'space',
    property:
      /(?:^|[^-\w])(?:padding|margin|gap|row-gap|column-gap)(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?\s*:/,
  },
  { category: 'radii', property: /(?:^|[^-\w])border-radius\s*:/ },
  { category: 'text', property: /(?:^|[^-\w])font-size\s*:/ },
  { category: 'weight', property: /(?:^|[^-\w])font-weight\s*:/ },
  { category: 'duration', property: /(?:^|[^-\w])(?:transition-duration|animation-duration)\s*:/ },
  { category: 'layer', property: /(?:^|[^-\w])z-index\s*:/ },
]

/** Literal color values. Any of these in a component is a bug. */
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\s*\(/

/** A bare length or number where a token belongs. */
const RAW_LENGTH = /(?:^|[\s:(,])-?\d*\.?\d+(?:px|rem|em|ms|s)?(?=[\s;,)]|$)/

/**
 * Operands of a `calc()` multiplication or division.
 *
 * `calc(var(--_card-inset) * -1)` scales a token; the `-1` is a factor, not a
 * length, and flagging it would push authors toward a second token that exists
 * only to hold the number minus one. Addition and subtraction are left alone,
 * because `calc(var(--x) + 4px)` really is a raw length.
 */
const CALC_FACTOR = /[*/]\s*-?\d*\.?\d+|-?\d*\.?\d+\s*[*/]/g

/** Values that are structural rather than design decisions. */
const ALLOWED_VALUES = new Set([
  '0',
  '0px',
  '0rem',
  'auto',
  'none',
  'inherit',
  'initial',
  'unset',
  'revert',
  'currentColor',
  'transparent',
  '100%',
  '50%',
  '1',
  '1px',
  '9999px',
])

const walk = function* (dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      yield* walk(full)
    } else if (/\.(?:css|ts)$/.test(entry) && !entry.endsWith('.spec.ts')) {
      yield full
    }
  }
}

/**
 * Blanks block comments, keeping every byte and every newline where it was.
 *
 * Whitespace rather than deletion, so an offset into the result still points at
 * the same character of the original and a reported line number is the line the
 * reader has to open.
 */
const blankComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (text) => text.replace(/[^\n]/g, ' '))

/**
 * Extracts CSS blocks: whole file for .css, `css\`...\`` templates for .ts.
 *
 * **Prose was opening blocks, and the cost was silence.** A comment naming a
 * stylesheet writes the word `css` immediately before a backtick, so every
 * mention of `site.css` or `theme.css` in a doc comment looked exactly like a
 * tagged template. On the file this was found with, four such mentions matched
 * and the fourth ran on past the real `css` template and consumed its opening
 * backtick, so the stylesheet itself was never extracted and the check passed
 * over a file it had not read: renaming eight tokens to
 * `--helix-space-nonexistent` still reported no violations. That is the worst
 * shape a check can fail in, and it fails this way for any `.ts` file whose
 * comments mention a `.css` file, which in this repository is most of them.
 *
 * Two guards, because the two cases are different. Comments are blanked first,
 * which removes the whole class. The lookbehind then rejects a `css` that is
 * part of a longer name, `site.css` in a string or a template, where no comment
 * is involved at all.
 *
 * **And the run is escape-aware.** A lazy `[\s\S]*?` ends at the first `\``, and
 * a CSS-in-TS file quotes code in its own comments the way everything here does,
 * so the block would stop early even once it started in the right place.
 * `(?:[^`\\]|\\[\s\S])*` takes an escaped anything as one unit, so only an
 * unescaped backtick closes it.
 */
const cssBlocks = (file, source) => {
  if (file.endsWith('.css')) {
    return [{ offset: 0, text: source }]
  }
  const blocks = []
  const pattern = /(?<![\w.-])css`((?:[^`\\]|\\[\s\S])*)`/g
  const scanned = blankComments(source)
  let match = pattern.exec(scanned)
  while (match !== null) {
    blocks.push({ offset: match.index, text: match[1] })
    match = pattern.exec(scanned)
  }
  return blocks
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const violations = []
const root = process.argv[2] ?? process.cwd()

/**
 * Every semantic token the styles package defines.
 *
 * Built by scanning declarations rather than maintained by hand, so the list
 * cannot drift from what actually ships.
 */
const defined = new Set()
/**
 * The private half, which had no check at all.
 *
 * `unknown-token` matches `--helix-` and therefore never sees a `--_helix-`
 * name, so a semantic token could be built on a primitive that did not exist
 * and nothing said so. `--helix-shadow-lg` was `0 12px 32px
 * var(--_helix-shadow-ink-lg)` for eight hours with that ink defined nowhere,
 * which makes the whole declaration invalid at computed-value time: every
 * shadow in the library resolved to none, in a build where all 177 tokens were
 * present and every check passed.
 *
 * A dangling primitive is worse than a dangling semantic token, because the
 * component that goes unstyled is not the file that names it.
 */
const privates = new Set()
for (const file of walk(root)) {
  if (!OWNS_PRIMITIVES.test(relative(root, file)) || !file.endsWith('.css')) {
    continue
  }
  const source = readFileSync(file, 'utf8')
  for (const [, name] of source.matchAll(/^\s*(--helix-[\w-]+)\s*:/gm)) {
    defined.add(name)
  }
  for (const [, name] of source.matchAll(/^\s*(--_helix-[\w-]+)\s*:/gm)) {
    privates.add(name)
  }
}

if (defined.size === 0) {
  console.error('check-tokens: found no token definitions, refusing to pass vacuously')
  process.exit(1)
}

for (const file of walk(root)) {
  const rel = relative(root, file)
  const source = readFileSync(file, 'utf8')
  const ownsPrimitives = OWNS_PRIMITIVES.test(rel)

  /* An example showing the headless tier writes raw values on purpose.
   *
   * `helix/headless` does not depend on `helix/styles`, which is the property
   * that makes it independently consumable, so a consumer taking it has no
   * `--helix-space-*` to reach for. An example demonstrating that and then
   * reaching for one would teach the opposite of what it is for, and a reader
   * copying it would get a stylesheet resolving to nothing.
   *
   * Read off the markup rather than the filename, which used to be the better of
   * two ways and is now the only one: a stylesheet is exempt when the example
   * beside it renders a `helix-headless-` element, which is the thing that makes
   * it a headless example. The file was called `headless.css` when this was
   * written, so the name carried the answer and was merely a convention to
   * remember. Both tiers call it `preview.css` now, the directory carrying the
   * tier, so the name cannot answer at all and the markup is the fact itself. */
  if (rel.includes('.examples') && file.endsWith('.css')) {
    const markup = file.replace(/\.css$/, '.html')
    if (existsSync(markup) && readFileSync(markup, 'utf8').includes('<helix-headless-')) {
      continue
    }
  }

  for (const block of cssBlocks(file, source)) {
    const text = stripComments(block.text)

    /* **Inside `@font-face` the tokenized properties are facts about a file,
       not choices about a design.** `font-weight: 100 900` there is the range
       the variable font supplies and `font-style: normal` is what it contains;
       a token would be a category error, and `--helix-weight-regular` is not a
       range and could not be written in that slot anyway. This never fired
       before the brand faces moved from `next/font` into CSS on 24 Aug 2026,
       which is why the rule had not met one. Tracked by depth rather than by
       filename, so a `@font-face` anywhere is covered and nothing else is. */
    let inFace = false
    let faceDepth = 0

    for (const [index, rawLine] of text.split('\n').entries()) {
      const line = rawLine.trim()
      const at = `${rel}:${lineOf(source, block.offset) + index}`

      if (/^@font-face\b/.test(line)) {
        inFace = true
        faceDepth = 0
      }
      if (inFace) {
        faceDepth += (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length
        const closed = faceDepth <= 0 && line.includes('}')
        if (line.includes(':')) {
          if (closed) {
            inFace = false
          }
          continue
        }
        if (closed) {
          inFace = false
        }
      }

      /* A primitive named and defined nowhere, checked before the skip below,
         because a definition line is the only place this can happen.
         
         Only inside the styles package: everywhere else `no-primitive-access`
         refuses the reference outright, and reporting both would say the name
         is wrong when what is wrong is reaching for it at all.
         
         The skip exists so that a token definition may hold a raw value, which
         is true and is about the right-hand side being a color rather than a
         `var()`. Applied to the whole line it also skipped every reference one
         token makes to another, which is where `--helix-shadow-lg` sat naming
         an ink that did not exist. Written after the skip, this check passed on
         the exact bug it was written for.
         
         **A bare reference only.** `var(--x, y)` is not dropped, it resolves to
         `y`, so an undefined name behind a fallback is the idiom for a primitive
         a theme may supply and this library need not: `--helix-font-display`
         asks for `--_helix-family-display` and settles for the sans stack. The
         first version of this flagged that line, which is the check telling a
         working declaration it is broken. */
      if (ownsPrimitives) {
        for (const [, name] of line.matchAll(/var\(\s*(--_helix-[\w-]+)\s*\)/g)) {
          if (!privates.has(name)) {
            violations.push({
              at,
              line,
              message: `${name} is referenced and defined nowhere, so this declaration is dropped.`,
              rule: 'unknown-primitive',
            })
          }
        }
      }

      if (line === '' || line.startsWith('--')) {
        // Token definitions themselves may hold raw values.
        continue
      }

      if (!ownsPrimitives && /var\(\s*--_helix-/.test(line)) {
        violations.push({
          at,
          line,
          message: 'References an internal primitive. Use a semantic --helix-* token.',
          rule: 'no-primitive-access',
        })
      }

      for (const [, name] of line.matchAll(/var\(\s*(--helix-[\w-]+)/g)) {
        if (!defined.has(name)) {
          violations.push({
            at,
            line,
            message: `${name} is not defined by @fusion.dev/helix-styles. Renamed or mistyped.`,
            rule: 'unknown-token',
          })
        }
      }

      for (const { category, property } of TOKENIZED) {
        if (!property.test(line)) {
          continue
        }
        const value = line
          .slice(line.indexOf(':') + 1)
          .replace(/;.*$/, '')
          .trim()
        if (value === '' || value.includes('var(--helix-') || ALLOWED_VALUES.has(value)) {
          continue
        }
        if (ownsPrimitives) {
          continue
        }

        const scalar = value.replace(CALC_FACTOR, '')
        const raw = RAW_COLOR.test(scalar) || RAW_LENGTH.test(scalar)
        if (raw) {
          violations.push({
            at,
            line,
            message: `Raw value where a --helix-${category}-* token belongs.`,
            rule: `no-raw-${category}`,
          })
        }
      }
    }
  }
}

/* The third rule, and the one the other two could not see: a token named after
 * a component, that no component reads.
 *
 * `check:css:tokens` has always asked that every token *referenced* exists, which
 * catches a rename. It cannot ask that every token *declared* is read, because
 * most of the ones that are not are scale rungs: `--helix-radii-lg` has no
 * reader today and is still part of a complete scale a consumer reaches into.
 * A check that fires on all seven of those is worse than no check.
 *
 * But a token whose last word is a component's name is not a rung. It is a
 * promise about that component, and when the component stops reading it the
 * promise is left standing: `--helix-layer-popover` sat at 1100 with no reader
 * at all, offering a consumer a number to sit between two of ours that had
 * stopped meaning anything the day `popover` moved to the top layer. That is
 * the fault, it is the whole of the fault, and it is mechanical.
 *
 * The reference doc lists every unread token for a human to look at, which is
 * the honest treatment of the rest.
 */
const FAMILIES = new Set(
  readdirSync(SOURCE.styled, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
)

const declared = [
  ...readFileSync('helix/styles/src/tokens.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/^\s*(--helix-[a-z0-9-]+):/gm),
].map(([, name]) => name)

const readAnywhere = new Set()
for (const root of ['fusion', 'helix']) {
  for (const path of walk(root)) {
    if (path.endsWith('tokens.css') || path.endsWith('primitives.css')) {
      continue
    }
    for (const [, name] of readFileSync(path, 'utf8').matchAll(/var\((--helix-[a-z0-9-]+)/g)) {
      readAnywhere.add(name)
    }
  }
}

for (const name of declared) {
  const leaf = name.split('-').at(-1) ?? ''
  if (FAMILIES.has(leaf) && !readAnywhere.has(name)) {
    violations.push({
      at: 'helix/styles/src/tokens.css',
      line: name,
      message:
        `Named after the \`${leaf}\` component and read by nothing. A token naming a ` +
        'component is a promise about it: either that component should read it, or it ' +
        'should go. A scale rung with no reader is fine and this is not one.',
      rule: 'no-dead-component-token',
    })
  }
}

if (violations.length === 0) {
  console.log(
    'tokens: no raw values, no primitive access, no dangling primitives, no dead component tokens',
  )
  process.exit(0)
}

console.error(`Token violations (${violations.length}):\n`)
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.at}`)
  console.error(`    ${v.line}`)
  console.error(`    ${v.message}\n`)
}
process.exit(1)
