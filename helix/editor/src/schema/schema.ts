import {
  type DOMOutputSpec,
  type MarkSpec,
  type Node,
  type NodeSpec,
  type ParseRule,
  Schema,
  type TagParseRule,
} from 'prosemirror-model'

/** The attribute a block's id is written to in HTML. */
export const BLOCK_ID_ATTRIBUTE = 'data-block-id'

/**
 * Whether an address may be a link's, and the address to write: a web page,
 * mail, a phone number, or a path on the page's own site. An address with no
 * scheme, such as `fusion.dev/helix`, is taken as a web page. Any other
 * scheme, `javascript:` among them, is refused with an empty string, so a
 * link pasted from elsewhere cannot run anything when the document is served.
 */
export const safeHref = (href: string): string => {
  const address = href.trim()
  if (address === '') {
    return ''
  }
  if (/^(?:https?:|mailto:|tel:)/i.test(address) || /^(?:[/#?]|\.\.?\/)/.test(address)) {
    return address
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(address)) {
    return ''
  }
  return `https://${address}`
}

/** A block's attributes in HTML: its id where it has one, and whatever the block adds. */
const blockAttributes = (node: Node, more: Record<string, string> = {}): Record<string, string> =>
  typeof node.attrs.id === 'string' && node.attrs.id !== ''
    ? { [BLOCK_ID_ATTRIBUTE]: node.attrs.id, ...more }
    : more

/** A block's id read back from HTML, or none. */
const idOf = (dom: HTMLElement): { id: string | null } => ({
  id: dom.getAttribute(BLOCK_ID_ATTRIBUTE),
})

/** The attribute every block takes: its id, kept as the document changes. */
const ID = { id: { default: null, validate: 'string|null' } }

/**
 * Helix's blocks, in the order the schema takes them: the first block is the
 * one a new document and an emptied one start with, so a paragraph leads. A
 * list of pairs, which keeps its order where an object's keys are sorted.
 */
const NODES: ReadonlyArray<[string, NodeSpec]> = [
  ['doc', { content: 'block+' }],
  [
    'paragraph',
    {
      attrs: ID,
      content: 'inline*',
      group: 'block',
      parseDOM: [{ getAttrs: idOf, tag: 'p' }],
      toDOM: (node): DOMOutputSpec => ['p', blockAttributes(node, { dir: 'auto' }), 0],
    },
  ],
  [
    'heading',
    {
      attrs: { ...ID, level: { default: 1, validate: 'number' } },
      content: 'inline*',
      defining: true,
      group: 'block',
      parseDOM: [1, 2, 3, 4, 5, 6].map(
        (level): TagParseRule => ({
          getAttrs: (dom: HTMLElement) => ({ ...idOf(dom), level }),
          tag: `h${level}`,
        }),
      ),
      toDOM: (node): DOMOutputSpec => [
        `h${node.attrs.level}`,
        blockAttributes(node, { dir: 'auto' }),
        0,
      ],
    },
  ],
  [
    'blockquote',
    {
      attrs: ID,
      content: 'block+',
      defining: true,
      group: 'block',
      parseDOM: [{ getAttrs: idOf, tag: 'blockquote' }],
      toDOM: (node): DOMOutputSpec => ['blockquote', blockAttributes(node), 0],
    },
  ],
  [
    'code_block',
    {
      attrs: { ...ID, language: { default: '', validate: 'string' } },
      code: true,
      content: 'text*',
      defining: true,
      group: 'block',
      marks: '',
      parseDOM: [
        {
          getAttrs: (dom: HTMLElement) => ({
            ...idOf(dom),
            language:
              dom.getAttribute('data-language') ??
              /\blanguage-(\S+)/.exec(dom.querySelector('code')?.className ?? '')?.[1] ??
              '',
          }),
          preserveWhitespace: 'full',
          tag: 'pre',
        },
      ],
      toDOM: (node): DOMOutputSpec => [
        'pre',
        blockAttributes(node, {
          dir: 'ltr',
          ...(node.attrs.language ? { 'data-language': node.attrs.language } : {}),
        }),
        ['code', 0],
      ],
    },
  ],
  [
    'horizontal_rule',
    {
      attrs: ID,
      group: 'block',
      parseDOM: [{ getAttrs: idOf, tag: 'hr' }],
      toDOM: (node): DOMOutputSpec => ['hr', blockAttributes(node)],
    },
  ],
  [
    'bullet_list',
    {
      attrs: ID,
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ getAttrs: idOf, tag: 'ul' }],
      toDOM: (node): DOMOutputSpec => ['ul', blockAttributes(node), 0],
    },
  ],
  [
    'ordered_list',
    {
      attrs: { ...ID, order: { default: 1, validate: 'number' } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        {
          getAttrs: (dom: HTMLElement) => ({
            ...idOf(dom),
            order: dom.hasAttribute('start') ? Number(dom.getAttribute('start')) || 1 : 1,
          }),
          tag: 'ol',
        },
      ],
      toDOM: (node): DOMOutputSpec => [
        'ol',
        blockAttributes(node, node.attrs.order === 1 ? {} : { start: String(node.attrs.order) }),
        0,
      ],
    },
  ],
  [
    'list_item',
    {
      attrs: ID,
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ getAttrs: idOf, tag: 'li' }],
      toDOM: (node): DOMOutputSpec => ['li', blockAttributes(node), 0],
    },
  ],
  ['text', { group: 'inline' }],
  [
    'hard_break',
    {
      group: 'inline',
      inline: true,
      parseDOM: [{ tag: 'br' }],
      selectable: false,
      toDOM: (): DOMOutputSpec => ['br'],
    },
  ],
]

/**
 * Helix's blocks, under ProseMirror's own names, so a document reads and
 * writes Markdown through `prosemirror-markdown` as it is.
 *
 * **Each block carries an id**, written to `data-block-id`, which comments,
 * provenance, and an agent's edits address a block by. `blockIds` keeps them
 * unique.
 *
 * **A paragraph or a heading runs in the direction its own words take**,
 * `dir="auto"`, so an Arabic paragraph in an English document runs right to
 * left. A code block runs left to right, as code does in every script.
 */
export const editorNodes: Record<string, NodeSpec> = Object.fromEntries(NODES)

/** Helix's marks, in the order they nest, a link outermost. */
const MARKS: ReadonlyArray<[string, MarkSpec]> = [
  [
    'link',
    {
      attrs: {
        href: { validate: 'string' },
        title: { default: null, validate: 'string|null' },
      },
      inclusive: false,
      parseDOM: [
        {
          getAttrs: (dom: HTMLElement) => {
            const href = safeHref(dom.getAttribute('href') ?? '')
            return href === '' ? false : { href, title: dom.getAttribute('title') }
          },
          tag: 'a[href]',
        },
      ],
      toDOM: (mark): DOMOutputSpec => [
        'a',
        mark.attrs.title
          ? { href: mark.attrs.href, title: mark.attrs.title }
          : { href: mark.attrs.href },
        0,
      ],
    },
  ],
  [
    'em',
    {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { getAttrs: (value) => value === 'italic' && null, style: 'font-style' },
      ] as ParseRule[],
      toDOM: (): DOMOutputSpec => ['em', 0],
    },
  ],
  [
    'strong',
    {
      parseDOM: [
        { tag: 'strong' },
        /* Google Docs wraps a whole paste in a `<b>` it then sets to normal weight. */
        { getAttrs: (dom: HTMLElement) => dom.style.fontWeight !== 'normal' && null, tag: 'b' },
        {
          getAttrs: (value) => /^(?:bold(?:er)?|[5-9]\d{2,})$/.test(value as string) && null,
          style: 'font-weight',
        },
      ] as ParseRule[],
      toDOM: (): DOMOutputSpec => ['strong', 0],
    },
  ],
  [
    'strike',
    {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        {
          getAttrs: (value) => (value as string).includes('line-through') && null,
          style: 'text-decoration',
        },
      ] as ParseRule[],
      toDOM: (): DOMOutputSpec => ['s', 0],
    },
  ],
  [
    'code',
    {
      code: true,
      parseDOM: [{ tag: 'code' }],
      toDOM: (): DOMOutputSpec => ['code', 0],
    },
  ],
]

/**
 * Helix's marks, under ProseMirror's names: a link, emphasis, strong text,
 * struck-through text, and inline code.
 */
export const editorMarks: Record<string, MarkSpec> = Object.fromEntries(MARKS)

/** Whether a node spec is a block, which takes an id: anything but the document, text, and inline nodes. */
const isBlock = (name: string, spec: NodeSpec, top: string): boolean =>
  name !== top && name !== 'text' && spec.inline !== true

/** The same output with an id attribute added: on the element's attributes, or as an attribute object of its own. */
const withId = (output: DOMOutputSpec, id: unknown): DOMOutputSpec => {
  if (typeof id !== 'string' || id === '') {
    return output
  }
  if (Array.isArray(output)) {
    const [tag, second, ...rest] = output as [string, ...unknown[]]
    if (second && typeof second === 'object' && !Array.isArray(second) && !('nodeType' in second)) {
      return [
        tag,
        { ...(second as Record<string, string>), [BLOCK_ID_ATTRIBUTE]: id },
        ...rest,
      ] as DOMOutputSpec
    }
    return (second === undefined
      ? [tag, { [BLOCK_ID_ATTRIBUTE]: id }]
      : [tag, { [BLOCK_ID_ATTRIBUTE]: id }, second, ...rest]) as unknown as DOMOutputSpec
  }
  const dom =
    'dom' in (output as object)
      ? (output as { dom: globalThis.Node }).dom
      : (output as globalThis.Node)
  if (dom instanceof Element) {
    dom.setAttribute(BLOCK_ID_ATTRIBUTE, id)
  }
  return output
}

/**
 * A block spec of your own that keeps an id as Helix's blocks do: the `id`
 * attribute, read from `data-block-id` and written back to it. A spec that
 * already declares `id` is returned as it is.
 */
export const withBlockId = (spec: NodeSpec): NodeSpec => {
  if (spec.attrs && 'id' in spec.attrs) {
    return spec
  }
  const toDOM = spec.toDOM
  return {
    ...spec,
    attrs: { ...spec.attrs, ...ID },
    ...(spec.parseDOM
      ? {
          parseDOM: spec.parseDOM.map((rule) =>
            'tag' in rule && rule.tag
              ? {
                  ...rule,
                  getAttrs: (dom: HTMLElement) => {
                    const attrs = rule.getAttrs ? rule.getAttrs(dom) : null
                    return attrs === false ? false : { ...(attrs ?? {}), ...idOf(dom) }
                  },
                }
              : rule,
          ),
        }
      : {}),
    ...(toDOM ? { toDOM: (node: Node) => withId(toDOM(node), node.attrs.id) } : {}),
  }
}

/** What `editorSchema` takes beyond Helix's own blocks and marks. */
export interface EditorSchemaOptions {
  /**
   * Marks of your own, added after Helix's, or one of Helix's replaced by
   * giving its name.
   */
  marks?: Record<string, MarkSpec> | undefined
  /**
   * Nodes of your own, added after Helix's, or one of Helix's replaced by
   * giving its name. A block among them takes an id as Helix's do.
   */
  nodes?: Record<string, NodeSpec> | undefined
}

/**
 * The schema of a document Helix's toolbar edits: its blocks, each with an
 * id, and its marks, with any of your own added.
 */
export const editorSchema = (options: EditorSchemaOptions = {}): Schema => {
  const nodes: Record<string, NodeSpec> = {}
  for (const [name, spec] of Object.entries({ ...editorNodes, ...options.nodes })) {
    nodes[name] = isBlock(name, spec, 'doc') ? withBlockId(spec) : spec
  }
  return new Schema({ marks: { ...editorMarks, ...options.marks }, nodes })
}
