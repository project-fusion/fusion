#!/usr/bin/env node
/**
 * Scores a responder against the agent evaluation corpus.
 *
 * **This is the gate [#205](../../docs/19-queue.md) put in front of shipping
 * anything agent-facing**, and the useful thing to understand about it is which
 * half runs in CI and why.
 *
 * A model answers the same question differently on two runs, so a score from one
 * cannot be a build assertion. What *can* be asserted is the corpus: that every
 * question in it is answerable from a current artifact, and that a responder
 * which reads those artifacts directly gets every one right. A question the
 * reference cannot answer is a badly formed question, not a hard one, and it
 * would otherwise sit in the corpus penalising every real agent that met it.
 *
 * So `check:eval` runs the reference and demands 100%. That is not circular and
 * it is not a claim about any agent: it is the corpus checking itself, the same
 * way `check:reference` holds a generated file to its generator. **What it
 * catches is staleness.** A family rename invalidates forty questions at once,
 * silently, and the reference is what notices.
 *
 * **The score that matters comes from a model and is deliberately not here.**
 * That run needs a key, a network and a budget, none of which belong in
 * `verify`, and its result is a number recorded next to a floor rather than a
 * pass or a fail. The responder interface below is the seam for it: one function
 * from a question to a string.
 *
 * Run with `bun run eval`, or `bun run check:eval` for the CI half.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const corpus = JSON.parse(readFileSync(join(ROOT, 'tooling', 'eval', 'questions.json'), 'utf8'))

/**
 * The reference responder: the artifacts, read directly.
 *
 * **It is allowed to be perfect and that is its whole job.** It is not a
 * baseline an agent is compared against, which would be meaningless since it has
 * the answer key: it is the proof that the key is derivable, which is what makes
 * a wrong answer from anything else a fact about the answerer.
 */
const reference = () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, 'helix', 'web', 'custom-elements.json'), 'utf8'),
  )
  const tokens = new Set(
    JSON.parse(readFileSync(join(ROOT, 'helix', 'styles', 'tokens.json'), 'utf8')).tokens.map(
      (token) => token.name,
    ),
  )
  const byAlias = new Map()
  const byDescription = new Map()
  const parts = new Map()
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName || !declaration.helix) {
        continue
      }
      /* `.at(-3)`, for the reason `build-eval.mjs` records: the second-from-last
         segment of a module path is the part, not the family. */
      const family = declaration.modulePath?.split('/').at(-3) ?? declaration.tagName
      for (const alias of declaration.helix.aliases ?? []) {
        byAlias.set(alias.toLowerCase(), family)
      }
      for (const example of declaration.helix.examples ?? []) {
        if (example.description) {
          byDescription.set(example.description.trim().toLowerCase(), `${family}/${example.slug}`)
        }
      }
      parts.set(declaration.tagName, new Set((declaration.cssParts ?? []).map((part) => part.name)))
    }
  }

  /**
   * The quoted things in a prompt, in order.
   *
   * **A list rather than the first one, and the first version took the first.**
   * A part question names the tag before the part, ``Does `helix-toggle` publish
   * a CSS part named `item`?``, so the reference was asking whether `helix-toggle`
   * has a part called `helix-toggle` and answering no to all 471 of them. Every
   * "no" question passed, which is what made the score 20% rather than 0% and is
   * the shape of a grader bug that looks like a hard category.
   *
   * That is the harness catching its own corpus on the first run, which is the
   * whole reason `--check` demands a perfect reference: a malformed question in a
   * shipped corpus penalises every real agent that meets it, forever, and reads
   * as the agent's fault.
   */
  const quoted = (prompt) =>
    [...prompt.matchAll(/"([^"]+)"|`([^`]+)`/g)].map((match) => match[1] ?? match[2])

  return (question) => {
    const said = quoted(question.prompt)
    /* The subject is the last quoted thing in every kind, because a prompt that
       names two things names the thing it is asking about second: a tag, then the
       part on it. Written as `.at(-1)` rather than an index per kind, so a fifth
       question kind cannot be added with the wrong one silently. */
    const subject = said.at(-1) ?? ''
    switch (question.kind) {
      case 'alias':
        return byAlias.get(subject.toLowerCase()) ?? ''
      case 'example':
        return byDescription.get(subject.toLowerCase()) ?? ''
      case 'part':
        return parts.get(question.tag)?.has(subject) ? 'yes' : 'no'
      case 'token':
        return tokens.has(subject) ? 'yes' : 'no'
      default:
        return ''
    }
  }
}

/**
 * Whether an answer is right.
 *
 * **Trimmed and lowercased, and nothing else.** A grader that accepted "the
 * toggle family" for `toggle` would be a second thing to keep true, and every
 * loosening is a place a wrong answer can hide. A responder that cannot emit a
 * bare token is a responder with a formatting problem, which is worth failing on
 * while it is cheap to fix.
 */
const correct = (question, given) =>
  String(given ?? '')
    .trim()
    .toLowerCase() === String(question.answer).trim().toLowerCase()

const respond = reference()
const scores = new Map()
const wrong = []

for (const question of corpus.questions) {
  const given = respond(question)
  const kind = scores.get(question.kind) ?? { asked: 0, right: 0 }
  kind.asked += 1
  if (correct(question, given)) {
    kind.right += 1
  } else {
    wrong.push({ answer: question.answer, given, id: question.id, prompt: question.prompt })
  }
  scores.set(question.kind, kind)
}

const asked = corpus.questions.length
const right = asked - wrong.length
const percent = asked === 0 ? 0 : (right / asked) * 100

for (const [kind, score] of [...scores].sort()) {
  const share = ((score.right / score.asked) * 100).toFixed(1)
  console.log(`  ${kind.padEnd(8)} ${String(score.right).padStart(5)} / ${score.asked}  ${share}%`)
}

if (process.argv.includes('--check')) {
  if (wrong.length > 0) {
    console.error(
      `\nThe reference could not answer ${wrong.length} of ${asked} questions, which means the corpus is stale or ambiguous rather than that the questions are hard:\n`,
    )
    for (const miss of wrong.slice(0, 10)) {
      console.error(
        `  ${miss.id}: ${miss.prompt}\n    wanted "${miss.answer}", got "${miss.given}"`,
      )
    }
    if (wrong.length > 10) {
      console.error(`  ...and ${wrong.length - 10} more.`)
    }
    console.error('\nRun `bun run eval:build` if an artifact moved under it.')
    process.exit(1)
  }
  console.log(
    `\neval: ${asked} questions across ${scores.size} kinds, every one answerable from a current artifact`,
  )
} else {
  console.log(`\n  ${right} / ${asked}  ${percent.toFixed(1)}%`)
  /* **A floor, stated before anything ships rather than after a bad answer.**
     Picked from what the corpus is: the token and part questions are yes/no, so
     coin-flipping them scores 50, and the alias and example questions have 88
     and 515 possible answers respectively, so guessing them scores nothing. A
     responder that has read the documentation should clear 90 overall; one under
     70 is not using it, and one under 55 is answering the yes/no half at chance
     and getting the retrieval half wrong.

     The number is a judgment and it is written here so it is a judgment made in
     advance. It applies to a model responder, which is not built: the reference
     scores 100 by construction and proving otherwise is what `--check` is for. */
  console.log('  floor for a model responder: 90% overall, and never under 70%')
}
