#!/usr/bin/env node
/**
 * Fills the Rust samples in the Cortex documentation from the crates themselves.
 *
 * **A fenced `rust` block typed into MDX is compiled by nothing.** A rename in
 * `cortex/trace` leaves the page documenting it describing the old signature,
 * and every check in the repository passes. Worse than a stale signature, a page
 * makes behavioral claims (`trace.len() == 4`, `removed.len() == 3`) that no
 * signature check could ever hold: those are assertions about what the code
 * does, and only running it settles them.
 *
 * So the samples live in `///` doc comments, where `cargo test` runs them, and
 * this script interpolates them back into the pages. The compiler owns whether a
 * sample is correct; the page owns the prose around it.
 *
 * **The key in a marker is the name rustdoc prints.** `Graph::why` in the
 * marker is `Graph::why` in `cargo test --doc` output, so a reader who sees a
 * sample fail knows which region of which page it belongs to without a lookup
 * table in between.
 *
 * The marker mechanism is `build-docs.mjs`'s, deliberately: a link reference
 * definition that nothing links to is markdown's own comment, it renders as
 * nothing on both surfaces, and the region it delimits is complete markdown
 * rather than a component with a hole where the code was.
 *
 * Hidden `#` lines are stripped, which is what rustdoc does when it renders
 * them. A sample needs setup to compile and a reader needs the four lines that
 * carry the idea; `#` is how Rust already says which is which, and honoring it
 * is what lets a sample be both.
 *
 * Run with `bun run gen:samples`, or `bun run check:gen:samples` for the check.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT = join(ROOT, 'cortex/docs/content')

/**
 * The crates whose doc comments the pages may draw on, by package name.
 *
 * Listed rather than discovered from the workspace because a page citing a
 * crate that does not publish would be documenting something a reader cannot
 * install. Adding a crate here is the deliberate act of saying its examples are
 * for readers.
 */
const CRATES = {
  'fusion-cortex-core': 'cortex/core/src',
  'fusion-cortex-engram': 'cortex/engram/src',
  'fusion-cortex-trace': 'cortex/trace/src',
}

const OPEN = /^\[\/\/\]: # \(rust:([a-z-]+(?:::[A-Za-z_][A-Za-z0-9_]*)*)\)$/
const CLOSE = '[//]: # (/rust)'

const check = process.argv.includes('--check')
const problems = []
const fail = (where, message) => problems.push(`${where}: ${message}`)

/**
 * Every doc example in one Rust file, keyed the way rustdoc names it.
 *
 * The association is positional, which is what rustdoc's own is: a `///` block
 * documents whatever declaration follows it, and a `//!` block documents the
 * module it opens. Nothing here parses Rust beyond finding the name on the next
 * declaration line, because nothing here needs to: an example attached to
 * something this misreads would be named wrongly in the marker and fail to
 * resolve, rather than silently attach to the wrong item.
 */
const examples = (crate, module, source) => {
  const found = new Map()
  const lines = source.split('\n')
  /** The most recent `impl` block, so a method is keyed `Type::method`. */
  let host

  for (let index = 0; index < lines.length; index += 1) {
    const impl = /^impl(?:<[^>]*>)? ([A-Za-z_][A-Za-z0-9_]*)/.exec(lines[index])
    if (impl) {
      host = impl[1]
      continue
    }
    const fence = /^\s*\/\/[/!] ```\s*$/.exec(lines[index])
    if (!fence) {
      continue
    }
    const inner = lines[index].includes('//!')
    const body = []
    let cursor = index + 1
    for (; cursor < lines.length; cursor += 1) {
      if (/^\s*\/\/[/!] ```\s*$/.test(lines[cursor])) {
        break
      }
      const stripped = /^\s*\/\/[/!](?: (.*))?$/.exec(lines[cursor])
      if (!stripped) {
        fail(`${crate}/${module}`, `a doc example is never closed (line ${index + 1})`)
        break
      }
      body.push(stripped[1] ?? '')
    }

    /* A `//!` example documents the module it sits in; `///` documents the next
       declaration. The module path is the file, less `lib` which is the crate. */
    const path = module === 'lib' ? [] : [module]
    let key
    if (inner) {
      key = [crate, ...path].join('::')
    } else {
      let after = cursor + 1
      while (after < lines.length && /^\s*(\/\/|#\[|#!)/.test(lines[after])) {
        after += 1
      }
      const name =
        /^\s*(?:pub(?:\([^)]*\))? )?(?:async )?(?:unsafe )?(?:extern "[^"]*" )?(?:fn|struct|enum|trait|type|const|static|mod) ([A-Za-z_][A-Za-z0-9_]*)/.exec(
          lines[after] ?? '',
        )
      if (!name) {
        fail(`${crate}/${module}`, `a doc example at line ${index + 1} documents nothing nameable`)
        index = cursor
        continue
      }
      /* Indented means inside an `impl`, so the name is qualified by its type.
         A free item at column zero is not, even when an `impl` came earlier. */
      const nested = /^\s+/.test(lines[after]) && host
      key = [crate, ...path, nested ? `${host}::${name[1]}` : name[1]].join('::')
    }

    if (found.has(key)) {
      fail(`${crate}/${module}`, `${key} carries two doc examples, so a marker cannot name one`)
    }
    /* Hidden lines are setup, not documentation. Rustdoc's rule exactly: `# `
       and a bare `#` are hidden, `##` is an escaped `#`, and anything else
       starting with a hash is an attribute a reader needs to see. */
    found.set(
      key,
      body
        .filter((line) => !(line === '#' || (line.startsWith('# ') && !line.startsWith('##'))))
        .map((line) => line.replace(/^##/, '#'))
        .join('\n')
        .trim(),
    )
    index = cursor
  }
  return found
}

const samples = new Map()
for (const [crate, directory] of Object.entries(CRATES)) {
  for (const file of readdirSync(join(ROOT, directory)).sort()) {
    if (!file.endsWith('.rs')) {
      continue
    }
    const source = readFileSync(join(ROOT, directory, file), 'utf8')
    for (const [key, body] of examples(crate, file.replace(/\.rs$/, ''), source)) {
      samples.set(key, body)
    }
  }
}

/**
 * A page with its sample regions filled.
 *
 * The markers stay. They are how the next run knows where to write, and how
 * whoever edits the page knows the block below is not theirs to change.
 */
const filled = (slug, source) => {
  const out = []
  let inside = false
  for (const line of source.split('\n')) {
    const open = OPEN.exec(line)
    if (open) {
      if (inside) {
        fail(slug, `a \`rust:\` region opens inside another (${open[1]})`)
        return source
      }
      const body = samples.get(open[1])
      if (body === undefined) {
        fail(slug, `no crate documents \`${open[1]}\`, so the region cannot be filled`)
        return source
      }
      out.push(line, '', '```rust', body, '```', '')
      inside = true
      continue
    }
    if (line === CLOSE) {
      if (!inside) {
        fail(slug, 'a `/rust` closes a region that never opened')
        return source
      }
      out.push(line)
      inside = false
      continue
    }
    if (!inside) {
      out.push(line)
    }
  }
  if (inside) {
    fail(slug, `a \`rust:\` region is never closed by \`${CLOSE}\``)
    return source
  }
  return out.join('\n')
}

const slugs = readdirSync(CONTENT)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort()

const stale = []
const cited = new Set()
for (const slug of slugs) {
  const onDisk = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')
  for (const line of onDisk.split('\n')) {
    const open = OPEN.exec(line)
    if (open) {
      cited.add(open[1])
    }
  }

  const next = filled(slug, onDisk)
  if (next !== onDisk) {
    stale.push(slug)
    if (!check) {
      writeFileSync(join(CONTENT, `${slug}.mdx`), next)
    }
  }

  /* The point of the exercise is that no sample escapes the compiler, so a
     fenced `rust` block outside a region is the failure this script exists to
     prevent rather than a style preference. */
  let inside = false
  for (const [number, line] of next.split('\n').entries()) {
    if (OPEN.test(line)) {
      inside = true
    } else if (line === CLOSE) {
      inside = false
    } else if (!inside && /^```rust\b/.test(line)) {
      fail(
        slug,
        `line ${number + 1} opens a \`rust\` block outside a region, so nothing compiles it. Move it to a \`///\` doc comment and cite it with a marker`,
      )
    }
  }
}

/* An example written for a page and never cited is documentation nobody reads,
   and one cited by two pages is the duplication this replaced. Neither is
   fatal: a doc example is worth having for its own sake, and the crates carry
   examples that belong to `cargo doc` rather than to the site. Reported so the
   drift is visible. */
const uncited = [...samples.keys()].filter((key) => !cited.has(key))

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`samples: ${problem}`)
  }
  process.exit(1)
}

if (check) {
  if (stale.length > 0) {
    console.error(
      `samples: a Rust sample is stale in ${stale.join(', ')}. Run \`bun run gen:samples\``,
    )
    process.exit(1)
  }
  console.log(
    `samples: ${cited.size} regions across ${slugs.length} pages, every one compiled by \`cargo test --doc\`${
      uncited.length > 0 ? ` (${uncited.length} doc examples cited by no page)` : ''
    }`,
  )
} else {
  console.log(
    stale.length > 0
      ? `samples: refilled ${stale.join(', ')}`
      : `samples: ${cited.size} regions already current`,
  )
}
