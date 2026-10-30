import type { Documented, HelixAttribute, HelixDeclaration, HelixManifest } from '../types.js'

/* What the JSX and Vue typings both read off the manifest, one element at a time.

   **Each framework's file is a template over this**, so what they agree on is
   written once. An attribute and its property, what each is typed as, and the
   handler type each event takes are facts about the element, and the frameworks
   differ only in how they spell them. */

/** A prop a tag takes: an attribute, its property, or both. */
export interface Prop {
  /** The attribute, where the prop has one. */
  attribute?: string
  /** The prop's description, with its deprecation first. */
  doc: string
  /** Whether Solid writes the attribute as `bool:` rather than `attr:`. */
  boolean: boolean
  /**
   * Whether the attribute spells a number and is not named as its property, so
   * it takes the string form as well.
   */
  numeric: boolean
  /** The property, where the attribute names one. */
  property?: string
  /** The prop's type, without `undefined`. */
  type: string
}

/** An event an element sends. */
export interface EventEntry {
  /** The alias for this event's type, where it has a type of its own. */
  alias?: { name: string; type: string }
  doc: string
  /** The type a handler takes. */
  handler: string
  name: string
}

/** One custom element, as the typings need it. */
export interface Element {
  declaration: HelixDeclaration
  events: EventEntry[]
  name: string
  props: Prop[]
  tagName: string
}

/** A doc comment's text, with nothing that would close the comment early. */
export const safe = (text: string): string => text.replaceAll('*/', '*\\/')

/**
 * A one-line doc comment, or nothing where there is no text. An empty one
 * would show as an empty hover.
 */
export const comment = (text: string, indent: string): string =>
  text === '' ? '' : `${indent}/** ${safe(text)} */\n`

/**
 * A description's first paragraph on one line, which is what a hover over a
 * list can afford. The prop it describes carries the rest.
 */
export const lead = (description: string | undefined): string =>
  (description ?? '')
    .split(/\n\s*\n/)[0]
    ?.replace(/\s*\n\s*/g, ' ')
    .trim() ?? ''

/** A description with its deprecation first, where it has one. */
export const described = ({ deprecated, description }: Documented): string => {
  if (!deprecated) {
    return description ?? ''
  }
  const rest = description ? ` - ${description}` : ''
  return `@deprecated${typeof deprecated === 'string' ? ` ${deprecated}` : ''}${rest}`
}

/** `before-check` to `BeforeCheck`, for the name of an event's alias. */
const pascal = (name: string): string =>
  name
    .split(/[-_\s]+/)
    .filter((word) => word !== '')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('')

/** The string spelling of a number, which is what an attribute carries. */
export const NUMERIC_STRING = `\`\${number}\``

/** A string literal in a declared type, whichever quote it was written with. */
const LITERAL = /^'[^']*'$|^"[^"]*"$/

/**
 * Whether a type is `number`, allowing for the `| undefined` an optional one
 * carries and for the keywords a count can be asked for instead of a count.
 *
 * **A keyword beside a number is still an attribute carrying a number's
 * spelling.** `per-view` takes a count or `auto`, and typed `number | 'auto'`
 * alone it refused `per-view="3"`, which is what every example in this
 * repository writes and what the converter exists to read. The keywords are
 * already in the type, so widening adds the numeric string and takes nothing
 * away: `per-view="auto"` still passes and `per-view="abc"` still does not.
 */
export const isNumeric = (type: string): boolean => {
  const parts = type.split('|').map((part) => part.trim())
  return (
    parts.includes('number') &&
    parts.every((part) => part === 'number' || part === 'undefined' || LITERAL.test(part))
  )
}

/**
 * An attribute that names no field, as markup can write it: without `null` and
 * `undefined`, or `string` where nothing is left.
 *
 * **An attribute whose field is protected, private or `@internal` names no
 * field**, so its type cannot be read off the class. `aria-label` on every
 * field is one: `MixinField` observes it through the protected `namedBy`. The
 * type is the attribute's own, without the `null` the field starts as, because
 * markup writes an attribute or leaves it out. An attribute recorded with no
 * type is a string, which is what markup carries.
 *
 * A type with brackets in it is kept whole, since a `|` inside one is not a
 * member of the outer union.
 */
export const asWritten = (type: string): string => {
  if (/[()<>[\]{}]/.test(type)) {
    return type
  }
  const kept = type
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== 'null' && part !== 'undefined')
  return kept.length > 0 ? kept.join(' | ') : 'string'
}

/** Whether a member is a field a consumer can set on the element. */
const settable = (member: NonNullable<HelixDeclaration['members']>[number]): boolean =>
  member.kind === 'field' &&
  member.privacy !== 'private' &&
  member.privacy !== 'protected' &&
  !member.static &&
  !member.name.startsWith('#')

/**
 * Every prop of an element: its attributes, each with the property it names,
 * then the settable properties no attribute names. A getter is left out, since
 * a prop assigns.
 *
 * **Typed as the class's own field, `HelixPagination["defaultPage"]`**, so a
 * prop cannot drift from the property it sets and the file needs no import
 * beyond the class. An attribute that names no field has only its own type.
 */
const propsOf = (declaration: HelixDeclaration, name: string): Prop[] => {
  const members = declaration.members ?? []
  const fields = new Map(members.filter(settable).map((member) => [member.name, member]))
  const declared = new Map(members.map((member) => [member.name, member.type?.text]))
  const fromAttribute = (attribute: HelixAttribute): Prop => {
    const { fieldName, name: attributeName } = attribute
    const field = fieldName === undefined ? undefined : fields.get(fieldName)
    const text = field?.type?.text ?? attribute.type?.text ?? ''
    const declaredType = (fieldName && declared.get(fieldName)) || attribute.type?.text
    return {
      attribute: attributeName,
      boolean: text.includes('boolean'),
      doc: described(attribute),
      numeric: Boolean(
        fieldName &&
          fieldName !== attributeName &&
          declaredType !== undefined &&
          isNumeric(declaredType),
      ),
      ...(fieldName ? { property: fieldName } : {}),
      type: fieldName ? `${name}["${fieldName}"]` : asWritten(attribute.type?.text ?? ''),
    }
  }
  const attributes = (declaration.attributes ?? []).map(fromAttribute)
  const named = new Set(attributes.map((prop) => prop.property))
  const properties = [...fields.values()]
    .filter((member) => !named.has(member.name) && !member.readonly)
    .map(
      (member): Prop => ({
        boolean: false,
        doc: described(member),
        numeric: false,
        property: member.name,
        type: `${name}["${member.name}"]`,
      }),
    )
  return [...attributes, ...properties]
}

/**
 * Every event of an element, once each, with the type its handler takes.
 *
 * **`event.target` typed as the element.** An event with a type of its own gets
 * an alias, `HelixSwitchHelixBeforeCheckElementEvent`, which a handler written
 * apart from its tag imports by name. An event that is only an `Event` takes
 * the element's own alias.
 */
const eventsOf = (declaration: HelixDeclaration, name: string): EventEntry[] => {
  const seen = new Map<string, EventEntry>()
  for (const event of declaration.events ?? []) {
    if (!event.name || seen.has(event.name)) {
      continue
    }
    const text = event.type?.text
    const own = text !== undefined && text !== 'Event' && text !== 'CustomEvent'
    const alias = own
      ? {
          name: `${name}${pascal(event.name)}ElementEvent`,
          type: text.startsWith('{') ? `CustomEvent<${text}>` : text,
        }
      : undefined
    seen.set(event.name, {
      ...(alias ? { alias } : {}),
      doc: described(event),
      handler: alias?.name ?? `${name}ElementEvent`,
      name: event.name,
    })
  }
  return [...seen.values()]
}

/** Every custom element a manifest declares, in the order it declares them. */
export const elementsOf = (manifest: HelixManifest): Element[] =>
  (manifest.modules ?? []).flatMap((unit) =>
    (unit.declarations ?? []).flatMap((declaration) => {
      const { customElement, name, tagName } = declaration
      return customElement && name && tagName
        ? [
            {
              declaration,
              events: eventsOf(declaration, name),
              name,
              props: propsOf(declaration, name),
              tagName,
            },
          ]
        : []
    }),
  )

/** A platform event class, which every consumer has from lib.dom and nobody imports. */
export const PLATFORM = /^(?!Helix)[A-Z][A-Za-z]*Event$/

/**
 * The names a typings file imports from its package: every element class, and
 * every event class an element sends.
 *
 * A file imports what it uses and nothing else, because a name the package does
 * not export is an error for any consumer with `skipLibCheck` off.
 */
export const importsOf = (elements: Element[]): string[] => {
  const names = new Set<string>()
  for (const { events, name } of elements) {
    names.add(name)
    for (const { alias } of events) {
      for (const [found] of alias?.type.matchAll(/\bHelix[A-Za-z0-9]*\b/g) ?? []) {
        names.add(found)
      }
    }
  }
  return [...names].sort()
}

/** The `import type` line for those names. */
export const importLine = (elements: Element[], packageName: string): string =>
  `import type { ${importsOf(elements).join(', ')} } from "${packageName}";\n`

/**
 * The alias of each event an element sends, and of the element's events
 * together, which is what a handler written apart from its tag imports. An
 * element that sends none has none.
 */
export const eventAliases = ({ events, name }: Element): string =>
  events.length === 0
    ? ''
    : [
        `/** \`${name}\` component event */`,
        `export type ${name}ElementEvent<E = Event> = TypedEvent<${name}, E>;`,
        ...events.flatMap(({ alias, name: event }) =>
          alias
            ? [
                `/** \`${event}\` event type */`,
                `export type ${alias.name} = ${name}ElementEvent<${alias.type}>;`,
              ]
            : [],
        ),
        '',
      ].join('\n')

/** `TypedEvent`, which every alias above is written in. */
export const TYPED_EVENT = `/**
 * A generic type for strongly typing events with their targets.
 * @template T - The type of the event target
 * @template E - The type of the event
 */
type TypedEvent<T extends EventTarget, E = Event> = E & {
  target: T;
};
`

/**
 * Every custom property the package's elements publish, once each, as
 * `CSSProperties` takes it. Each framework's own `style` then accepts them.
 */
export const customCssProperties = (elements: Element[]): string => {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const { declaration } of elements) {
    for (const property of declaration.cssProperties ?? []) {
      if (!seen.has(property.name)) {
        seen.add(property.name)
        lines.push(
          `${comment(described(property), '  ')}  "${property.name}"?: string | undefined;`,
        )
      }
    }
  }
  return `export type CustomCssProperties = {\n${lines.join('\n')}\n};\n`
}

/** Text as a block comment holds it. */
const inBlock = (text: string, indent: string): string =>
  safe(text)
    .split('\n')
    .map((line) => `${indent} * ${line}`.trimEnd())
    .join('\n')

/** A block comment holding text, or nothing where there is none. */
const docBlock = (text: string, indent: string): string =>
  text === '' ? '' : `${indent}/**\n${inBlock(text, indent)}\n${indent} */\n`

/** A section of a tag's doc: a heading, and a line per entry. */
const section = (heading: string, lines: string[]): string =>
  lines.length === 0 ? '' : `\n\n## ${heading}\n\n${lines.join('\n')}`

/** A list entry: its name, and its description's first paragraph. */
const listed = (name: string, description: string | undefined): string => {
  const text = lead(description)
  return text === '' ? `- \`${name}\`` : `- \`${name}\`: ${text}`
}

/**
 * The doc comment a hover over a tag shows: the element's description, then its
 * API as a list of names.
 *
 * **A list entry says one paragraph**, because a hover on the prop itself says
 * the whole description. Every description in full on the tag was two megabytes
 * of the styled tier's file.
 */
export const tagDoc = ({ declaration, props }: Element, indent: string): string => {
  const members = declaration.members ?? []
  const propLines = props.map((prop) => {
    const { attribute, property } = prop
    const title =
      attribute && property && attribute !== property
        ? `${attribute}\`/\`${property}`
        : (property ?? attribute ?? '')
    const only = attribute === undefined ? ' (property only)' : ''
    const text = lead(prop.doc)
    return `- \`${title}\`${text === '' ? '' : `: ${text}`}${only}`
  })
  const methods = members
    .filter(
      (member) =>
        member.kind === 'method' &&
        member.privacy !== 'private' &&
        member.privacy !== 'protected' &&
        !member.name.startsWith('#'),
    )
    .map((member) => {
      const parameters = (member.parameters ?? [])
        .map(({ name: parameter, type }) => `${parameter}${type?.text ? `: ${type.text}` : ''}`)
        .join(', ')
      return listed(
        `${member.name}(${parameters}) => ${member.return?.type?.text ?? 'void'}`,
        member.description,
      )
    })
  const text = [
    described(declaration),
    section('Attributes & Properties', propLines),
    section(
      'Events',
      (declaration.events ?? []).map((event) => listed(event.name, event.description)),
    ),
    section(
      'Slots',
      (declaration.slots ?? []).map((slot) => listed(slot.name || '(default)', slot.description)),
    ),
    section('Methods', methods),
    section(
      'CSS Custom Properties',
      (declaration.cssProperties ?? []).map((property) =>
        listed(property.name, property.description),
      ),
    ),
    section(
      'CSS Parts',
      (declaration.cssParts ?? []).map((part) => listed(part.name, part.description)),
    ),
    section(
      'CSS States',
      (declaration.cssStates ?? []).map((state) => listed(state.name, state.description)),
    ),
  ]
    .join('')
    .trim()
  return docBlock(text, indent)
}

/**
 * The doc comment a hover over a tag shows in Vue, which is the element's
 * description. Volar lists its props and events itself.
 */
export const descriptionDoc = ({ declaration }: Element, indent: string): string =>
  docBlock(described(declaration).trim(), indent)
