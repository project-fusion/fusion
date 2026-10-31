import { describe, expect, test } from 'bun:test'
import { changedWords, type DiffLine, foldContext, pairLines, parsePatch } from './patch.js'

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

  test('reads a patch a formatter indented, every line by the same amount', () => {
    const indented = GIT.split('\n')
      .map((line) => (line === '' ? line : `    ${line}`))
      .join('\n')
    expect(parsePatch(indented)[0]?.hunks[0]?.lines.map((line) => line.kind)).toEqual(
      parsePatch(GIT)[0]?.hunks[0]?.lines.map((line) => line.kind),
    )
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

/* A changed line was one wash from end to end, so `timeout: 1000` replaced by
   `timeout: 5000` left the reader to find the one number that moved. */
describe('the words a changed line changed', () => {
  const marked = (pieces: { changed: boolean; text: string }[] | undefined): string[] =>
    (pieces ?? []).filter((piece) => piece.changed).map((piece) => piece.text)

  test('are the ones the line opposite does not have', () => {
    const [before, after] = changedWords('  timeout: 1000,', '  timeout: 5000,') ?? []
    expect(marked(before)).toEqual(['1000'])
    expect(marked(after)).toEqual(['5000'])
    expect(before?.map((piece) => piece.text).join('')).toBe('  timeout: 1000,')
  })

  test('take the space between two changed words with them, as one run', () => {
    const [before, after] = changedWords('let a b = 1', 'let c d = 1') ?? []
    expect(marked(before)).toEqual(['a b'])
    expect(marked(after)).toEqual(['c d'])
  })

  test('are nothing where the two lines share no word, which the line already says', () => {
    expect(changedWords('alpha', 'beta')).toBeUndefined()
  })

  test('are read for each removed line and the added line paired with it', () => {
    const lines = parsePatch(GIT)[0]?.hunks[0]?.lines ?? []
    const removed = lines.find((line) => line.kind === 'removed')
    const [replacing, extra] = lines.filter((line) => line.kind === 'added')
    expect(marked(removed?.pieces)).toEqual(['1000'])
    expect(marked(replacing?.pieces)).toEqual(['5000'])
    expect(extra?.pieces).toBeUndefined()
    expect(lines.find((line) => line.kind === 'context')?.pieces).toBeUndefined()
  })
})

/* A diff written with more context than a reader needs, `git diff -U20` say,
   drew every unchanged line, so the changes sat far apart in a long block. */
describe('folding unchanged lines', () => {
  const lines = (marks: string): DiffLine[] =>
    [...marks].map((mark, at) => ({
      kind: mark === '+' ? 'added' : mark === '-' ? 'removed' : 'context',
      text: String(at),
    }))
  const shape = (marks: string, keep: number): string[] =>
    foldContext(lines(marks), keep).map(
      (run) => `${run.folded ? 'fold' : 'show'} ${run.start}+${run.lines.length}`,
    )

  test('keeps that many unchanged lines beside each change, and folds the rest', () => {
    expect(shape('      -+      ', 2)).toEqual(['fold 0+4', 'show 4+6', 'fold 10+4'])
    expect(shape('-        +', 1)).toEqual(['show 0+2', 'fold 2+6', 'show 8+2'])
  })

  test('folds nothing shorter than two lines, which a control would not shorten', () => {
    expect(shape('-    +', 2)).toEqual(['show 0+6'])
    expect(shape('-     +', 2)).toEqual(['show 0+7'])
    expect(shape('-      +', 2)).toEqual(['show 0+3', 'fold 3+2', 'show 5+3'])
  })
})
