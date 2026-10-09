#!/usr/bin/env node
/**
 * Grades pages built with Helix against the agent task suite.
 *
 * **Each task is a page an agent is asked to build**, in
 * `fusion/scripts/eval/tasks.json`: a prompt and the tags the page must
 * write. A page passes when it writes every one of them and `helix scan`
 * finds nothing at `error` or `warn` in it, which is every unknown tag,
 * attribute, value, slot, part, hook, event prop, and token, every primitive
 * read, every `[disabled]` on a form control, and every tag whose entry
 * nothing imports.
 *
 * **Which half runs in CI is `run-eval.mjs`'s answer.** A model builds a
 * different page on each run, so its score is a number recorded next to a
 * floor, never a pass or a fail, and it needs a key, a network and a budget
 * that do not belong in `verify`. What CI can hold is the suite: each task has
 * a reference page under `eval/tasks/<id>`, and `--check` demands that every
 * one passes. A reference that fails is a stale task, or a scan that reports
 * a correct page, and both are faults in this repository.
 *
 * **A native element Helix has a family for fails a page**, since `helix
 * scan` reports it as `native-element` at `warn`. Beside the verdict, each
 * grade carries `coverage`: of the elements Helix could have written, the
 * share it did. Two pages that both pass can still differ there, which is
 * what tells two ways of prompting an agent apart.
 *
 * `--answers <dir>` grades an agent's pages, one folder per task id, and
 * prints the pass rate. `--json` prints the grades as data.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

const suite = JSON.parse(
  readFileSync(join(root, 'fusion', 'scripts', 'eval', 'tasks.json'), 'utf8'),
)
const args = process.argv.slice(2)
const at = args.indexOf('--answers')
const answers = at === -1 ? join(root, 'fusion', 'scripts', 'eval', 'tasks') : resolve(args[at + 1])
const check = at === -1
const json = args.includes('--json')

/** The `helix` command line, through its npm shim, as any caller reaches it. */
const helix = join(root, 'helix', 'cli', 'npm', 'bin.mjs')

/** One task's grade: whether it passed, and each reason it did not. */
const grade = (task) => {
  const dir = join(answers, task.id)
  if (!existsSync(dir)) {
    return { id: task.id, passed: false, reasons: ['no page was built'] }
  }
  const scanned = spawnSync(process.execPath, [helix, '--json', 'scan', dir], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })
  if (scanned.status !== 0 && scanned.status !== 1) {
    return {
      id: task.id,
      passed: false,
      reasons: [`helix scan exited ${scanned.status}: ${scanned.stderr.trim()}`],
    }
  }
  const run = JSON.parse(scanned.stdout)
  /* Each native-element finding stands for every element it groups, which
     its message counts when there is more than one. */
  const native = run.findings
    .filter((finding) => finding.kind === 'native-element')
    .reduce(
      (sum, finding) => sum + Number(/On (\d+) elements\./.exec(finding.message)?.[1] ?? 1),
      0,
    )
  const written = Object.values(run.usage.tags).reduce(
    (sum, one) => sum + (typeof one === 'number' ? one : (one?.count ?? 1)),
    0,
  )
  const coverage = written + native === 0 ? 1 : written / (written + native)
  const reasons = [
    ...run.findings
      .filter((finding) => finding.severity === 'error' || finding.severity === 'warn')
      .map(
        (finding) =>
          `${finding.kind} in ${finding.origin.sheet}:${finding.origin.line}: ${finding.message}`,
      ),
    ...task.requires.filter((tag) => !(tag in run.usage.tags)).map((tag) => `writes no <${tag}>`),
  ]
  return { coverage, id: task.id, passed: reasons.length === 0, reasons }
}

const grades = suite.tasks.map(grade)
const passed = grades.filter((one) => one.passed).length

if (json) {
  console.log(JSON.stringify({ grades, passed, total: grades.length }))
} else {
  for (const one of grades) {
    console.log(
      `${one.passed ? 'pass' : 'FAIL'}  ${one.id}${one.coverage === undefined ? '' : `  ${Math.round(one.coverage * 100)}% Helix`}`,
    )
    for (const reason of one.reasons) {
      console.log(`      ${reason}`)
    }
  }
  console.log(`\n${passed} of ${grades.length} tasks pass`)
}

if (check && passed !== grades.length) {
  console.error('\nA reference page failed. Fix the page, the task, or the scan that reported it.')
  process.exit(1)
}
