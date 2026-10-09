#!/usr/bin/env node
/**
 * Writes the Claude Code plugin's skill from the guide `@fusion.dev/helix`
 * ships, so the two say the same thing.
 *
 * **Committed, unlike the package's copy**, because a plugin is installed from
 * this repository as it stands and nothing builds it on the way. So it is
 * written here and held by `--check`, the way every committed generated file
 * is.
 *
 * **Without a version.** The package's copy names the release it shipped in,
 * and the plugin's follows the repository: it says where the copy matching a
 * project's own install is, and a release changes it only when the guide
 * changes.
 *
 * **And holds the plugin's files to each other.** Each harness reads one
 * manifest and one MCP file of its own: the portable `plugin.json` and
 * `mcp.json`, Claude Code's `.claude-plugin/plugin.json` and `.mcp.json`, and
 * Cursor's `.cursor-plugin/plugin.json`. They describe one plugin, so `--check`
 * fails where any of them disagrees with the portable pair.
 *
 *   bun fusion/scripts/build-plugin.mjs          # write it
 *   bun fusion/scripts/build-plugin.mjs --check  # fail where it is stale
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

const source = join(root, 'helix/styled/skills/helix/SKILL.md')
const target = join(root, 'helix/plugin/skills/helix/SKILL.md')

if (!existsSync(source)) {
  console.error(
    'build-plugin: no packaged guide. Run `turbo run analyze --filter=@fusion.dev/helix` first.',
  )
  process.exit(1)
}

const packaged = readFileSync(source, 'utf8')
const written = packaged
  .replace(/^metadata:\n {2}version: "[^"]*"\n/m, '')
  .replace(
    /^This guide is for @fusion\.dev\/helix [^,]+, the version installed beside it\.$/m,
    'This guide follows the latest release of Helix. A project that installed Helix has the copy for its own version at `node_modules/@fusion.dev/helix/skills/helix/SKILL.md`, and where the two differ, that copy is right.',
  )
if (written === packaged) {
  console.error(
    'build-plugin: the packaged guide no longer has the lines this rewrites. Update this script.',
  )
  process.exit(1)
}

/** What every manifest says the same way, and what every MCP file runs. */
const read = (path) => JSON.parse(readFileSync(join(root, 'helix/plugin', path), 'utf8'))
const shared = ({ $schema, ...rest }) => JSON.stringify(rest)
const servers = (file) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(file.mcpServers).map(([name, { args, command }]) => [name, { args, command }]),
    ),
  )
const disagreeing = [
  ...['.claude-plugin/plugin.json', '.cursor-plugin/plugin.json']
    .filter((path) => shared(read(path)) !== shared(read('plugin.json')))
    .map((path) => `helix/plugin/${path} says something helix/plugin/plugin.json does not`),
  ...(servers(read('.mcp.json')) === servers(read('mcp.json'))
    ? []
    : ['helix/plugin/.mcp.json runs a server helix/plugin/mcp.json does not']),
]

if (process.argv.includes('--check')) {
  if (disagreeing.length > 0) {
    console.error(`build-plugin: ${disagreeing.join('; ')}.`)
    process.exit(1)
  }
  const committed = existsSync(target) ? readFileSync(target, 'utf8') : ''
  if (committed !== written) {
    console.error(
      'build-plugin: helix/plugin/skills/helix/SKILL.md is stale. Run `bun fusion/scripts/build-plugin.mjs`.',
    )
    process.exit(1)
  }
} else {
  writeFileSync(target, written)
}
