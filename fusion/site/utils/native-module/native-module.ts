/**
 * Reads one module `helix system components` writes: each component it
 * declares, with its props, the props that take React nodes, and its
 * handlers, each typed and described as the module types them.
 *
 * **Read as the compiler's `emit.rs` writes it, and nothing more lenient.**
 * The reader throws on a line it does not recognize, so a change to that
 * format stops the build that reads it.
 */

/** One field of an event's `detail`. */
export interface NativeField {
  description: string
  name: string
  /** Whether the event may leave it out. */
  optional: boolean
  type: string
}

/** A handler prop, and what the event it hears carries. */
export interface NativeEvent {
  description: string
  /** The fields of `event.detail`, empty for an event that carries none. */
  detail: NativeField[]
  /** The handler, such as `onActivate`. */
  name: string
  /**
   * The fields of `event.target`: its `value`, where the element that sent the
   * event has one, and empty where it has none.
   */
  target: NativeField[]
}

/** A prop that is neither a region nor a handler. */
export interface NativeProp {
  /** Its default, as the module's `@default` writes it, where it has one. */
  default?: string
  description: string
  name: string
  type: string
}

/** A prop that takes React nodes, in the place of the web element's slot. */
export interface NativeRegion {
  description: string
  name: string
}

/** One component, named for its web element's class. */
export interface NativeComponent {
  events: NativeEvent[]
  /** Each field of its `hooks` prop: a public hook, by its name in camel case. */
  hooks: NativeField[]
  /** Its name, such as `HelixTabs`. */
  name: string
  props: NativeProp[]
  regions: NativeRegion[]
  summary: string
  /** The web element it is drawn from, such as `helix-tabs`. */
  tag: string
}

/** A member of an object type: a prop, or a field of a detail. */
interface Member {
  doc: string[]
  name: string
  optional: boolean
  type: string
}

/** An event type: the fields of its detail, and of its target. */
interface Sent {
  detail: NativeField[]
  target: NativeField[]
}

/** A component, as its declaration names it. */
interface Declared {
  constant: string
  doc: string[]
  name: string
  props: string
}

const FORM = /^const (\w+): Family = (\{.*\})$/
/* A platform's own event, as `toggle`, is a `PlatformEvent`, read as a `HelixEvent`. */
const EVENT = /^export type (\w+) = (?:Helix|Platform)Event</
const PROPS = /^export type (\w+Props) = \{$/
const HOOKS = /^export type (\w+Hooks) = (\{|Record<never, never>)$/
const COMPONENT =
  /^export const (\w+) = element\((\w+), behaviorFor\(\2\)\) as ComponentType<(\w+)>$/
const RUNTIME = /^import \{[^}]*\belement\b[^}]*\} from '([^']+)'$/
const MEMBER = /^readonly (\w+)(\?)?: (.+?);?$/
const HANDLER = /^\(event: (\w+)\) => void$/
const OPENS = new Set(['(', '<', '[', '{'])
const CLOSES = new Set([')', '>', ']', '}'])

/**
 * `text` with every comment and string literal blanked to spaces, and each
 * arrow's `>` with them, so only the brackets of the code are counted. The
 * length and the line breaks are kept, so an index into one is an index into
 * the other.
 */
const blank = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\/|'(?:[^'\\\n]|\\.)*'|=>/g, (found) => found.replace(/[^\n]/g, ' '))

/** How far a run of code opens brackets, less how far it closes them. */
const depthOf = (code: string): number =>
  [...code].reduce((depth, char) => depth + (OPENS.has(char) ? 1 : CLOSES.has(char) ? -1 : 0), 0)

/** `text` split at each comma outside every bracket. */
const topLevel = (text: string): string[] => {
  const code = blank(text)
  const parts: string[] = []
  let depth = 0
  let from = 0
  for (let at = 0; at < code.length; at += 1) {
    const char = code[at] ?? ''
    depth += OPENS.has(char) ? 1 : CLOSES.has(char) ? -1 : 0
    if (char === ',' && depth === 0) {
      parts.push(text.slice(from, at))
      from = at + 1
    }
  }
  parts.push(text.slice(from))
  return parts.map((part) => part.trim()).filter(Boolean)
}

/** The line at or after `from` that closes the doc block opening there. */
const closing = (lines: readonly string[], from: number, where: string): number => {
  for (let at = from; at < lines.length; at += 1) {
    if (lines[at]?.trim().endsWith('*/')) {
      return at
    }
  }
  throw new Error(`${where}: a doc comment at line ${from + 1} never closes`)
}

/**
 * A doc block's paragraphs, each on one line, with the escape the compiler
 * writes for a closing comment inside one undone.
 */
const paragraphsOf = (block: readonly string[]): string[] => {
  const paragraphs: string[][] = [[]]
  for (const raw of block) {
    const line = raw
      .trim()
      .replace(/^\/\*\*\s?/, '')
      .replace(/\s?\*\/$/, '')
      .replace(/^\*(?:\s|$)/, '')
      .trim()
    const open = paragraphs.at(-1) ?? []
    if (line === '') {
      if (open.length > 0) {
        paragraphs.push([])
      }
      continue
    }
    open.push(line.replaceAll('*\\/', '*/'))
  }
  return paragraphs.filter((lines) => lines.length > 0).map((lines) => lines.join(' '))
}

/** The prose of a doc block, without its tags. */
const prose = (doc: readonly string[]): string =>
  doc.filter((paragraph) => !paragraph.startsWith('@')).join(' ')

/** Each member of an object type's body. */
const membersOf = (lines: readonly string[], where: string): Member[] => {
  const members: Member[] = []
  let doc: string[] = []
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at]?.trim() ?? ''
    if (line === '') {
      continue
    }
    if (line.startsWith('/**')) {
      const end = closing(lines, at, where)
      doc = paragraphsOf(lines.slice(at, end + 1))
      at = end
      continue
    }
    const member = MEMBER.exec(line)
    if (!member?.[1] || !member[3]) {
      throw new Error(`${where}: cannot read the member \`${line}\``)
    }
    members.push({ doc, name: member[1], optional: member[2] === '?', type: member[3] })
    doc = []
  }
  return members
}

/** The members of an object type written as `{ … }`. */
const objectOf = (text: string, where: string): Member[] =>
  membersOf(text.slice(text.indexOf('{') + 1, text.lastIndexOf('}')).split('\n'), where)

/** The fields of an object type, each with its description. */
const fieldsOf = (text: string, where: string): NativeField[] =>
  objectOf(text, where).map((field) => ({
    description: prose(field.doc),
    name: field.name,
    optional: field.optional,
    type: field.type,
  }))

/** An event type's detail, from its first type argument, and its target, from its second. */
const sentOf = (text: string, where: string): Sent => {
  const name = text.includes('PlatformEvent<') ? 'PlatformEvent<' : 'HelixEvent<'
  const open = text.indexOf(name) + name.length
  const [detail = '', target] = topLevel(text.slice(open, blank(text).lastIndexOf('>')))
  if (!detail.startsWith('{') && detail !== 'Record<never, never>') {
    throw new Error(`${where}: cannot read the event detail \`${detail}\``)
  }
  return {
    detail: detail.startsWith('{') ? fieldsOf(detail, where) : [],
    target: target === undefined ? [] : fieldsOf(target, where),
  }
}

/** The line at or after `from` where the brackets opened there are closed again. */
const endOf = (code: readonly string[], from: number, where: string): number => {
  let depth = 0
  for (let at = from; at < code.length; at += 1) {
    depth += depthOf(code[at] ?? '')
    if (depth === 0) {
      return at
    }
  }
  throw new Error(`${where}: the type at line ${from + 1} never closes`)
}

/** One component, its members sorted into props, regions, and handlers, with its hooks. */
const componentOf = (
  declared: Declared,
  forms: ReadonlyMap<string, { tag: string }>,
  types: ReadonlyMap<string, Member[]>,
  events: ReadonlyMap<string, Sent>,
  where: string,
): NativeComponent => {
  const tag = forms.get(declared.constant)?.tag
  const members = types.get(declared.props)
  if (!tag || !members) {
    throw new Error(`${where}: \`${declared.name}\` names a form or a props type the module lacks`)
  }
  /* The compiler closes each component's doc by naming its element, after
     the manifest's summary. */
  if (!declared.doc.at(-1)?.includes(`\`${tag}\``)) {
    throw new Error(`${where}: the doc of \`${declared.name}\` does not end by naming \`${tag}\``)
  }
  const component: NativeComponent = {
    events: [],
    hooks: (types.get(`${declared.name}Hooks`) ?? []).map((field) => ({
      description: prose(field.doc),
      name: field.name,
      optional: field.optional,
      type: field.type,
    })),
    name: declared.name,
    props: [],
    regions: [],
    summary: declared.doc.slice(0, -1).join(' '),
    tag,
  }
  for (const member of members) {
    const description = prose(member.doc)
    const handler = HANDLER.exec(member.type)?.[1]
    if (handler) {
      const sent = events.get(handler)
      if (!sent) {
        throw new Error(`${where}: \`${member.name}\` hears \`${handler}\`, which the module lacks`)
      }
      component.events.push({
        description,
        detail: sent.detail,
        name: member.name,
        target: sent.target,
      })
    } else if (member.type === 'ReactNode') {
      component.regions.push({ description, name: member.name })
    } else {
      const fallback = member.doc.find((paragraph) => paragraph.startsWith('@default '))
      component.props.push({
        ...(fallback ? { default: fallback.slice('@default '.length) } : {}),
        description,
        name: member.name,
        type: member.type,
      })
    }
  }
  return component
}

/**
 * Every component one module declares, in its order, and the runtime it draws
 * with. `where` names the module in an error.
 */
export const readModule = (
  text: string,
  where: string,
): { components: NativeComponent[]; runtime: string } => {
  const lines = text.split('\n')
  /* A form is JSON on one line, and its strings are not code. */
  const code = blank(lines.map((line) => (FORM.test(line) ? '' : line)).join('\n')).split('\n')
  const forms = new Map<string, { tag: string }>()
  const types = new Map<string, Member[]>()
  const events = new Map<string, Sent>()
  const declared: Declared[] = []
  let runtime = ''
  let doc: string[] = []
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at] ?? ''
    if (line.trim().startsWith('/**')) {
      const end = closing(lines, at, where)
      doc = paragraphsOf(lines.slice(at, end + 1))
      at = end
      continue
    }
    const form = FORM.exec(line)
    const event = EVENT.exec(line)
    const type = PROPS.exec(line) ?? HOOKS.exec(line)
    const component = COMPONENT.exec(line)
    if (form?.[1] && form[2]) {
      forms.set(form[1], JSON.parse(form[2]) as { tag: string })
    } else if (event?.[1] || type?.[1]) {
      const end = endOf(code, at, where)
      const body = lines.slice(at, end + 1).join('\n')
      if (event?.[1]) {
        events.set(event[1], sentOf(body, where))
      } else if (type?.[1]) {
        types.set(type[1], type[2] === 'Record<never, never>' ? [] : objectOf(body, where))
      }
      at = end
    } else if (component?.[1] && component[2] && component[3]) {
      declared.push({ constant: component[2], doc, name: component[1], props: component[3] })
    } else {
      runtime = RUNTIME.exec(line)?.[1] ?? runtime
    }
    if (line.trim() !== '') {
      doc = []
    }
  }
  if (declared.length === 0 || runtime === '') {
    throw new Error(`${where}: no component, or no import of the runtime, in the module`)
  }
  return {
    components: declared.map((one) => componentOf(one, forms, types, events, where)),
    runtime,
  }
}
