import { noChange } from 'lit'
import { type ChildPart, Directive, directive, type PartInfo, PartType } from 'lit/directive.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { highlightedLineList } from '@fusion.dev/helix-core/code-block'

/**
 * Draws highlighted markup line by line, and on each change replaces only the
 * lines whose markup changed.
 *
 * **Why not `unsafeHTML`**, which this replaced: it rebuilds every node of the
 * block on every change, so a block that grows a line at a time, as a streamed
 * reply's does, threw away its whole drawing for each character, and a reader's
 * selection in it with the drawing. Here an unchanged line keeps its nodes. A
 * line break between lines is a text node of its own, as it was, so the shadow
 * root holds the same nodes `unsafeHTML` drew and no rule that styles them sees
 * a wrapper.
 */
class KeyedLines extends Directive {
  /** Each line's markup as drawn, and its nodes, the break before it first from the second line on. */
  private lines: Array<{ markup: string; nodes: Node[] }> = []

  constructor(info: PartInfo) {
    super(info)
    if (info.type !== PartType.CHILD) {
      throw new Error('keyedLines belongs in a child position')
    }
  }

  render(markup: string): unknown {
    return unsafeHTML(markup)
  }

  override update(part: ChildPart, [markup]: [string]): unknown {
    const parent = part.parentNode
    const document = parent.ownerDocument ?? (parent as Document)
    const end = part.endNode
    /* **Hydrating**: the part opens on a server's `lit-part` marker, it has
       no end yet, and the server drew the markup whole. Answered with the
       same, so Lit finds what it drew; the lines are keyed on the next
       update, below. A part with no end in a browser's own drawing is the
       last child of its element, and is drawn line by line at once. */
    const start = part.startNode
    if (
      end === null &&
      this.lines.length === 0 &&
      start?.nodeType === 8 &&
      (start as Comment).data.startsWith('lit-part')
    ) {
      return this.render(markup)
    }
    const next = highlightedLineList(markup)
    /* Nothing keyed yet, so whatever stands between the part's markers was
       drawn whole, by a server or by the hydration above: taken away, or the
       lines would be drawn twice. */
    if (this.lines.length === 0) {
      for (let node = start?.nextSibling; node && node !== end; ) {
        const following: ChildNode | null = node.nextSibling
        node.parentNode?.removeChild(node)
        node = following
      }
    }
    const parse = (line: string): Node[] => {
      const template = document.createElement('template')
      template.innerHTML = line
      return [...template.content.childNodes]
    }
    next.forEach((line, index) => {
      const drawn = this.lines[index]
      if (drawn?.markup === line) {
        return
      }
      const nodes = parse(line)
      if (drawn) {
        /* The break before the line stays, and only the line's own nodes change. */
        const own = index > 0 ? drawn.nodes.slice(1) : drawn.nodes
        const after = this.lines[index + 1]?.nodes[0] ?? end
        for (const node of nodes) {
          parent.insertBefore(node, after)
        }
        for (const node of own) {
          node.parentNode?.removeChild(node)
        }
        this.lines[index] = {
          markup: line,
          nodes: index > 0 ? [drawn.nodes[0] as Node, ...nodes] : nodes,
        }
        return
      }
      const all = index > 0 ? [document.createTextNode('\n'), ...nodes] : nodes
      for (const node of all) {
        parent.insertBefore(node, end)
      }
      this.lines[index] = { markup: line, nodes: all }
    })
    for (const gone of this.lines.splice(next.length)) {
      for (const node of gone.nodes) {
        node.parentNode?.removeChild(node)
      }
    }
    return noChange
  }
}

/** Highlighted markup drawn so that a change redraws only the lines it changed. */
export const keyedLines = directive(KeyedLines)
