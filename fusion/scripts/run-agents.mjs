#!/usr/bin/env node
/**
 * Has a coding agent build each page of the task suite, three ways, and grades
 * what it wrote.
 *
 * **The score a model gets is the half `run-tasks.mjs` leaves out**, and this
 * is that half: each task's prompt goes to Claude Code, headless, in a project
 * that installed Helix the way a consumer does, and the page it writes is
 * graded by `run-tasks.mjs --answers`, the grader the reference pages pass.
 *
 * **Five arms, because one number says nothing.** `docs` has the installed
 * packages and nothing else, so the agent reads what `node_modules` holds.
 * `web` adds the site's own docs, fetched from fusion.dev, where the prompt
 * says they are: the fair alternative to a skill, which an agent with the
 * address would read the same way.
 * `skill` adds the guide Helix ships as a skill, linked where the guide says.
 * `mcp` adds `helix mcp` as well. `plugin` installs the Claude Code plugin in
 * `helix/plugin` in their place, the one step a user takes. The gap between
 * them is what each surface is worth, which is the question the agent
 * surfaces exist to answer.
 *
 * **Each agent sees its own folder and the installed packages, and nothing
 * else**: no shell, no web, no settings but the project's, and every other
 * folder outside its reach, so no arm reads another's page or this
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
 * fails nothing. It needs Claude Code installed and signed in, and spends
 * what each run costs, capped per run by `--budget`.
 *
 *   bun fusion/scripts/run-agents.mjs --tasks select,tabs --arms docs,skill,mcp
 *   bun fusion/scripts/run-agents.mjs --model sonnet --budget 1 --out .local/agents/pilot
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
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
const model = argument('model') ?? 'sonnet'
const budget = argument('budget') ?? '1'
const out = resolve(
  argument('out') ?? join(root, '.local/agents', new Date().toISOString().slice(0, 16)),
)
const runtime = !process.argv.includes('--no-runtime')

for (const arm of arms) {
  if (!ARMS.includes(arm)) {
    console.error(`run-agents: no arm called \`${arm}\`. The arms are ${ARMS.join(', ')}.`)
    process.exit(2)
  }
}

/** `helix`, built from this tree, which grades every page and serves the MCP arm. */
const helix = join(root, 'target/release/helix')
if (!existsSync(helix)) {
  console.error('run-agents: build the binary first, `cargo build --release -p fusion-helix-cli`.')
  process.exit(69)
}

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/* The consumer's project, packed from this tree and installed once. */
const scratch = mkdtempSync(join(tmpdir(), 'helix-agents-'))
const tarballs = join(scratch, 'tarballs')
const project = join(scratch, 'project')
mkdirSync(tarballs)
mkdirSync(project)
const dependencies = {}
const directories = new Map([...manifests()].map(([name, { directory }]) => [name, directory]))
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
const modules = join(project, 'node_modules')
const skill = join(modules, '@fusion.dev/helix/skills/helix/SKILL.md')
console.error(`run-agents: Helix installed in ${project}`)

/** The tools every arm has, and the MCP server's for the arm that has it. */
const TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep']

/** One agent on one task, in its own folder: what it cost and what it said. */
const attempt = (arm, task) => {
  const folder = join(project, 'runs', arm, task.id)
  mkdirSync(folder, { recursive: true })
  const args = [
    '-p',
    `${task.prompt}\n\nHelix is installed in this project's node_modules.${arm === 'web' ? " Helix's documentation is at https://fusion.dev/llms.txt." : ''} Write the page in this folder as index.html, with its imports and code in main.ts, or in .tsx files for React.`,
    '--model',
    model,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--setting-sources',
    'project',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--max-budget-usd',
    budget,
    '--add-dir',
    modules,
    '--disallowedTools',
    arm === 'web' ? 'Bash,WebSearch,Task' : 'Bash,WebFetch,WebSearch,Task',
  ]
  /* The web arm reaches the site and nothing else. */
  const tools = arm === 'web' ? [...TOOLS, 'WebFetch(domain:fusion.dev)'] : [...TOOLS]
  if (arm === 'skill' || arm === 'mcp') {
    /* Where the guide says to link it, for Claude Code. */
    mkdirSync(join(folder, '.claude/skills/helix'), { recursive: true })
    cpSync(skill, join(folder, '.claude/skills/helix/SKILL.md'))
    tools.push('Skill')
  }
  if (arm === 'mcp') {
    const config = join(scratch, 'mcp.json')
    writeFileSync(
      config,
      JSON.stringify({ mcpServers: { helix: { args: ['mcp'], command: helix } } }),
    )
    args.push('--mcp-config', config)
    tools.push('mcp__helix')
  }
  /* **The plugin as a user installs it.** Its skill loads from the folder.
     Its MCP server is the plugin's own `.mcp.json` handed over as written,
     since `--strict-mcp-config`, which keeps the user's own servers out of
     every arm, keeps a plugin's out too. */
  if (arm === 'plugin') {
    const plugin = join(root, 'helix/plugin')
    args.push('--plugin-dir', plugin, '--mcp-config', join(plugin, '.mcp.json'))
    tools.push('Skill', 'mcp__helix')
  }
  args.push('--allowedTools', tools.join(','))
  const started = Date.now()
  const ran = spawnSync('claude', args, {
    cwd: folder,
    encoding: 'utf8',
    /* The binary from this tree, which the installed command line's shim
       runs first, since a checkout has no platform package to install. */
    env: { ...process.env, HELIX_BIN: helix },
    maxBuffer: 1024 * 1024 * 64,
  })
  /* **Streamed, for the tools each agent reached for**, which is what says
     why two arms differ: an arm with the skill whose agent never read it is
     the docs arm under another name. The last line is the result. */
  const lines = ran.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return {}
      }
    })
  const said = lines.findLast((line) => line.type === 'result') ?? {
    error: (ran.stderr || ran.stdout).trim().slice(0, 400),
  }
  const used = {}
  for (const line of lines) {
    for (const part of line.type === 'assistant' ? (line.message?.content ?? []) : []) {
      if (part.type === 'tool_use') {
        const name = part.name === 'Skill' ? `Skill(${part.input?.skill ?? ''})` : part.name
        used[name] = (used[name] ?? 0) + 1
      }
    }
  }
  return {
    arm,
    cost: said.total_cost_usd ?? null,
    error: said.is_error ? String(said.result ?? said.subtype) : (said.error ?? null),
    seconds: Math.round((Date.now() - started) / 1000),
    task: task.id,
    tools: used,
    turns: said.num_turns ?? null,
  }
}

/* **What an earlier run of the same `--out` finished**, kept: its pages go
   back where grading reads them, and only what is missing runs. */
const saved = join(out, 'attempts.json')
mkdirSync(join(out, 'runs'), { recursive: true })
const results = existsSync(saved)
  ? JSON.parse(readFileSync(saved, 'utf8')).filter(
      (one) => arms.includes(one.arm) && tasks.some((task) => task.id === one.task),
    )
  : []
if (results.length > 0) {
  cpSync(join(out, 'runs'), join(project, 'runs'), { recursive: true })
  console.error(`run-agents: ${results.length} runs kept from ${out}`)
}
for (const arm of arms) {
  for (const task of tasks) {
    if (results.some((one) => one.arm === arm && one.task === task.id)) {
      continue
    }
    const one = attempt(arm, task)
    console.error(
      `run-agents: ${arm} ${task.id}: ${one.turns ?? '?'} turns, $${one.cost?.toFixed(3) ?? '?'}, ${one.seconds} s${one.error ? `, ${one.error}` : ''}`,
    )
    /* A run that never reached the model says nothing about Helix, and every
       run after it would say the same, so the whole set stops here, with
       everything finished already saved. The same command resumes. */
    if (
      one.cost === 0 &&
      /authenticate|log ?in|credit balance|rate limit|usage limit/i.test(one.error ?? '')
    ) {
      console.error(
        `run-agents: stopped, since no run can reach the model: ${one.error}\n` +
          `  ${results.length} runs are saved in ${out}. Run the same command again to go on.`,
      )
      process.exit(1)
    }
    results.push(one)
    cpSync(join(project, 'runs', arm, task.id), join(out, 'runs', arm, task.id), {
      recursive: true,
    })
    writeFileSync(saved, `${JSON.stringify(results, null, 2)}\n`)
  }
}

/* Graded by the grader the reference pages pass, one arm at a time. */
const grades = {}
for (const arm of arms) {
  const graded = spawnSync(
    process.execPath,
    [join(root, 'fusion/scripts/run-tasks.mjs'), '--answers', join(project, 'runs', arm), '--json'],
    { encoding: 'utf8', env: { ...process.env, HELIX_BIN: helix }, maxBuffer: 1024 * 1024 * 64 },
  )
  const all = JSON.parse(graded.stdout)
  grades[arm] = all
  for (const one of all.grades) {
    const result = results.find((r) => r.arm === arm && r.task === one.id)
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
 * Each page bundled into `dist` beside it, a folder the scan leaves out: its script, the CSS the script
 * imports, and its own `index.html` loading both. `undefined` where it built,
 * or why it did not.
 */
const serve = (folder) => {
  const entry = entryOf(folder)
  if (entry === undefined) {
    return 'the page names no script to load'
  }
  const into = join(folder, 'dist')
  const built = spawnSync(
    'bun',
    ['build', entry, '--outdir', into, '--target', 'browser', '--experimental-css'],
    { cwd: folder, encoding: 'utf8' },
  )
  if (built.status !== 0) {
    return `the page does not build: ${(built.stderr || built.stdout).trim().split('\n')[0]}`
  }
  const stem = entry.replace(/\.[^.]+$/, '')
  const page = existsSync(join(folder, 'index.html'))
    ? readFileSync(join(folder, 'index.html'), 'utf8')
    : '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
  const styles = existsSync(join(into, `${stem}.css`))
    ? `<link rel="stylesheet" href="./${stem}.css">`
    : ''
  const script = `<script type="module" src="./${stem}.js"></script>`
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
   the project, and one pass per arm over every page that built. */
if (runtime) {
  const port = 8800 + Math.floor(Math.random() * 100)
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: project,
    stdio: 'ignore',
  })
  await new Promise((done) => setTimeout(done, 800))
  try {
    for (const arm of arms) {
      const urls = []
      for (const one of results.filter((each) => each.arm === arm)) {
        const why = serve(join(project, 'runs', arm, one.task))
        if (why === undefined) {
          urls.push([one, `/runs/${arm}/${one.task}/dist/index.html`])
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

/* The pages as written, without what was built from them. */
cpSync(join(project, 'runs'), join(out, 'runs'), {
  filter: (source) => !source.split('/').includes('dist'),
  recursive: true,
})
const summary = Object.fromEntries(
  arms.map((arm) => {
    const mine = results.filter((one) => one.arm === arm)
    return [
      arm,
      {
        cost: mine.reduce((sum, one) => sum + (one.cost ?? 0), 0),
        coverage: mine.reduce((sum, one) => sum + (one.coverage ?? 0), 0) / (mine.length || 1),
        passed: mine.filter((one) => one.passed).length,
        total: mine.length,
      },
    ]
  }),
)
writeFileSync(
  join(out, 'results.json'),
  `${JSON.stringify({ model, results, summary, tasks: tasks.map((t) => t.id) }, null, 2)}\n`,
)
for (const [arm, one] of Object.entries(summary)) {
  console.log(
    `${arm.padEnd(6)} ${one.passed} of ${one.total} pass, ${Math.round(one.coverage * 100)}% Helix, $${one.cost.toFixed(2)}`,
  )
}
console.log(`\nResults and pages in ${out}. The scratch project is ${scratch}.`)
