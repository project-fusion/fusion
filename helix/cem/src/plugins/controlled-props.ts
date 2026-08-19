import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/**
 * The controlled properties, and the events that answer each one.
 *
 * Keyed by the mixin that grafts the property on, because that is what the
 * manifest records in `inheritedFrom` and it cannot be confused with a
 * component's own property of the same name.
 *
 * **`active` is deliberately not here**, though it is controlled the same way.
 * It names which child is current, and that is routinely owned by something
 * outside the element: our own documentation nav derives it from the route and
 * moves it with real anchors, so the tree's change is answered by a navigation
 * rather than by a handler. Requiring one there buys a no-op that pushes the
 * same route twice. The runtime audit still covers it.
 *
 * `open` names two, and both are required where the component declares both. A
 * controlled overlay that hears one direction and not the other is half wired:
 * a dialog answering `helix-close` and not `helix-open` cannot be opened by its
 * own trigger, and one answering `helix-open` and not `helix-close` cannot be
 * dismissed with Escape. The event split is deliberate (see `events.ts`), so
 * the requirement follows it.
 */
const CONTROLLED: Record<string, { events: string[]; property: string }> = {
  MixinControllerChecked: { events: ['helix-change'], property: 'checked' },
  MixinControllerOpen: { events: ['helix-open', 'helix-close'], property: 'open' },
  MixinControllerValue: { events: ['helix-change'], property: 'value' },
}

/** `helix-change` becomes `HelixChange`, which is how the generator names its event types. */
const pascal = (name: string): string =>
  name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

interface Controlled {
  events: string[]
  property: string
}

export interface ControlledPropsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Makes a controlled property a type error unless its change is answered.
 *
 * **This is the library's most-hit trap, and it is the one thing the compiler
 * can be made to refuse.** Writing `value` on a Helix control is a claim of
 * ownership, not a seed: from the first update the element announces every
 * change and applies none of them, so a consumer who meant `default-value`
 * gets a control that ignores every keystroke. It caught six of our own
 * examples. `requestControlledChange` warns at runtime when nothing answers,
 * which is the best that can be done for a consumer writing plain HTML, and it
 * still only fires once the reader has already found the dead control.
 *
 * A generated prop type cannot say this on its own, so the tag entry is
 * intersected with a union: declare the property and the handler comes with it,
 * or leave the property out.
 *
 * ```ts
 * type HelixInputControlled =
 *   | { value: HelixInput['value']; 'onhelix-change': (event: …) => void }
 *   | { value: HelixInput['value']; ref: Ref<HelixInput> }
 *   | { value?: undefined }
 * ```
 *
 * **The middle arm is why this is a check and not a proof.** A listener bound
 * with `addEventListener` is invisible to a type, and binding one is correct:
 * the sandbox workbench answers its filter field that way, through
 * `useHelixEvent`. A ref is the only route to that call, so its presence is read
 * as the consumer saying they will handle it themselves. It is a heuristic, and
 * a consumer holding a ref for some other reason falls through to the runtime
 * audit, which is the layer that can observe that nothing answered.
 *
 * **Intersected outside the `Partial<>` the generator wraps every tag in**,
 * which is the only place it survives. `Partial` distributes across a union and
 * makes both arms optional again, so a union written inside it constrains
 * nothing at all.
 *
 * **And it works only because TypeScript is inconsistent about hyphens.** A JSX
 * attribute whose name is not a valid identifier is exempt from *excess*
 * property checking on an intrinsic element, which is why `onhelix-opne`
 * compiles clean and why `HelixElement` has to warn about it at runtime. A
 * *missing required* one is not exempt: it reports TS2741. Measured. The whole
 * mechanism rests on that gap.
 *
 * Reaches typed JSX only, so the runtime audit stays for everyone else.
 *
 * Runs after the generator, so list it after `jsxTypesPlugin`.
 */
export const controlledProps = ({
  fileName = 'jsx.d.ts',
}: ControlledPropsOptions = {}): Plugin => ({
  name: 'helix-controlled-props',
  packageLinkPhase({ customElementsManifest }) {
    const path = join(process.cwd(), fileName)

    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      // No JSX types for this package, which is normal for one shipping no
      // elements.
      return
    }

    // What each tag controls, and which of the answering events it declares.
    const controlled = new Map<string, Controlled[]>()
    const manifest = customElementsManifest as {
      modules?: {
        declarations?: {
          events?: { name: string }[]
          members?: { inheritedFrom?: { name?: string }; name?: string }[]
          tagName?: string
        }[]
      }[]
    }

    for (const module of manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        if (!declaration.tagName) {
          continue
        }
        const declared = new Set((declaration.events ?? []).map((event) => event.name))
        const found: Controlled[] = []
        for (const member of declaration.members ?? []) {
          const entry = CONTROLLED[member.inheritedFrom?.name ?? '']
          if (!entry || member.name !== entry.property) {
            continue
          }
          const events = entry.events.filter((event) => declared.has(event))
          if (events.length > 0) {
            found.push({ events, property: entry.property })
          }
        }
        if (found.length > 0) {
          controlled.set(declaration.tagName, found)
        }
      }
    }

    if (controlled.size === 0) {
      return
    }

    const unions: string[] = []
    let next = source

    for (const [tag, properties] of controlled) {
      /* The tag entry names its own props type, which is where the element's
         type name comes from. Reading it back rather than deriving it from the
         tag keeps this working whatever the generator decides to call things. */
      /* The generator wraps a long entry across lines, and most of them are
         long: 170 of the 194 tags here. Matching only the single-line form
         silently covered a fifth of the library, which is the failure mode this
         whole plugin exists to prevent. */
      const entry = new RegExp(
        `("${tag}": Partial<\\s*(\\w+)Props & BaseProps<(\\w+)> & BaseEvents\\s*>)(;)`,
      )
      const match = next.match(entry)
      if (!match) {
        continue
      }
      const [, , base, element] = match
      const name = `${base}Controlled`

      const arms = properties
        .map(({ events, property }) => {
          const handlers = events
            .map(
              (event) =>
                `        "on${event}": (event: ${base}${pascal(event)}ElementEvent) => void;`,
            )
            .join('\n')
          return [
            '    | {',
            `        /** Declared, so the consumer owns it and answers ${events.map((event) => `\`${event}\``).join(' and ')}. */`,
            `        ${property}: ${element}["${property}"];`,
            handlers,
            '      }',
            '    | {',
            `        /** Declared, and answered imperatively: a ref is the only route to \`addEventListener\`. */`,
            `        ${property}: ${element}["${property}"];`,
            `        ref: import('react').Ref<${element}>;`,
            '      }',
            `    | { ${property}?: undefined }`,
          ].join('\n')
        })
        .map((arm) => `  (\n${arm}\n  )`)
        .join(' &\n')

      unions.push(
        `/**\n * ${tag}: a controlled ${properties
          .map(({ property }) => `\`${property}\``)
          .join(
            ' or ',
          )} announces and waits, so the handler comes with it.\n */\ntype ${name} =\n${arms};`,
      )
      next = next.replace(entry, `$1 & ${name}$4`)
    }

    if (unions.length === 0) {
      return
    }

    writeFileSync(
      path,
      `${next}\n${[
        '/* Controlled properties, appended by `helix-controlled-props`.',
        '   Declaring one is a claim of ownership, so the type asks for the handler',
        "   that answers it. Intersected outside the generator's `Partial<>`, which",
        '   would otherwise make both arms optional again. */',
      ].join('\n')}\n\n${unions.join('\n\n')}\n`,
    )
  },
})
