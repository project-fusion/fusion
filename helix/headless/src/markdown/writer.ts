import { MarkdownStream } from './stream.js'
import {
  blockNode,
  type MarkdownElement,
  type MarkdownFilled,
  type MarkdownNode,
  type MarkdownOptions,
  nodeHtml,
  withDefaults,
} from './tree.js'

/** A node the writer drew, the node it was drawn from, and its children. */
interface Drawn {
  children: Drawn[]
  dom: Node
  node: MarkdownNode
}

const create = (node: MarkdownNode, document: Document): Drawn => {
  if (typeof node === 'string') {
    return { children: [], dom: document.createTextNode(node), node }
  }
  const dom = document.createElement(node.tag)
  for (const [name, value] of Object.entries(node.attributes)) {
    dom.setAttribute(name, value)
  }
  const children = node.children.map((child) => create(child, document))
  for (const child of children) {
    dom.appendChild(child.dom)
  }
  return { children, dom, node }
}

/** The drawn node changed as little as it can be to draw `next`, replacing it only where its tag changed. */
const patch = (parent: Node, drawn: Drawn, next: MarkdownNode): Drawn => {
  const previous = drawn.node
  if (previous === next) {
    return drawn
  }
  if (typeof next === 'string') {
    if (typeof previous === 'string') {
      const text = drawn.dom as Text
      /* A word arriving at the end is appended, so the characters already
         there are the same characters and a selection in them holds. */
      if (next.startsWith(previous)) {
        text.appendData(next.slice(previous.length))
      } else {
        text.data = next
      }
      return { children: [], dom: text, node: next }
    }
  } else if (typeof previous !== 'string' && previous.tag === next.tag) {
    const dom = drawn.dom as Element
    for (const name of Object.keys(previous.attributes)) {
      if (!(name in next.attributes)) {
        dom.removeAttribute(name)
      }
    }
    for (const [name, value] of Object.entries(next.attributes)) {
      if (previous.attributes[name] !== value) {
        dom.setAttribute(name, value)
      }
    }
    return { children: patchChildren(dom, drawn.children, next.children), dom, node: next }
  }
  const replacement = create(next, parent.ownerDocument ?? (parent as Document))
  parent.replaceChild(replacement.dom, drawn.dom)
  return replacement
}

const patchChildren = (parent: Node, drawn: Drawn[], next: MarkdownNode[]): Drawn[] => {
  const kept = next.map((node, index) => {
    const before = drawn[index]
    if (before) {
      return patch(parent, before, node)
    }
    const made = create(node, parent.ownerDocument ?? (parent as Document))
    parent.appendChild(made.dom)
    return made
  })
  for (const extra of drawn.slice(next.length)) {
    extra.dom.parentNode?.removeChild(extra.dom)
  }
  return kept
}

/** Reads what a server sent back into the nodes it was drawn from, where it is exactly them. */
const adopt = (dom: Node, node: MarkdownNode): Drawn => ({
  children:
    typeof node === 'string'
      ? []
      : node.children.map((child, index) => adopt(dom.childNodes[index] as Node, child)),
  dom,
  node,
})

/**
 * Draws a Markdown document into an element as its text grows.
 *
 * Each top-level block is its own subtree. A block that has closed is drawn
 * once and never touched again, and the open one is changed only where it
 * differs from what is drawn: a word arriving appends to the text node that
 * holds the line, a row arriving adds a row, and nothing above it is
 * rebuilt.
 */
export class MarkdownWriter {
  private readonly stream = new MarkdownStream()
  private drawn: Drawn[] = []
  private closed = 0
  private text = ''
  private options: MarkdownFilled

  constructor(
    private readonly host: Element,
    options: MarkdownOptions = {},
  ) {
    this.options = withDefaults(options)
  }

  /** Changes how the document is drawn, and draws it again. */
  configure(options: MarkdownOptions): void {
    this.options = withDefaults(options)
    this.closed = 0
    this.write(this.text, true)
  }

  /**
   * Draws the text so far. With `final`, the text is the whole document and
   * every block is closed.
   */
  write(text: string, final: boolean): void {
    if (!text.startsWith(this.text)) {
      this.closed = 0
    }
    this.text = text
    const read = this.stream.read(text, final)
    if (this.drawn.length === 0 && this.host.childNodes.length > 0) {
      this.take(read.blocks.map((block) => blockNode(block, false, this.options)))
    }
    const blocks = read.blocks
    const next: Drawn[] = []
    for (const [index, block] of blocks.entries()) {
      const before = this.drawn[index]
      if (before && index < this.closed) {
        next.push(before)
        continue
      }
      const node = blockNode(block, !final && index === blocks.length - 1, this.options)
      if (before) {
        next.push(patch(this.host, before, node))
      } else {
        const made = create(node, this.host.ownerDocument)
        this.host.appendChild(made.dom)
        next.push(made)
      }
    }
    for (const extra of this.drawn.slice(blocks.length)) {
      extra.dom.parentNode?.removeChild(extra.dom)
    }
    this.drawn = next
    this.closed = read.closed
  }

  /** Forgets the document, and empties the element. */
  clear(): void {
    this.stream.reset()
    this.drawn = []
    this.closed = 0
    this.text = ''
    this.host.replaceChildren()
  }

  /**
   * Takes over what a server drew, where it is exactly these nodes, and
   * otherwise clears it to draw it again.
   */
  private take(nodes: MarkdownElement[]): void {
    const children = [...this.host.childNodes]
    const served = children
      .map((child) => (child as Element).outerHTML ?? child.textContent)
      .join('')
    if (children.length === nodes.length && served === nodes.map(nodeHtml).join('')) {
      this.drawn = nodes.map((node, index) => adopt(children[index] as Node, node))
      return
    }
    this.host.replaceChildren()
  }
}
