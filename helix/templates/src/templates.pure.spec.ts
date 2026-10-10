import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findTemplate, HELIX_VERSION, PROJECT_NAME, templates } from './index.js'

/* The payloads are data rather than code, so nothing type-checks them and
   nothing imports them. This is what holds the register to the directories. */
const ROOT = join(import.meta.dirname, '..')

/** Where a template's files live, which is `templates/<id>`. */
const directoryOf = (id: string) => join(ROOT, 'templates', id)

const walk = (dir: string, base = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const here = base === '' ? entry.name : `${base}/${entry.name}`
    return entry.isDirectory() ? walk(join(dir, entry.name), here) : [here]
  })

describe('the register and the directories', () => {
  test('every registered template has a directory', () => {
    for (const one of templates) {
      expect(statSync(directoryOf(one.id)).isDirectory()).toBe(true)
    }
  })

  /* The other direction, which is the one that rots: a template added on disk
     and not registered ships in the package and is offered by nobody. */
  test('every directory is registered', () => {
    const onDisk = readdirSync(join(ROOT, 'templates'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    expect(onDisk.toSorted()).toEqual(templates.map((one) => one.id).toSorted())
  })

  test('ids are unique, since a caller passes one', () => {
    expect(new Set(templates.map((one) => one.id)).size).toBe(templates.length)
  })

  test('findTemplate answers for every id and refuses an unknown one', () => {
    for (const one of templates) {
      expect(findTemplate(one.id)).toBe(one)
    }
    expect(findTemplate('nothing-like-this')).toBeUndefined()
  })
})

describe('the project name placeholder', () => {
  /**
   * **Named files are asserted in both directions, and the second is the point.**
   *
   * A `named` list that misses a file is a scaffolded project with
   * `__PROJECT_NAME__` still in it, which a reader sees. A `named` list that
   * includes a file no longer carrying the placeholder is the quieter fault: a
   * scaffolder that rewrites by name notices nothing, and the entry stays until
   * somebody wonders what it was for.
   */
  for (const one of templates) {
    test(`${one.id} carries the placeholder in exactly the files it names`, () => {
      const carrying = walk(directoryOf(one.id)).filter((file) =>
        readFileSync(join(directoryOf(one.id), file), 'utf8').includes(PROJECT_NAME),
      )
      expect(carrying.toSorted()).toEqual([...one.named].toSorted())
    })
  }

  test('every template names its own manifest, which is what carries the name npm reads', () => {
    for (const one of templates) {
      expect(one.named).toContain('package.json')
    }
  })
})

describe('the version placeholder', () => {
  /* **Every `@fusion.dev` dependency asks for the placeholder**, so a template
     cannot pin a Helix again. Both did, at `^0.0.9` and `^0.4.1`, and nothing
     read them: this spec pointed at a layout the package had left, and no
     script ran it. */
  for (const one of templates) {
    test(`${one.id} asks for the Helix it was published with`, () => {
      const manifest = JSON.parse(readFileSync(join(directoryOf(one.id), 'package.json'), 'utf8'))
      const ranges = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
        .filter(([name]) => name.startsWith('@fusion.dev/'))
        .map(([, range]) => range)
      expect(ranges.length).toBeGreaterThan(0)
      for (const range of ranges) {
        expect(range).toBe(`^${HELIX_VERSION}`)
      }
    })

    /* Substitution happens only in named files, so one carrying the placeholder
       outside the list would reach a project with it still in. */
    test(`${one.id} carries it only in files it names`, () => {
      const carrying = walk(directoryOf(one.id)).filter((file) =>
        readFileSync(join(directoryOf(one.id), file), 'utf8').includes(HELIX_VERSION),
      )
      for (const file of carrying) {
        expect(one.named).toContain(file)
      }
    })
  }
})

describe('the commands a template tells you to run', () => {
  /* **`npx helix` in a project without `@fusion.dev/helix-cli` runs the
     registry's `helix`**, an unrelated package. Every template said to run it,
     and none installed the CLI. So a template names a script of its own, and a
     script that runs `helix` comes with the CLI in the manifest. */
  for (const one of templates) {
    test(`${one.id} names only scripts it has, and never \`npx helix\``, () => {
      const manifest = JSON.parse(readFileSync(join(directoryOf(one.id), 'package.json'), 'utf8'))
      for (const file of walk(directoryOf(one.id))) {
        const text = readFileSync(join(directoryOf(one.id), file), 'utf8')
        expect(text).not.toMatch(/npx helix\s/)
        for (const [, script] of text.matchAll(/npm run ([\w:-]+)/g)) {
          expect(Object.keys(manifest.scripts)).toContain(script as string)
        }
      }
    })

    test(`${one.id} installs the Helix CLI its scripts run`, () => {
      const manifest = JSON.parse(readFileSync(join(directoryOf(one.id), 'package.json'), 'utf8'))
      const commands = Object.values(manifest.scripts as Record<string, string>)
      if (commands.some((command) => /(^|&&\s*)helix\s/.test(command))) {
        expect(Object.keys(manifest.devDependencies)).toContain('@fusion.dev/helix-cli')
      }
    })
  }
})

describe('the ignore file', () => {
  /* **Carried as `gitignore`, because npm and bun leave a `.gitignore` out of a
     tarball**, and `helix new` writes it under its real name. Without one, the
     first `git add .` in a new project committed `node_modules`. */
  for (const one of templates) {
    test(`${one.id} carries a gitignore that leaves out what an install writes`, () => {
      const files = walk(directoryOf(one.id))
      expect(files).toContain('gitignore')
      expect(files.filter((file) => file.split('/').at(-1) === '.gitignore')).toEqual([])
      const ignored = readFileSync(join(directoryOf(one.id), 'gitignore'), 'utf8').split('\n')
      expect(ignored).toContain('node_modules')
    })
  }
})
