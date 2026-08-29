#!/usr/bin/env node
/**
 * Checks that no class a CSS module owns is still written as a bare string.
 *
 * **A module scopes every class it defines, and a bare name then matches
 * nothing.** That is the one failure mode of moving styles into modules, and it
 * is silent: no build error, no type error, no failing test. The page simply
 * loses a rule.
 *
 * The bare name is easiest to miss inside a template literal, and a descendant
 * selector left behind in the global sheet (`.heroInstall code`, where
 * `.heroInstall` has moved) is the same fault seen from the other side.
 *
 * `:global()` names are exempt, because that is exactly what the syntax is for:
 * a rule reaching a name the module does not own.
 */
import { globSync, readFileSync } from 'node:fs'

const modules = globSync('fusion/site/app/**/*.module.css')
const owned = new Map()
for (const file of modules) {
  const text = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/:global\([^)]*\)/g, ' ')
  for (const [, name] of text.matchAll(/(?:^|[,\s>+~])\.([A-Za-z][\w-]*)/gm)) {
    if (!owned.has(name)) {
      owned.set(name, file)
    }
  }
}

const found = []
for (const file of globSync('fusion/site/**/*.tsx')) {
  if (file.includes('node_modules') || file.includes('.next')) {
    continue
  }
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const match of line.matchAll(/(?:className|class)=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const value = (match[1] ?? match[2]).replace(/\$\{[^}]*\}/g, ' ')
      for (const word of value.split(/\s+/)) {
        if (owned.has(word)) {
          found.push({ file, line: i + 1, module: owned.get(word), word })
        }
      }
    }
  })
}

if (found.length) {
  console.error(`Bare class names a module owns (${found.length}):\n`)
  for (const { file, line, word, module } of found) {
    console.error(
      `  ${file}:${line}: \`${word}\` is scoped by ${module}, so this string matches nothing.`,
    )
  }
  console.error('\nReference it through the module, or mark the rule :global() if it is shared.')
  process.exit(1)
}
console.log(`scoped: ${owned.size} module classes, every one referenced through its module`)
