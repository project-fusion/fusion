import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/**
 * Properties that are controlled and still take no handler in JSX.
 *
 * `active` names which child is current, and that is routinely owned by
 * something outside the element: our own documentation nav derives it from the
 * route and moves it with real anchors, so the tree's change is answered by a
 * navigation. Requiring a handler there buys a no-op that pushes the same route
 * twice. It is still `@controlled`, because it is, and the runtime audit still
 * covers it. This list is only about what the compiler insists on.
 */
const EXEMPT = new Set(['active'])

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

/*
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
 * **Which properties are controlled is read, not inferred.** The first version
 * worked it out from `inheritedFrom`, on the reasoning that a controlled
 * property comes from one of the four controller mixins. Eight did not:
 * pagination's `page` and its size `value`, toast's `open`, listbox's `filter`,
 * splitter's `position` and `collapsed`, carousel's `index`, date picker's
 * `month` are each implemented in the component. They inherit from nothing, so
 * a third of the controlled surface went unguarded while every check in the
 * repository reported success. `@controlled` on the property is the signal now,
 * and `check:controlled` holds it against the `requestControlledChange` calls.
 *
 * Runs after the generator, so list it after `jsxTypesPlugin`.
 */
/**
 * The same union, written the way Solid binds an event.
 *
 * `on:helix-input` rather than `onhelix-input`, which is Solid's syntax for an
 * arbitrary event name and what its half of the generated types already offers.
 * The escape arm reads its `ref` type off `BaseProps` rather than naming
 * React's, because this half is not React's.
 */
const solidArms = (properties: Controlled[], base: string, element: string): string =>
  properties
    .map(({ events, property }) => {
      const handlers = events
        .map(
          (event) => `        "on:${event}": (event: ${base}${pascal(event)}ElementEvent) => void;`,
        )
        .join('\n')
      return [
        '    | {',
        `        /** Declared, so the consumer owns it and answers ${events.map((event) => `\`${event}\``).join(' and ')}. */`,
        `        ${property}: ${element}["${property}"];`,
        handlers,
        '      }',
        '    | {',
        `        ${property}: ${element}["${property}"];`,
        `        ref: BaseProps<${element}>["ref"];`,
        '      }',
        `    | { ${property}?: undefined }`,
      ].join('\n')
    })
    .map((arm) => `  (\n${arm}\n  )`)
    .join(' &\n')

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
          members?: { helix?: { controlled?: string[] }; name?: string }[]
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
          const answers = member.helix?.controlled
          if (!answers || !member.name || EXEMPT.has(member.name)) {
            continue
          }
          /* Only the events this component actually declares. A property can
             name two, and a component that sends one of them should ask for
             one handler rather than for a handler that never fires. */
          const events = answers.filter((event) => declared.has(event))
          if (events.length > 0) {
            found.push({ events, property: member.name })
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
      /* And the Solid map, a separate set of tag entries with a separate props
         type and `on:` for a handler. It was left unconstrained when this was
         written, so a Solid consumer could declare ownership and answer nothing
         while a React one could not: the same trap, guarded on one side. */
      const solidEntry = new RegExp(
        `("${tag}": Partial<\\s*(\\w+)Props\\s*&\\s*\\w+SolidJsProps\\s*&\\s*BaseProps<(\\w+)>\\s*&\\s*BaseEvents\\s*>)(;)`,
      )
      const match = next.match(entry)
      if (!match) {
        continue
      }
      const [, , base, element] = match
      if (base === undefined || element === undefined) {
        continue
      }
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

      if (solidEntry.test(next)) {
        const solidName = `${base}ControlledSolidJs`
        unions.push(
          `/** ${tag}, in Solid's dialect: \`on:\` and the event name. */\ntype ${solidName} =\n${solidArms(properties, base, element)};`,
        )
        next = next.replace(solidEntry, `$1 & ${solidName}$4`)
      }
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
