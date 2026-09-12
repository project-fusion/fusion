import { describe, expect, test } from 'bun:test'
import { type DiffLine, pairLines, parsePatch } from './patch.js'

/* What a unified diff says, read back as the lines a reader sees. Every patch
   here is the shape a real tool writes: `git diff`, `diff -u`, a code host's
   `patch` field. */

const GIT = `diff --git a/src/config.ts b/src/config.ts
index 3b18e51..a9c2f04 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,4 +10,5 @@ export const config = {
   retries: 3,
-  timeout: 1000,
+  timeout: 5000,
+  backoff: 'exponential',
   region: 'us-east-1',
 }
`

describe('reading a patch', () => {
  test('names the file from its header, without the prefix git writes', () => {
    expect(parsePatch(GIT).map((file) => file.name)).toEqual(['src/config.ts'])
  })

  test('numbers each line from the hunk header, so the numbers are the file’s', () => {
    const [hunk] = parsePatch(GIT)[0]?.hunks ?? []
    expect(hunk?.header).toBe('@@ -10,4 +10,5 @@ export const config = {')
    expect(hunk?.lines.map(({ kind, new: now, old }) => [kind, old, now])).toEqual([
      ['context', 10, 10],
      ['removed', 11, undefined],
      ['added', undefined, 11],
      ['added', undefined, 12],
      ['context', 12, 13],
      ['context', 13, 14],
    ])
  })

  test('keeps the text after the mark, indentation included', () => {
    const [hunk] = parsePatch(GIT)[0]?.hunks ?? []
    expect(hunk?.lines[1]?.text).toBe('  timeout: 1000,')
  })

  test('reads a hunk to its counts, so a removed `-- ` line is not a file header', () => {
    const patch = `--- a/notes.sql\n+++ b/notes.sql\n@@ -1,2 +1,1 @@\n--- a comment\n select 1;\n`
    const [file] = parsePatch(patch)
    expect(file?.hunks[0]?.lines.map((line) => [line.kind, line.text])).toEqual([
      ['removed', '-- a comment'],
      ['context', 'select 1;'],
    ])
  })

  test('takes a blank line inside the counts as context whose space was stripped', () => {
    const patch = `--- a/a.txt\n+++ b/a.txt\n@@ -1,3 +1,3 @@\n one\n\n-two\n+three\n`
    const lines = parsePatch(patch)[0]?.hunks[0]?.lines ?? []
    expect(lines.map((line) => line.kind)).toEqual(['context', 'context', 'removed', 'added'])
  })

  test('drops the no-newline note rather than showing it as a line', () => {
    const patch = `--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file\n`
    const lines = parsePatch(patch)[0]?.hunks[0]?.lines ?? []
    expect(lines.map((line) => line.text)).toEqual(['old', 'new'])
  })

  test('names a deleted file from the side that still has a path', () => {
    const patch = `--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-export {}\n`
    expect(parsePatch(patch)[0]?.name).toBe('gone.ts')
  })

  test('reads each file of a patch that holds several', () => {
    const second = GIT.replaceAll('src/config.ts', 'src/other.ts')
    expect(parsePatch(`${GIT}${second}`).map((file) => file.name)).toEqual([
      'src/config.ts',
      'src/other.ts',
    ])
  })

  test('takes a bare hunk with no file headers as one nameless file', () => {
    const files = parsePatch(`@@ -1 +1 @@\n-a\n+b\n`)
    expect(files.map((file) => [file.name, file.hunks.length])).toEqual([['', 1]])
  })
})

describe('pairing lines side by side', () => {
  const line = (kind: DiffLine['kind'], text: string): DiffLine => ({ kind, text })

  test('sets a changed line opposite the line it replaced', () => {
    const rows = pairLines([
      line('context', 'a'),
      line('removed', 'b'),
      line('added', 'B'),
      line('context', 'c'),
    ])
    expect(rows.map(({ left, right }) => [left?.text, right?.text])).toEqual([
      ['a', 'a'],
      ['b', 'B'],
      ['c', 'c'],
    ])
  })

  test('stands the longer run’s remainder opposite nothing', () => {
    const rows = pairLines([line('removed', 'x'), line('added', 'y'), line('added', 'z')])
    expect(rows.map(({ left, right }) => [left?.text, right?.text])).toEqual([
      ['x', 'y'],
      [undefined, 'z'],
    ])
  })
})
