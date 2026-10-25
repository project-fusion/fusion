import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HARNESSES } from './harnesses.mjs'

const ARMS = ['docs', 'mcp', 'plugin', 'skill', 'web']

/** A run of the `docs` arm, with every surface present so an arm can reach for one. */
const run = (arm) => ({
  arm,
  budget: '1',
  folder: '/work/runs/select',
  mcp: { args: ['mcp'], command: '/bin/helix' },
  model: 'sonnet',
  plugin: '/repo/helix/plugin',
  prompt: 'Build a select.',
  reach: ['/work/node_modules'],
  scratch: '/scratch',
  skill: '/work/node_modules/@fusion.dev/helix/skills/helix/SKILL.md',
})

describe('every harness', () => {
  test('names its binary, how to install it, and only arms the runner knows', () => {
    for (const [name, harness] of Object.entries(HARNESSES)) {
      expect(harness.binary, name).toBeString()
      expect(harness.install, name).toBeString()
      expect(
        harness.arms.every((arm) => ARMS.includes(arm)),
        name,
      ).toBe(true)
    }
  })

  /* The runner reads the same record from every harness, and a field a harness
     does not report is null, so a table never shows a missing cost as free. */
  test('reads nothing printed as a failed run with every count unknown', () => {
    for (const [name, harness] of Object.entries(HARNESSES)) {
      const said = harness.parse('', 'not signed in', 1)
      expect(said.error, name).toBeString()
      expect(said.cost, name).toBeNull()
      expect(said.turns, name).toBeNull()
      expect(said.tokens, name).toEqual({ input: null, output: null })
    }
  })
})

describe('Claude Code', () => {
  const { command, parse } = HARNESSES.claude

  test('the docs arm reads and writes files and has no shell and no web', () => {
    const { args, files } = command(run('docs'))
    expect(args.slice(0, 4)).toEqual(['-p', 'Build a select.', '--model', 'sonnet'])
    expect(args[args.indexOf('--disallowedTools') + 1]).toBe('Bash,WebFetch,WebSearch,Task')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('Read,Write,Edit,Glob,Grep')
    expect(args[args.indexOf('--add-dir') + 1]).toBe('/work/node_modules')
    expect(files).toEqual([])
  })

  test('the web arm reaches the site and nothing else', () => {
    const { args } = command(run('web'))
    expect(args[args.indexOf('--allowedTools') + 1]).toContain('WebFetch(domain:fusion.dev)')
    expect(args[args.indexOf('--disallowedTools') + 1]).not.toContain('WebFetch')
  })

  test('the mcp arm links the skill where the guide says and hands over the server', () => {
    const { args, files } = command(run('mcp'))
    expect(files[0]).toEqual({ from: run('mcp').skill, to: '.claude/skills/helix/SKILL.md' })
    expect(JSON.parse(files[1].content)).toEqual({
      mcpServers: { helix: { args: ['mcp'], command: '/bin/helix' } },
    })
    expect(args[args.indexOf('--mcp-config') + 1]).toBe(files[1].to)
  })

  test('the plugin arm installs the plugin folder and its own MCP server', () => {
    const { args } = command(run('plugin'))
    expect(args[args.indexOf('--plugin-dir') + 1]).toBe('/repo/helix/plugin')
    expect(args[args.indexOf('--mcp-config') + 1]).toBe('/repo/helix/plugin/.mcp.json')
  })

  test('a finished run reports its cost, every model it used, its turns, and its tools', () => {
    const stream = [
      { message: { content: [{ name: 'Read', type: 'tool_use' }] }, type: 'assistant' },
      {
        message: {
          content: [
            { name: 'Write', type: 'tool_use' },
            { input: { skill: 'helix' }, name: 'Skill', type: 'tool_use' },
          ],
        },
        type: 'assistant',
      },
      {
        is_error: false,
        modelUsage: {
          'claude-haiku-4-5': { inputTokens: 10, outputTokens: 5 },
          'claude-sonnet-5-5': {
            cacheCreationInputTokens: 30,
            cacheReadInputTokens: 20,
            inputTokens: 100,
            outputTokens: 40,
          },
        },
        num_turns: 3,
        result: 'done',
        subtype: 'success',
        total_cost_usd: 0.12,
        type: 'result',
      },
    ]
      .map((line) => JSON.stringify(line))
      .join('\n')
    expect(parse(stream, '', 0)).toEqual({
      cost: 0.12,
      error: null,
      tokens: { input: 160, output: 45 },
      tools: { Read: 1, 'Skill(helix)': 1, Write: 1 },
      turns: 3,
    })
  })

  test('a run that stopped says why, from the errors the result carries', () => {
    const stream = JSON.stringify({
      errors: ['Reached maximum budget'],
      is_error: true,
      num_turns: 9,
      subtype: 'error_max_budget_usd',
      total_cost_usd: 1.01,
      type: 'result',
    })
    expect(parse(stream, '', 1).error).toBe('Reached maximum budget')
  })
})

describe('OpenCode', () => {
  const { command, parse } = HARNESSES.opencode

  test('a run names its model and folder, denies the shell and the web, and links the packages', () => {
    const { args, env, files } = command(run('docs'))
    expect(args).toEqual([
      'run',
      'Build a select.',
      '--model',
      'sonnet',
      '--dir',
      '/work/runs/select',
      '--format',
      'json',
    ])
    expect(JSON.parse(env.OPENCODE_PERMISSION)).toMatchObject({
      bash: 'deny',
      webfetch: 'deny',
      websearch: 'deny',
    })
    expect(files).toEqual([{ link: '/work/node_modules', to: 'node_modules' }])
  })

  test('the mcp arm hands the server over as inline config', () => {
    const { env } = command(run('mcp'))
    expect(JSON.parse(env.OPENCODE_CONFIG_CONTENT)).toEqual({
      mcp: { helix: { command: ['/bin/helix', 'mcp'], environment: {}, type: 'local' } },
    })
  })

  test('the totals are sums over each step and each finished tool call', () => {
    const stream = [
      { part: { tool: 'read' }, type: 'tool_use' },
      {
        part: {
          cost: 0.01,
          tokens: { cache: { read: 5, write: 1 }, input: 100, output: 20, reasoning: 4 },
        },
        type: 'step_finish',
      },
      { part: { tool: 'write' }, type: 'tool_use' },
      { part: { cost: 0.02, tokens: { input: 50, output: 10 } }, type: 'step_finish' },
    ]
      .map((line) => JSON.stringify(line))
      .join('\n')
    expect(parse(stream, '', 0)).toEqual({
      cost: 0.03,
      error: null,
      tokens: { input: 156, output: 34 },
      tools: { read: 1, write: 1 },
      turns: 2,
    })
  })

  test('an error event says why the run failed', () => {
    const stream = JSON.stringify({
      error: { data: { message: 'invalid x-api-key' }, name: 'ProviderAuthError' },
      type: 'error',
    })
    expect(parse(stream, '', 1).error).toBe('invalid x-api-key')
  })
})

describe('Pi', () => {
  const { command, parse } = HARNESSES.pi

  test('a run has no shell, saves no session, and ends with the prompt', () => {
    const { args, files } = command(run('docs'))
    expect(args).toEqual([
      '--mode',
      'json',
      '--model',
      'sonnet',
      '--no-session',
      '--tools',
      'read,edit,write,grep,find,ls',
      'Build a select.',
    ])
    expect(files).toEqual([{ link: '/work/node_modules', to: 'node_modules' }])
  })

  test('the mcp arm approves the project skill and server it writes', () => {
    const { args, files } = command(run('mcp'))
    expect(args).toContain('--approve')
    expect(files.map((file) => file.to)).toEqual([
      'node_modules',
      '.agents/skills/helix/SKILL.md',
      '.pi/mcp.json',
    ])
    expect(JSON.parse(files[2].content).mcpServers.helix.exposure).toBe('direct')
  })

  test('usage comes from each assistant message once, and turns from each turn', () => {
    const reply = (usage, stopReason) => ({
      message: { role: 'assistant', stopReason, usage },
      type: 'message_end',
    })
    const stream = [
      { args: {}, toolName: 'read', type: 'tool_execution_start' },
      { message: { role: 'assistant', usage: { input: 999 } }, type: 'message_update' },
      reply({ cacheRead: 10, cost: { total: 0.004 }, input: 40, output: 8 }, 'toolUse'),
      { type: 'turn_end' },
      { args: {}, toolName: 'write', type: 'tool_execution_start' },
      reply({ cost: { total: 0.006 }, input: 50, output: 12 }, 'stop'),
      { type: 'turn_end' },
    ]
      .map((line) => JSON.stringify(line))
      .join('\n')
    expect(parse(stream, '', 0)).toEqual({
      cost: 0.01,
      error: null,
      tokens: { input: 100, output: 20 },
      tools: { read: 1, write: 1 },
      turns: 2,
    })
  })

  /* JSON mode exits 0 on a failed run, so the stop reason is the only word on it. */
  test('a run that ended in an error says so, whatever it exited with', () => {
    const stream = JSON.stringify({
      message: { errorMessage: 'No API key for provider', role: 'assistant', stopReason: 'error' },
      type: 'message_end',
    })
    expect(parse(stream, '', 0).error).toBe('No API key for provider')
  })
})

describe('Codex', () => {
  const { command, parse } = HARNESSES.codex

  test('a run writes only in its folder, with the network and web search off', () => {
    const { args, files } = command(run('docs'))
    expect(args.slice(0, 6)).toEqual([
      'exec',
      '--json',
      '--model',
      'sonnet',
      '--cd',
      '/work/runs/select',
    ])
    expect(args[args.indexOf('--sandbox') + 1]).toBe('workspace-write')
    expect(args).toContain('web_search="disabled"')
    expect(args).toContain('--ignore-user-config')
    expect(args.at(-1)).toBe('Build a select.')
    expect(files).toEqual([{ link: '/work/node_modules', to: 'node_modules' }])
  })

  test('the mcp arm sets the server for this run alone, and requires it to start', () => {
    const { args } = command(run('mcp'))
    expect(args).toContain('mcp_servers.helix.command="/bin/helix"')
    expect(args).toContain('mcp_servers.helix.args=["mcp"]')
    expect(args).toContain('mcp_servers.helix.required=true')
  })

  test('usage comes from the finished turn, and each finished item is a tool', () => {
    const stream = [
      { thread_id: 't', type: 'thread.started' },
      { item: { command: 'ls', type: 'command_execution' }, type: 'item.completed' },
      { item: { changes: [], type: 'file_change' }, type: 'item.completed' },
      {
        item: { server: 'helix', tool: 'helix_find', type: 'mcp_tool_call' },
        type: 'item.completed',
      },
      { item: { text: 'done', type: 'agent_message' }, type: 'item.completed' },
      {
        type: 'turn.completed',
        usage: { cached_input_tokens: 20, input_tokens: 120, output_tokens: 30 },
      },
    ]
      .map((line) => JSON.stringify(line))
      .join('\n')
    expect(parse(stream, '', 0)).toEqual({
      cost: null,
      error: null,
      tokens: { input: 120, output: 30 },
      tools: { edit: 1, mcp__helix__helix_find: 1, shell: 1 },
      turns: null,
    })
  })

  test('a failed turn says why', () => {
    const stream = JSON.stringify({ error: { message: 'model not found' }, type: 'turn.failed' })
    expect(parse(stream, '', 1).error).toBe('model not found')
  })
})

describe('Copilot CLI', () => {
  const { command, parse } = HARNESSES.copilot

  test('a run allows its tools, denies the shell and the web, and reaches the packages', () => {
    const { args, env } = command(run('docs'))
    expect(args.slice(0, 3)).toEqual(['-p', 'Build a select.', '--model=sonnet'])
    expect(args).toEqual(
      expect.arrayContaining([
        '--allow-all-tools',
        '--deny-tool=shell',
        '--deny-tool=url',
        '--excluded-tools=bash',
        '--excluded-tools=web_fetch',
      ]),
    )
    expect(args[args.indexOf('--add-dir') + 1]).toBe('/work/node_modules')
    expect(env.COPILOT_OTEL_FILE_EXPORTER_PATH).toStartWith('/scratch/copilot-')
  })

  test('the counts come from the spans, written either way the exporter might', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'harnesses-spec-'))
    try {
      const one = { ...run('docs'), scratch }
      const otlp = (name, attributes) => ({
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    attributes: Object.entries(attributes).map(([key, value]) => ({
                      key,
                      value:
                        typeof value === 'number' ? { intValue: value } : { stringValue: value },
                    })),
                    name,
                  },
                ],
              },
            ],
          },
        ],
      })
      writeFileSync(
        command(one).env.COPILOT_OTEL_FILE_EXPORTER_PATH,
        [
          { attributes: { 'gen_ai.tool.name': 'view' }, name: 'execute_tool view' },
          otlp('execute_tool create', { 'gen_ai.tool.name': 'create' }),
          otlp('invoke_agent', {
            'gen_ai.usage.cache_read.input_tokens': 10,
            'gen_ai.usage.input_tokens': 90,
            'gen_ai.usage.output_tokens': 25,
            'github.copilot.turn_count': 4,
          }),
        ]
          .map((line) => JSON.stringify(line))
          .join('\n'),
      )
      expect(parse('', '', 0, one)).toEqual({
        cost: null,
        error: null,
        tokens: { input: 100, output: 25 },
        tools: { create: 1, view: 1 },
        turns: 4,
      })
    } finally {
      rmSync(scratch, { force: true, recursive: true })
    }
  })
})
