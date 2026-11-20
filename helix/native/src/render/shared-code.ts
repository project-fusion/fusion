import type { Family } from '../style/form'
import type { Props } from './behavior'

/**
 * Warnings, in a development build, about code an app shares between the web
 * and a phone that uses what only the web has.
 *
 * **The page runs, and the console says what a phone left out**: a prop or
 * an event only the web element has, a CSS class, a `style`, and a DOM
 * element or a family a phone does not draw. `helix shared` reports the same
 * from the code, with the browser's globals and stylesheet imports as well.
 * Each warning is said once.
 */

declare const __DEV__: boolean | undefined

const said = new Set<string>()

/** Whether this is a development build: React Native's `__DEV__`. */
const developing = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__ === true

/** Says `message` once, in a development build. */
export const warnOnce = (message: string): void => {
  if (!developing() || said.has(message)) {
    return
  }
  said.add(message)
  console.warn(`Helix: ${message}`)
}

/** A name with case and hyphens taken out, so `max-items` and `maxItems` are one name. */
const key = (name: string): string => name.replaceAll('-', '').toLowerCase()

/** Where each family's web-only names are, worked out once for each form. */
const webOnly = new WeakMap<Family, ReadonlyMap<string, string>>()

/** The props and event handlers only the web element has, by [`key`], with the name the web gives each. */
const webNames = (family: Family): ReadonlyMap<string, string> => {
  const known = webOnly.get(family)
  if (known !== undefined) {
    return known
  }
  const names = new Map<string, string>()
  /* A test's form in miniature may leave its API out. */
  for (const prop of family.api?.props ?? []) {
    if (prop.platform === 'web') {
      names.set(key(prop.name), prop.name)
    }
  }
  for (const event of family.api?.events ?? []) {
    if (event.platform === 'web') {
      names.set(key(`on-${event.name}`), `helix-${event.name}`)
    }
  }
  webOnly.set(family, names)
  return names
}

/** What a phone leaves out of the props one element was given, one sentence each. */
export const sharedCodeWarnings = (family: Family, props: Props): string[] => {
  const names = webNames(family)
  const found: string[] = []
  for (const name of Object.keys(props)) {
    if (name === 'className' || name === 'class') {
      found.push(`\`${name}\` on \`${family.tag}\` names a CSS class, which a phone does not have.`)
      continue
    }
    const web = names.get(key(name))
    if (web !== undefined) {
      found.push(
        web.startsWith('helix-')
          ? `\`${family.tag}\` sends \`${web}\` on the web alone. Hear it in a \`.web.tsx\` file.`
          : `\`${web}\` on \`${family.tag}\` is the web's alone. Set it in a \`.web.tsx\` file.`,
      )
    }
  }
  return found
}

/** Warns, in a development build, about what a phone leaves out of one element's props. */
export const warnSharedCode = (family: Family, props: Props): void => {
  if (!developing()) {
    return
  }
  for (const message of sharedCodeWarnings(family, props)) {
    warnOnce(message)
  }
}

/**
 * Warns, in a development build, about a tag a phone does not draw: a DOM
 * element, or a family drawn on the web alone. A JSX runtime that draws a
 * page's tags as native components calls it for a tag it has no component
 * for.
 */
export const warnWebTag = (tag: string): void => {
  warnOnce(
    tag.startsWith('helix-')
      ? `\`<${tag}>\` is drawn on the web alone. Use it in a \`.web.tsx\` file.`
      : `\`<${tag}>\` is a DOM element, which a phone does not draw. Use a Helix element, such as \`helix-flex\` for a box or \`helix-text\` for words.`,
  )
}
