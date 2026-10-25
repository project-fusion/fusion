#!/usr/bin/env node
/**
 * Has coding agents build each page of the task suite, with any harness and
 * any model, and grades what they wrote.
 *
 * **The score a model gets is the half `run-tasks.mjs` leaves out**, and this
 * is that half: each task's prompt goes to a harness, headless, in a project
 * that installed Helix the way a consumer does, and the page it writes is
 * graded by `run-tasks.mjs --answers`, the grader the reference pages pass.
 *
 * **A run is a harness, a model, an arm and a task.** `--pairs` names each
 * harness with the model it drives, in that harness's own id for the model,
 * since `claude-sonnet-5-5` to Claude Code is `anthropic/claude-sonnet-5-5`
 * to OpenCode. `lib/harnesses.mjs` holds what each harness takes and prints,
 * so this file never branches on a name. A harness added there, ours or
 * anyone's, runs in the same table as the rest.
 *
 * **Five arms, because one number says nothing.** `docs` has the installed
 * packages and nothing else, so the agent reads what `node_modules` holds.
 * `web` adds the site's own docs, fetched from fusion.dev, where the prompt
 * says they are: the fair alternative to a skill, which an agent with the
 * address would read the same way.
 * `skill` adds the guide Helix ships as a skill, linked where the guide says.
 * `mcp` adds `helix mcp` as well. `plugin` installs the Claude Code plugin in
 * `helix/plugin` in their place, the one step a user takes. A harness runs
 * the arms it can give its agent, and the rest are skipped and said so.
 *
 * **Each agent sees its own folder and the installed packages, and nothing
 * else**: no shell, no web, no settings but the project's, and every other
 * folder outside its reach, so no run reads another's page or this
 * repository's source. The packages are packed from this tree and installed
 * once, outside the repository, where no workspace links them back.
 *
 * **Graded twice: the code, and the page running.** `run-tasks.mjs` reads
 * what the agent wrote. Each page is then bundled, served on a local port,
 * and opened headless by `helix diagnostics --once`, which reports what only
 * a running page shows: an event listened for on an element that never
 * hears it, a part that never rendered, what the library logged. A page that
 * does not build fails, as it would for a user. `--no-runtime` skips this.
 *
 * **It resumes.** Each run's result and page are saved to `--out` as it
 * finishes, so a usage limit or an expired sign-in part way through costs
 * nothing done: the same command again runs only what is missing, and grades
 * everything.
 *
 * **A model answers differently on every run**, so this records a result and
 * fails nothing. It needs each harness installed and signed in, and spends
 * what each run costs, capped per run by `--budget` where the harness takes a
 * cap and by `--timeout`, in minutes, everywhere. `--dry-run` prints each
 * command and spends nothing, and `--keep` keeps the scratch project.
 *
 *   bun fusion/scripts/run-agents.mjs --tasks select,tabs --arms docs,skill,mcp
 *   bun fusion/scripts/run-agents.mjs --pairs claude=sonnet,claude=opus --arms docs
 *   bun fusion/scripts/run-agents.mjs --pairs claude=sonnet --budget 1 --out .local/agents/pilot
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { argument, flag } from '@fusion.dev/scripts/argv'
import { HARNESSES } from '@fusion.dev/scripts/harnesses'
import { manifests, root } from '@fusion.dev/scripts/workspace'

/** The packages a page built with Helix installs, the command line the
    plugin's MCP server runs through `npx`, and the templates that command
    depends on. Each one is packed from this tree, so a sibling missing here is
    asked of the registry instead. */
const PACKAGES = [
  '@fusion.dev/helix',
  '@fusion.dev/helix-cli',
  '@fusion.dev/helix-core',
  '@fusion.dev/helix-diagnostics',
  '@fusion.dev/helix-headless',
  '@fusion.dev/helix-icons',
  '@fusion.dev/helix-styles',
  '@fusion.dev/helix-templates',
]

const ARMS = ['docs', 'web', 'skill', 'mcp', 'plugin']

const suite = JSON.parse(readFileSync(join(root, 'fusion/scripts/eval/tasks.json'), 'utf8'))
const asked = argument('tasks')?.split(',')
const tasks = suite.tasks.filter((task) => asked === undefined || asked.includes(task.id))
const arms = (argument('arms') ?? ARMS.join(',')).split(',')
const budget = argument('budget') ?? '1'
const timeout = Number(argument('timeout') ?? '20') * 60 * 1000
const dry = flag('dry-run')
const out = resolve(
  argument('out') ?? join(root, '.local/agents', new Date().toISOString().slice(0, 16)),
)
const runtime = !flag('no-runtime')
const keep = flag('keep')

/** Each harness with the model it drives. `--model` alone keeps the old
    meaning: Claude Code on that model. */
const pairs = (argument('pairs') ?? `claude=${argument('model') ?? 'sonnet'}`)
  .split(',')
  .map((pair) => {
    const at = pair.indexOf('=')
    return { harness: pair.slice(0, at), model: pair.slice(at + 1) }
  })

for (const arm of arms) {
  if (!ARMS.includes(arm)) {
    console.error(`run-agents: no arm called \`${arm}\`. The arms are ${ARMS.join(', ')}.`)
    process.exit(2)
  }
}
for (const { harness, model } of pairs) {
  if (!(harness in HARNESSES) || model === '') {
    console.error(
      `run-agents: \`${harness}=${model}\` names no harness and model. The harnesses are ${Object.keys(HARNESSES).join(', ')}, and each pair is written \`harness=model\`.`,
    )
    process.exit(2)
  }
}
/* Every harness asked for is installed, or the set stops before anything is
   spent, naming how to install what is missing. */
const missing = [...new Set(pairs.map((pair) => pair.harness))].filter(
  (name) => spawnSync('which', [HARNESSES[name].binary]).status !== 0,
)
if (missing.length > 0 && !dry) {
  for (const name of missing) {
    console.error(
      `run-agents: \`${HARNESSES[name].binary}\` is not installed: ${HARNESSES[name].install}`,
    )
  }
  process.exit(69)
}

/** `helix`, built from this tree, which grades every page and serves the MCP arm.
    The newer of the release and debug builds, the rule `helix/cli/npm/bin.mjs`
    follows, since a release build left behind would otherwise shadow every
    debug build after it. */
const helix = [join(root, 'target/release/helix'), join(root, 'target/debug/helix')]
  .filter((one) => existsSync(one))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
if (helix === undefined && !dry) {
  console.error('run-agents: build the binary first, `cargo build -p fusion-helix-cli`.')
  process.exit(69)
}

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/** A model id as a folder name: `ollama/qwen3:30b` is `ollama_qwen3_30b`. */
const slug = (model) => model.replace(/[^\w.-]+/g, '_')

/* The consumer's project, packed from this tree and installed once. A dry run
   names the folders and packs nothing. */
const scratch = mkdtempSync(join(tmpdir(), 'helix-agents-'))
const project = join(scratch, 'project')
const modules = join(project, 'node_modules')
mkdirSync(project)
if (!dry) {
  const tarballs = join(scratch, 'tarballs')
  mkdirSync(tarballs)
  const dependencies = {}
  const found = manifests()
  const directories = new Map([...found].map(([name, { directory }]) => [name, directory]))
  /* A package packs whatever its folder holds, so one never built packs
     without its code and catalogs, and every arm would measure an empty
     install. */
  const unbuilt = PACKAGES.flatMap((name) =>
    (found.get(name)?.manifest.files ?? [])
      .filter((file) => !existsSync(join(root, directories.get(name), file)))
      .map((file) => `${name}/${file}`),
  )
  if (unbuilt.length > 0) {
    console.error(
      `run-agents: build the packages first, \`bun run build\`. Missing: ${unbuilt.join(', ')}.`,
    )
    process.exit(69)
  }
  for (const name of PACKAGES) {
    const into = join(tarballs, name.replace('@', '').replace('/', '-'))
    mkdirSync(into)
    run('bun', ['pm', 'pack', '--destination', into], join(root, directories.get(name)))
    dependencies[name] = `file:${join(into, readdirSync(into)[0])}`
  }
  /* From the registry: React, for the tasks that ask for it, and Playwright at
     this repository's version, which the runtime check opens each page with in
     the browser this machine already has for it. */
  const playwright = JSON.parse(
    readFileSync(join(root, 'node_modules/playwright/package.json'), 'utf8'),
  ).version
  writeFileSync(
    join(project, 'package.json'),
    `${JSON.stringify({ dependencies: { ...dependencies, playwright, react: '^19.0.0', 'react-dom': '^19.0.0' }, name: 'agents', overrides: dependencies, private: true, type: 'module' }, null, 2)}\n`,
  )
  run('bun', ['install'], project)
  console.error(`run-agents: Helix installed in ${project}`)
}
const skill = join(modules, '@fusion.dev/helix/skills/helix/SKILL.md')

/** Whether a path is something the agent wrote, and not the bundle built from
    it or the link to the installed packages a harness was given. */
const written = (source) =>
  !source.split('/').some((part) => part === 'dist' || part === 'node_modules')

/** Where one run's page is written, below `runs` in the project and in `--out`. */
const place = (one) => join(one.harness, slug(one.model), one.arm, one.task)

/** One agent on one task, in its own folder: what it cost and what it said. */
const attempt = ({ harness, model }, arm, task) => {
  const adapter = HARNESSES[harness]
  const folder = join(project, 'runs', place({ arm, harness, model, task: task.id }))
  mkdirSync(folder, { recursive: true })
  const spec = {
    arm,
    budget,
    folder,
    mcp: { args: ['mcp'], command: helix },
    model,
    plugin: join(root, 'helix/plugin'),
    prompt: `${task.prompt}\n\nHelix is installed in this project's node_modules.${arm === 'web' ? " Helix's documentation is at https://fusion.dev/llms.txt." : ''} Write the page in this folder as index.html, with its imports and code in main.ts, or in .tsx files for React.`,
    reach: [modules],
    scratch,
    skill,
  }
  const { args, before = [], env, files } = adapter.command(spec)
  const shown = (list) => `${adapter.binary} ${list.map((one) => JSON.stringify(one)).join(' ')}`
  if (dry) {
    console.log(`${folder}\n${[...before, args].map((list) => `  ${shown(list)}`).join('\n')}`)
    return undefined
  }
  for (const file of files) {
    const to = isAbsolute(file.to) ? file.to : join(folder, file.to)
    mkdirSync(dirname(to), { recursive: true })
    if (file.link !== undefined) {
      symlinkSync(file.link, to)
    } else if (file.from === undefined) {
      writeFileSync(to, file.content ?? '')
    } else {
      cpSync(file.from, to)
    }
  }
  const options = {
    cwd: folder,
    encoding: 'utf8',
    /* The binary from this tree, which the installed command line's shim
       runs first, since a checkout has no platform package to install. */
    env: { ...process.env, ...env, HELIX_BIN: helix },
    maxBuffer: 1024 * 1024 * 64,
    /* Nothing on standard input: OpenCode and Pi read a piped one to its end
       and add it to the prompt, and a harness's own step that asks a
       question takes no answer. */
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
  }
  /* A harness's own steps, such as installing the plugin, run first, and a
     run whose step failed records why in place of the agent's work. */
  for (const step of before) {
    const prepared = spawnSync(adapter.binary, step, options)
    if (prepared.status !== 0) {
      return {
        arm,
        cost: null,
        error: `${shown(step)} failed: ${(prepared.stderr || prepared.stdout || '').trim().slice(0, 400)}`,
        harness,
        model,
        seconds: 0,
        task: task.id,
        tokens: { input: null, output: null },
        tools: {},
        turns: null,
      }
    }
  }
  const started = Date.now()
  const ran = spawnSync(adapter.binary, args, options)
  const said = adapter.parse(ran.stdout ?? '', ran.stderr ?? '', ran.status, spec)
  return {
    arm,
    ...said,
    error:
      ran.error?.code === 'ETIMEDOUT' ? `stopped after ${timeout / 60000} minutes` : said.error,
    harness,
    model,
    seconds: Math.round((Date.now() - started) / 1000),
    task: task.id,
  }
}

/* **What an earlier run of the same `--out` finished**, kept: its pages go
   back where grading reads them, and only what is missing runs. */
const saved = join(out, 'attempts.json')
const same = (one, pair, arm, task) =>
  one.harness === pair.harness && one.model === pair.model && one.arm === arm && one.task === task
const results =
  existsSync(saved) && !dry
    ? JSON.parse(readFileSync(saved, 'utf8')).filter((one) =>
        pairs.some((pair) =>
          arms.some((arm) => tasks.some((task) => same(one, pair, arm, task.id))),
        ),
      )
    : []
if (!dry) {
  mkdirSync(join(out, 'runs'), { recursive: true })
}
if (results.length > 0) {
  cpSync(join(out, 'runs'), join(project, 'runs'), { recursive: true })
  console.error(`run-agents: ${results.length} runs kept from ${out}`)
}
for (const pair of pairs) {
  for (const arm of arms) {
    if (!HARNESSES[pair.harness].arms.includes(arm)) {
      console.error(
        `run-agents: ${pair.harness} cannot give its agent the ${arm} arm, so it is skipped.`,
      )
      continue
    }
    for (const task of tasks) {
      if (results.some((one) => same(one, pair, arm, task.id))) {
        continue
      }
      const one = attempt(pair, arm, task)
      if (one === undefined) {
        continue
      }
      console.error(
        `run-agents: ${pair.harness} ${pair.model} ${arm} ${task.id}: ${one.turns ?? '?'} turns, $${one.cost?.toFixed(3) ?? '?'}, ${one.seconds} s${one.error ? `, ${one.error}` : ''}`,
      )
      /* A run that never reached the model says nothing about Helix, and every
         run after it would say the same, so the whole set stops here, with
         everything finished already saved. The same command resumes. */
      if (
        (one.cost === 0 || one.cost === null) &&
        /authenticat|log ?in|credit balance|rate limit|usage limit|api key/i.test(one.error ?? '')
      ) {
        console.error(
          `run-agents: stopped, since no run can reach the model: ${one.error}\n` +
            `  ${results.length} runs are saved in ${out}. Run the same command again to go on.`,
        )
        process.exit(1)
      }
      results.push(one)
      cpSync(join(project, 'runs', place(one)), join(out, 'runs', place(one)), {
        filter: written,
        recursive: true,
      })
      writeFileSync(saved, `${JSON.stringify(results, null, 2)}\n`)
    }
  }
}
/* A dry run made an empty scratch folder and nothing else, so it leaves none
   behind. */
if (dry) {
  rmSync(scratch, { force: true, recursive: true })
  process.exit(0)
}

/** Each harness, model and arm that ran, as one group of pages. */
const groups = [
  ...new Map(
    results.map((one) => [
      join(one.harness, slug(one.model), one.arm),
      { arm: one.arm, harness: one.harness, model: one.model },
    ]),
  ),
]

/* Graded by the grader the reference pages pass, one group at a time. */
for (const [path, group] of groups) {
  const graded = spawnSync(
    process.execPath,
    [
      join(root, 'fusion/scripts/run-tasks.mjs'),
      '--answers',
      join(project, 'runs', path),
      '--json',
    ],
    { encoding: 'utf8', env: { ...process.env, HELIX_BIN: helix }, maxBuffer: 1024 * 1024 * 64 },
  )
  for (const one of JSON.parse(graded.stdout).grades) {
    const result = results.find((r) => same(r, group, group.arm, one.id))
    if (result) {
      result.coverage = one.coverage
      result.passed = one.passed
      result.reasons = one.reasons
    }
  }
}

/** The module script a page loads, or the `main` file the prompt asked for. */
const entryOf = (folder) => {
  const page = existsSync(join(folder, 'index.html'))
    ? readFileSync(join(folder, 'index.html'), 'utf8')
    : ''
  const named = /<script[^>]*type="module"[^>]*src="\.?\/?([^"]+)"/.exec(page)?.[1]
  return [named, 'main.tsx', 'main.ts'].find(
    (one) => one !== undefined && existsSync(join(folder, one)),
  )
}

/**
 * Each page bundled into `dist` beside it, a folder the scan leaves out: its
 * script, and its own `index.html` loading that script and every stylesheet
 * the script imports. `undefined` where it built, or why it did not.
 *
 * **Stylesheets are linked where the server serves them, and never bundled.**
 * Bun's CSS bundler refuses `::highlight()`, which `@fusion.dev/helix-styles`
 * writes on purpose, so bundling failed every page that imported Helix's
 * styles before the agent's own work was read at all. Each `.css` import
 * resolves to its file in the project, which the server roots at, and becomes
 * a `<link>` with an empty module in its place.
 */
const serve = async (folder) => {
  const entry = entryOf(folder)
  if (entry === undefined) {
    return 'the page names no script to load'
  }
  const into = join(folder, 'dist')
  const sheets = []
  const built = await Bun.build({
    entrypoints: [join(folder, entry)],
    outdir: into,
    plugins: [
      {
        name: 'stylesheets-as-links',
        setup: (build) => {
          build.onResolve({ filter: /\.css$/ }, (args) => ({
            namespace: 'sheet',
            path: Bun.resolveSync(args.path, args.resolveDir),
          }))
          build.onLoad({ filter: /.*/, namespace: 'sheet' }, (args) => {
            sheets.push(args.path)
            return { contents: '', loader: 'js' }
          })
        },
      },
    ],
    target: 'browser',
  }).catch((error) => ({ logs: [error], success: false }))
  if (!built.success) {
    return `the page does not build: ${String(built.logs[0] ?? 'no reason given').split('\n')[0]}`
  }
  const output = built.outputs.find((one) => one.kind === 'entry-point')
  const page = existsSync(join(folder, 'index.html'))
    ? readFileSync(join(folder, 'index.html'), 'utf8')
    : '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
  const styles = [...new Set(sheets)]
    .map((sheet) => `<link rel="stylesheet" href="/${relative(project, sheet)}">`)
    .join('')
  const script = `<script type="module" src="./${relative(into, output.path)}"></script>`
  const markup = page.replace(/<script[^>]*type="module"[^>]*><\/script>/g, '')
  /* A whole document takes the two where they go, and a fragment of markup is
     set in one. */
  const html = /<\/body>/i.test(markup)
    ? markup.replace(/<\/head>/i, `${styles}</head>`).replace(/<\/body>/i, `${script}</body>`)
    : `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>${markup}${script}</body></html>`
  writeFileSync(join(into, 'index.html'), html)
  return undefined
}

/* **The page running, through `helix diagnostics --once`.** One server over
   the project, and one pass per group over every page that built. */
if (runtime) {
  const port = 8800 + Math.floor(Math.random() * 100)
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: project,
    stdio: 'ignore',
  })
  await new Promise((done) => setTimeout(done, 800))
  try {
    for (const [, group] of groups) {
      const urls = []
      for (const one of results.filter((each) => same(each, group, group.arm, each.task))) {
        const why = await serve(join(project, 'runs', place(one)))
        if (why === undefined) {
          urls.push([one, `/runs/${place(one)}/dist/index.html`])
        } else {
          one.passed = false
          one.reasons = [...(one.reasons ?? []), why]
        }
      }
      if (urls.length === 0) {
        continue
      }
      const once = urls.flatMap(([, path]) => ['--once', `http://127.0.0.1:${port}${path}`])
      const diagnosed = spawnSync(helix, ['--json', 'diagnostics', ...once], {
        cwd: project,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 64,
      })
      /* One line a page, in the order asked, each naming its page. */
      const lines = diagnosed.stdout
        .split('\n')
        .filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line))
      urls.forEach(([one, path], at) => {
        const line =
          lines.find((each) => each.page === path || String(each.page).endsWith(path)) ?? lines[at]
        if (line === undefined) {
          return
        }
        const faults = line.error
          ? [`the page did not open: ${line.error}`]
          : (line.findings ?? [])
              .filter((finding) => finding.severity === 'error')
              .map((finding) => `runtime ${finding.kind}: ${finding.message}`)
        one.runtime = faults.length === 0
        if (faults.length > 0) {
          one.passed = false
          one.reasons = [...(one.reasons ?? []), ...faults]
        }
      })
    }
  } finally {
    server.kill()
  }
}

cpSync(join(project, 'runs'), join(out, 'runs'), { filter: written, recursive: true })
const summary = groups.map(([, group]) => {
  const mine = results.filter((one) => same(one, group, group.arm, one.task))
  return {
    ...group,
    cost: mine.some((one) => one.cost === null)
      ? null
      : mine.reduce((sum, one) => sum + one.cost, 0),
    coverage: mine.reduce((sum, one) => sum + (one.coverage ?? 0), 0) / (mine.length || 1),
    passed: mine.filter((one) => one.passed).length,
    seconds: mine.reduce((sum, one) => sum + one.seconds, 0),
    total: mine.length,
  }
})
writeFileSync(
  join(out, 'results.json'),
  `${JSON.stringify({ pairs, results, summary, tasks: tasks.map((t) => t.id) }, null, 2)}\n`,
)
/* **The table phase 1 publishes**, one row per harness, model and arm. A cost
   a harness does not report is a dash, never a zero. */
const table = [
  '| Harness | Model | Arm | Passed | Helix coverage | Cost | Time |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...summary.map(
    (one) =>
      `| ${one.harness} | ${one.model} | ${one.arm} | ${one.passed} of ${one.total} | ${Math.round(one.coverage * 100)}% | ${one.cost === null ? '-' : `$${one.cost.toFixed(2)}`} | ${Math.round(one.seconds / 60)} min |`,
  ),
].join('\n')
writeFileSync(join(out, 'table.md'), `${table}\n`)
console.log(table)
/* **The scratch project goes once its pages are copied out**, unless `--keep`
   asks for it. Each one installs Helix and its browser kit, about 150 MB, and
   temporary folders left behind by earlier tools have filled a disk before. */
if (keep) {
  console.log(`\nResults and pages in ${out}. The scratch project is ${scratch}.`)
} else {
  rmSync(scratch, { force: true, recursive: true })
  console.log(`\nResults and pages in ${out}.`)
}
