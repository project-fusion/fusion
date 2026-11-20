/**
 * A Bun plugin that opens a block in the browser harness for each spec file.
 *
 * **One family's page holds several spec files, and `bun test` runs each file
 * in a process of its own.** A hook declared at a file's top level covers that
 * file's tests under `bun test`. In the page it covered every test of the
 * family: on November 19, 2026 two top-level `beforeEach` hooks in the
 * headless Data Table specs ran before the styled Data Table specs too. The
 * call this puts at the top of each file is the harness's `enterFile`, which
 * starts a block that the file's top-level hooks and tests are declared in.
 *
 * On the file's first line, so every line number in a failure still points at
 * the line in the source. Imports are hoisted, so the call runs after the
 * file's imports and before anything the file declares.
 *
 * `harness` is the browser harness's path, as the bundle resolves `bun:test`.
 */
export const specFileBlocks = (harness) => ({
  name: 'spec-file-blocks',
  setup(build) {
    build.onLoad({ filter: /\.dom\.spec\.ts$/ }, async ({ path }) => ({
      contents: `import { enterFile as __enterFile } from ${JSON.stringify(harness)};__enterFile();${await Bun.file(path).text()}`,
      loader: 'ts',
    }))
  },
})
