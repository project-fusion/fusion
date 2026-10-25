/**
 * The coding-agent harnesses the agent runner can drive, each run headless on
 * one prompt in one folder. A module, not a script: `run-agents.mjs` runs them.
 *
 * **One shape for every harness**, so the runner never branches on a name:
 * `command` turns a run into the arguments, environment and files the
 * harness takes, with any commands of its own that run first, and `parse`
 * turns what it printed into the same record for all of them. A field a harness does not report is `null` and never a guess,
 * because a table that fills a gap with zero says a run was free.
 *
 * **Every flag here is read from the harness's own reference**, cited beside
 * it. A harness changes its flags between releases, and a flag that no longer
 * exists fails the run loudly, which is the outcome we want over a run that
 * quietly ignores a setting.
 */
import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'

/*
 * @typedef {object} Run
 * @property {string} arm Which surfaces the agent has: `docs`, `web`, `skill`, `mcp`, or `plugin`.
 * @property {string} budget The most a run may spend, in US dollars, where the harness takes a cap.
 * @property {string} folder The folder the agent works in, and the only one it writes to.
 * @property {{ args: string[], command: string } | undefined} mcp The MCP server the `mcp` arm adds.
 * @property {string} model The harness's own id for the model.
 * @property {string | undefined} plugin The plugin folder the `plugin` arm installs.
 * @property {string} prompt The task, as the agent reads it.
 * @property {string[]} reach Folders outside `folder` the agent may read, such as the installed packages.
 * @property {string} scratch A folder for the run's own configuration, outside every agent's reach.
 * @property {string | undefined} skill The SKILL.md the `skill` and `mcp` arms add.
 */

/*
 * @typedef {object} File
 * @property {string | undefined} content What the file holds, where it is written fresh.
 * @property {string | undefined} from The file it is copied from, where it is a copy.
 * @property {string | undefined} link The folder it points at, where it is a symbolic link.
 * @property {string} to Where it goes, relative to the run's folder unless absolute.
 */

/*
 * @typedef {object} Said
 * @property {number | null} cost What the run cost in US dollars, as the harness reported it.
 * @property {string | null} error Why the run failed, or null where it finished.
 * @property {{ input: number | null, output: number | null }} tokens The tokens the run read and wrote.
 * @property {Record<string, number>} tools How many times the agent called each tool.
 * @property {number | null} turns How many turns the run took.
 */

/** Each line of JSONL output that parses, and nothing else. */
const jsonLines = (text) =>
  text
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return {}
      }
    })

/**
 * Each folder the agent may read, linked into its own folder under its name.
 * A harness with no flag that widens what it reads finds `node_modules` where
 * a project keeps it, and the runner leaves the links out of every copy.
 */
const links = (run) => run.reach.map((folder) => ({ link: folder, to: basename(folder) }))

/** The tools every arm has: reading and writing files in the folder. */
const CLAUDE_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep']

/**
 * Claude Code, through `claude -p`. Flags from
 * https://code.claude.com/docs/en/cli-reference and the stream-json result
 * fields `run-agents.mjs` has read since the agent suite began.
 */
const claude = {
  arms: ['docs', 'mcp', 'plugin', 'skill', 'web'],
  binary: 'claude',
  command: (run) => {
    const args = [
      '-p',
      run.prompt,
      '--model',
      run.model,
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
      run.budget,
      ...run.reach.flatMap((folder) => ['--add-dir', folder]),
      '--disallowedTools',
      run.arm === 'web' ? 'Bash,WebSearch,Task' : 'Bash,WebFetch,WebSearch,Task',
    ]
    /* The web arm reaches the site and nothing else. */
    const tools =
      run.arm === 'web' ? [...CLAUDE_TOOLS, 'WebFetch(domain:fusion.dev)'] : [...CLAUDE_TOOLS]
    const files = []
    if ((run.arm === 'skill' || run.arm === 'mcp') && run.skill) {
      /* Where the guide says to link it, for Claude Code. */
      files.push({ from: run.skill, to: '.claude/skills/helix/SKILL.md' })
      tools.push('Skill')
    }
    if (run.arm === 'mcp' && run.mcp) {
      const config = `${run.scratch}/claude-mcp.json`
      files.push({
        content: JSON.stringify({
          mcpServers: { helix: { args: run.mcp.args, command: run.mcp.command } },
        }),
        to: config,
      })
      args.push('--mcp-config', config)
      tools.push('mcp__helix')
    }
    /* **The plugin as a user installs it.** Its skill loads from the folder.
       Its MCP server is the plugin's own `.mcp.json` handed over as written,
       since `--strict-mcp-config`, which keeps the user's own servers out of
       every arm, keeps a plugin's out too. */
    if (run.arm === 'plugin' && run.plugin) {
      args.push('--plugin-dir', run.plugin, '--mcp-config', `${run.plugin}/.mcp.json`)
      tools.push('Skill', 'mcp__helix')
    }
    args.push('--allowedTools', tools.join(','))
    return { args, env: {}, files }
  },
  install: 'npm install -g @anthropic-ai/claude-code',
  /**
   * The last stream-json line is the result, and the assistant lines carry
   * each tool call. Tokens come from `modelUsage`, which counts subagents
   * where `usage` counts only the main loop, and input counts cached reads
   * and writes, so it compares with a harness that reports one total. Field
   * names from https://code.claude.com/docs/en/agent-sdk/typescript.
   */
  parse: (stdout, stderr) => {
    const lines = jsonLines(stdout)
    const said = lines.findLast((line) => line.type === 'result') ?? {
      error: (stderr || stdout).trim().slice(0, 400),
    }
    const tools = {}
    for (const line of lines) {
      for (const part of line.type === 'assistant' ? (line.message?.content ?? []) : []) {
        if (part.type === 'tool_use') {
          const name = part.name === 'Skill' ? `Skill(${part.input?.skill ?? ''})` : part.name
          tools[name] = (tools[name] ?? 0) + 1
        }
      }
    }
    const models = Object.values(said.modelUsage ?? {})
    const sum = (read) =>
      models.length === 0 ? null : models.reduce((total, one) => total + read(one), 0)
    return {
      cost: said.total_cost_usd ?? null,
      error: said.is_error
        ? (said.errors?.join('; ') ?? String(said.result ?? said.subtype))
        : (said.error ?? null),
      tokens: {
        input: sum(
          (one) =>
            (one.inputTokens ?? 0) +
            (one.cacheReadInputTokens ?? 0) +
            (one.cacheCreationInputTokens ?? 0),
        ),
        output: sum((one) => one.outputTokens ?? 0),
      },
      tools,
      turns: said.num_turns ?? null,
    }
  },
}

/**
 * OpenCode 1.x, through `opencode run --format json`. Flags from
 * https://opencode.ai/docs/cli/ and `packages/opencode/src/cli/cmd/run.ts`;
 * permissions from https://opencode.ai/docs/permissions/; inline config from
 * https://opencode.ai/docs/config/. OpenCode takes no cost cap, so the
 * runner's timeout is its only limit.
 */
const opencode = {
  arms: ['docs', 'mcp', 'skill'],
  binary: 'opencode',
  command: (run) => {
    const files = links(run)
    /* `run` turns down every request that would ask, so the rules that
       matter are the ones that deny outright: no shell, no web, and nothing
       outside the folder. */
    const env = {
      OPENCODE_PERMISSION: JSON.stringify({
        bash: 'deny',
        edit: 'allow',
        external_directory: 'deny',
        webfetch: 'deny',
        websearch: 'deny',
      }),
    }
    if ((run.arm === 'skill' || run.arm === 'mcp') && run.skill) {
      files.push({ from: run.skill, to: '.opencode/skills/helix/SKILL.md' })
    }
    if (run.arm === 'mcp' && run.mcp) {
      env.OPENCODE_CONFIG_CONTENT = JSON.stringify({
        mcp: {
          helix: { command: [run.mcp.command, ...run.mcp.args], environment: {}, type: 'local' },
        },
      })
    }
    return {
      args: ['run', run.prompt, '--model', run.model, '--dir', run.folder, '--format', 'json'],
      env,
      files,
    }
  },
  install: 'npm install -g opencode-ai',
  /**
   * One JSONL record per event and no closing summary, so the totals are sums:
   * each `step_finish` carries one step's cost and tokens, and each `tool_use`
   * one finished tool call. Reasoning tokens count as output, as they do in
   * the other harnesses' totals.
   */
  parse: (stdout, stderr) => {
    const lines = jsonLines(stdout)
    const steps = lines.filter((line) => line.type === 'step_finish').map((line) => line.part ?? {})
    const failed = lines.findLast((line) => line.type === 'error')
    const tools = {}
    for (const line of lines.filter((one) => one.type === 'tool_use')) {
      const name = line.part?.tool ?? 'unknown'
      tools[name] = (tools[name] ?? 0) + 1
    }
    const sum = (read) =>
      steps.length === 0 ? null : steps.reduce((total, one) => total + read(one), 0)
    return {
      cost: sum((one) => one.cost ?? 0),
      error: failed
        ? String(failed.error?.data?.message ?? failed.error?.name ?? 'the run failed')
        : steps.length === 0
          ? (stderr || stdout).trim().slice(0, 400) || 'the run printed nothing'
          : null,
      tokens: {
        input: sum(
          (one) =>
            (one.tokens?.input ?? 0) +
            (one.tokens?.cache?.read ?? 0) +
            (one.tokens?.cache?.write ?? 0),
        ),
        output: sum((one) => (one.tokens?.output ?? 0) + (one.tokens?.reasoning ?? 0)),
      },
      tools,
      turns: steps.length === 0 ? null : steps.length,
    }
  },
}

/**
 * Pi, through `pi --mode json`. Flags from https://pi.dev/docs/latest/cli and
 * `packages/coding-agent/src/cli/args.ts`; events from
 * https://pi.dev/docs/latest/json and https://pi.dev/docs/latest/message-types.
 * Pi never asks for approval and has no sandbox, so the shell is kept out by
 * leaving it off the tool list, and it has no web tool to keep out. It takes
 * no cost cap, so the runner's timeout is its only limit.
 */
const pi = {
  arms: ['docs', 'mcp', 'skill'],
  binary: 'pi',
  command: (run) => {
    const files = links(run)
    const args = [
      '--mode',
      'json',
      '--model',
      run.model,
      '--no-session',
      '--tools',
      'read,edit,write,grep,find,ls',
    ]
    /* Pi loads a project's own skills and MCP servers only when `--approve`
       says to, which is the switch the two arms that add them flip. */
    if ((run.arm === 'skill' || run.arm === 'mcp') && run.skill) {
      files.push({ from: run.skill, to: '.agents/skills/helix/SKILL.md' })
      args.push('--approve')
    }
    if (run.arm === 'mcp' && run.mcp) {
      /* `direct` exposure names each tool `mcp__helix__<tool>` in the events,
         where the default runs them inside one code tool. */
      files.push({
        content: JSON.stringify({
          mcpServers: {
            helix: { args: run.mcp.args, command: run.mcp.command, env: {}, exposure: 'direct' },
          },
        }),
        to: '.pi/mcp.json',
      })
    }
    args.push(run.prompt)
    return { args, env: {}, files }
  },
  install: 'npm install -g --ignore-scripts @earendil-works/pi-coding-agent',
  /**
   * Usage is read from each assistant `message_end`, since `message_update`
   * carries a running total that would count twice. Pi exits 0 in JSON mode
   * even when a run ends in an error, so the last assistant message's
   * `stopReason` says whether it finished.
   */
  parse: (stdout, stderr) => {
    const lines = jsonLines(stdout)
    const replies = lines
      .filter((line) => line.type === 'message_end' && line.message?.role === 'assistant')
      .map((line) => line.message)
    const tools = {}
    for (const line of lines.filter((one) => one.type === 'tool_execution_start')) {
      tools[line.toolName] = (tools[line.toolName] ?? 0) + 1
    }
    const last = replies.at(-1)
    const retried = lines.findLast((line) => line.type === 'auto_retry_end' && !line.success)
    const sum = (read) =>
      replies.length === 0 ? null : replies.reduce((total, one) => total + read(one.usage ?? {}), 0)
    const turns = lines.filter((line) => line.type === 'turn_end').length
    return {
      cost: sum((usage) => usage.cost?.total ?? 0),
      error:
        last === undefined
          ? (stderr || stdout).trim().slice(0, 400) || 'the run printed nothing'
          : last.stopReason === 'error' || last.stopReason === 'aborted'
            ? String(last.errorMessage ?? retried?.finalError ?? last.stopReason)
            : null,
      tokens: {
        input: sum(
          (usage) => (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0),
        ),
        output: sum((usage) => usage.output ?? 0),
      },
      tools,
      turns: turns === 0 ? null : turns,
    }
  },
}

/**
 * OpenAI Codex CLI, through `codex exec --json`. Flags from
 * `codex-rs/exec/src/cli.rs` in openai/codex and
 * https://learn.chatgpt.com/docs/non-interactive-mode; events from
 * `codex-rs/exec/src/exec_events.rs`; MCP from
 * https://learn.chatgpt.com/docs/extend/mcp, set for one run through `-c`.
 *
 * **Codex keeps its shell, inside its own sandbox.** Codex reads files with
 * shell commands, so a Codex without one could not read the packages at all,
 * which would measure the rule and not the harness. `workspace-write` lets it
 * write only in its folder with the network off, the same reach every other
 * harness gets by losing its shell. Codex reports no cost and no count of
 * model round trips, so both are null, and it takes no cap but the timeout.
 */
const codex = {
  arms: ['docs', 'mcp', 'skill'],
  binary: 'codex',
  command: (run) => {
    const files = links(run)
    const args = [
      'exec',
      '--json',
      '--model',
      run.model,
      '--cd',
      run.folder,
      '--skip-git-repo-check',
      '--ephemeral',
      '--ignore-user-config',
      '--sandbox',
      'workspace-write',
      '-c',
      'web_search="disabled"',
    ]
    if ((run.arm === 'skill' || run.arm === 'mcp') && run.skill) {
      files.push({ from: run.skill, to: '.agents/skills/helix/SKILL.md' })
    }
    if (run.arm === 'mcp' && run.mcp) {
      args.push(
        '-c',
        `mcp_servers.helix.command=${JSON.stringify(run.mcp.command)}`,
        '-c',
        `mcp_servers.helix.args=${JSON.stringify(run.mcp.args)}`,
        '-c',
        'mcp_servers.helix.required=true',
      )
    }
    args.push(run.prompt)
    return { args, env: {}, files }
  },
  install: 'npm install -g @openai/codex',
  /**
   * `turn.completed` carries the thread's usage so far, which for one prompt
   * is the run's, and each `item.completed` one thing the agent did. A failed
   * turn or an `error` event says why the run stopped.
   */
  parse: (stdout, stderr) => {
    const lines = jsonLines(stdout)
    const usage = lines.findLast((line) => line.type === 'turn.completed')?.usage
    const failed = lines.findLast((line) => line.type === 'turn.failed' || line.type === 'error')
    const tools = {}
    for (const line of lines.filter((one) => one.type === 'item.completed')) {
      const item = line.item ?? {}
      const name = {
        command_execution: 'shell',
        file_change: 'edit',
        mcp_tool_call: `mcp__${item.server}__${item.tool}`,
        web_search: 'web_search',
      }[item.type]
      if (name !== undefined) {
        tools[name] = (tools[name] ?? 0) + 1
      }
    }
    return {
      cost: null,
      error: failed
        ? String(failed.error?.message ?? failed.message ?? 'the turn failed')
        : usage === undefined
          ? (stderr || stdout).trim().slice(0, 400) || 'the run printed nothing'
          : null,
      tokens: { input: usage?.input_tokens ?? null, output: usage?.output_tokens ?? null },
      tools,
      turns: null,
    }
  },
}

/** Every span in an OpenTelemetry file, written one span to a line or as
    OTLP JSON, with its attributes as a plain object. The Copilot docs name
    the attributes and not the layout, so both are read. */
const spans = (text) =>
  jsonLines(text).flatMap((line) => {
    const nested = (line.resourceSpans ?? []).flatMap((resource) =>
      (resource.scopeSpans ?? []).flatMap((scope) => scope.spans ?? []),
    )
    return (nested.length > 0 ? nested : [line]).map((span) => ({
      attributes: Array.isArray(span.attributes)
        ? Object.fromEntries(
            span.attributes.map(({ key, value }) => [
              key,
              value?.intValue ??
                value?.doubleValue ??
                value?.stringValue ??
                value?.arrayValue?.values?.map((one) => one.stringValue) ??
                value,
            ]),
          )
        : (span.attributes ?? {}),
      name: span.name ?? '',
    }))
  })

/** Where Copilot CLI writes one run's spans, in the scratch folder. */
const spanFile = (run) => `${run.scratch}/copilot-${run.folder.replace(/[^\w.-]+/g, '_')}.jsonl`

/**
 * GitHub Copilot CLI, through `copilot -p`. Flags from
 * https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference
 * and https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools.
 *
 * **The counts come from its OpenTelemetry spans**, since its JSON output has
 * no documented schema and the spans do: `invoke_agent` carries the tokens,
 * the turn count and the finish reason, and each `execute_tool` one tool.
 * Copilot bills in AI credits, which the docs do not tie to dollars, so cost
 * is null. Its credit cap has a floor of 30 credits, far above one task, so
 * the timeout is its limit too.
 */
const copilot = {
  arms: ['docs', 'mcp', 'skill'],
  binary: 'copilot',
  command: (run) => {
    const files = []
    const args = [
      '-p',
      run.prompt,
      `--model=${run.model}`,
      '--allow-all-tools',
      '--no-ask-user',
      '--deny-tool=shell',
      '--deny-tool=url',
      /* A deny rule alone left the shell in the model's hands: a run with it
         still called `bash` five times. Excluding the tools takes them away,
         and a probe asked to use the shell answered that it had none. */
      '--excluded-tools=bash',
      '--excluded-tools=web_fetch',
      '--disable-builtin-mcps',
      ...run.reach.flatMap((folder) => ['--add-dir', folder]),
    ]
    if ((run.arm === 'skill' || run.arm === 'mcp') && run.skill) {
      files.push({ from: run.skill, to: '.agents/skills/helix/SKILL.md' })
    }
    if (run.arm === 'mcp' && run.mcp) {
      args.push(
        '--additional-mcp-config',
        JSON.stringify({
          mcpServers: {
            helix: { args: run.mcp.args, command: run.mcp.command, tools: ['*'], type: 'local' },
          },
        }),
      )
    }
    return { args, env: { COPILOT_OTEL_FILE_EXPORTER_PATH: spanFile(run) }, files }
  },
  install: 'npm install -g @github/copilot',
  parse: (stdout, stderr, _status, run) => {
    const file = run === undefined ? undefined : spanFile(run)
    const all = file !== undefined && existsSync(file) ? spans(readFileSync(file, 'utf8')) : []
    const agent = all.findLast((span) => span.name.startsWith('invoke_agent'))?.attributes
    const tools = {}
    for (const span of all.filter((one) => one.name.startsWith('execute_tool'))) {
      const name = span.attributes['gen_ai.tool.name'] ?? 'unknown'
      tools[name] = (tools[name] ?? 0) + 1
    }
    const reasons = [agent?.['gen_ai.response.finish_reasons'] ?? []].flat()
    const number = (value) => (value === undefined ? null : Number(value))
    const read = agent?.['gen_ai.usage.input_tokens']
    const cached = agent?.['gen_ai.usage.cache_read.input_tokens']
    return {
      cost: null,
      error:
        agent === undefined
          ? (stderr || stdout).trim().slice(0, 400) || 'the run left no spans'
          : reasons.includes('error') || agent['error.type']
            ? String(agent['error.type'] ?? 'the run ended in an error')
            : null,
      tokens: {
        input: read === undefined ? null : Number(read) + Number(cached ?? 0),
        output: number(agent?.['gen_ai.usage.output_tokens']),
      },
      tools,
      turns: number(agent?.['github.copilot.turn_count']),
    }
  },
}

/*
 * **OpenHands is not here, on purpose.** Its CLI always has a terminal, has no
 * flag that takes it away and no sandbox, so a run on this machine could run
 * any command with this machine's access, and its README has said since
 * August 2026 that the CLI is no longer maintained. Measure it through
 * Harbor instead, whose containers give it a sandbox.
 */

/** Every harness, by the name `--pairs` gives it. */
export const HARNESSES = { claude, codex, copilot, opencode, pi }
