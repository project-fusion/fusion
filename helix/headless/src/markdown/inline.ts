/**
 * Markdown's inline marks: code, emphasis, strong, strikethrough, links,
 * images, autolinks, and line breaks, by CommonMark's delimiter rules and
 * GitHub's extensions.
 *
 * **An open block is read as if it ended where the text so far ends.** While a
 * reply streams, the last block is still arriving, and reading `**bold` as
 * two asterisks would draw them and then take them back when the closing pair
 * arrives, moving every word after them. So in an open block:
 *
 * - an opening delimiter with no closer yet is drawn as if it closed at the end,
 * - a delimiter run, a backslash, a `!`, or part of an entity or an autolink at
 *   the very end is held back, since the next character decides what it is,
 * - a code span with no closing backticks yet runs to the end,
 * - a link whose `]` or `)` has not arrived drops its brackets and its address
 *   and draws its text as a link with no address yet.
 *
 * Once a block closes it is read strictly, so a mark that never closed is
 * drawn as the characters it is. That is the one change a closed block can
 * see, and only text that was never valid Markdown makes it.
 */

/** An inline node. */
export type MarkdownInline =
  | { kind: 'break' }
  | { kind: 'code'; text: string }
  | { children: MarkdownInline[]; kind: 'del' | 'em' | 'strong' }
  | { alt: string; kind: 'image'; src: string; title?: string }
  | { children: MarkdownInline[]; href?: string; kind: 'link'; title?: string }
  | { kind: 'text'; text: string }

/** How the text is read: strictly, or as the open end of a block still arriving. */
export interface InlineOptions {
  open?: boolean | undefined
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  larr: '←',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '\u2014',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rarr: '→',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  times: '×',
  trade: '™',
}

const PUNCTUATION = /[\p{P}\p{S}]/u
const WHITESPACE = /\s/u
const ESCAPABLE = /[!-/:-@[-`{-~]/
const AUTOLINK =
  /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*|[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/
const ENTITY = /^&(?:#[xX]([0-9a-fA-F]{1,6})|#([0-9]{1,7})|([A-Za-z][A-Za-z0-9]{1,31}));/
/** What may still become an entity or an autolink, at the end of an open block. */
const PENDING_ENTITY = /^&#?[A-Za-z0-9]{0,31}$/
const PENDING_AUTOLINK = /^<[A-Za-z][A-Za-z0-9+.-]{0,31}(?::[^\s<>]*)?$/

/** A node of the working list, and the delimiter run or bracket it may be. */
interface Token {
  bracket?: { active: boolean; image: boolean }
  delimiter?: Delimiter
  node: MarkdownInline
}

interface Delimiter {
  canClose: boolean
  canOpen: boolean
  character: string
  count: number
  original: number
}

/** The characters a destination or title ends at, read from `at`; `undefined` where none closes it. */
const readDestination = (
  text: string,
  at: number,
): { end: number; href: string; title?: string } | undefined => {
  let index = at
  const skip = (): void => {
    while (index < text.length && /[ \t\n]/.test(text[index] ?? '')) {
      index += 1
    }
  }
  skip()
  let href = ''
  if (text[index] === '<') {
    const close = text.indexOf('>', index + 1)
    if (close < 0 || /[\n<]/.test(text.slice(index + 1, close))) {
      return undefined
    }
    href = text.slice(index + 1, close)
    index = close + 1
  } else {
    let depth = 0
    const begin = index
    while (index < text.length) {
      const character = text[index] ?? ''
      if (character === '\\' && ESCAPABLE.test(text[index + 1] ?? '')) {
        index += 2
        continue
      }
      if (/[\s]/.test(character)) {
        break
      }
      if (character === '(') {
        depth += 1
      } else if (character === ')') {
        if (depth === 0) {
          break
        }
        depth -= 1
      }
      index += 1
    }
    href = text.slice(begin, index).replace(/\\([!-/:-@[-`{-~])/g, '$1')
  }
  skip()
  let title: string | undefined
  const quote = text[index]
  if (quote === '"' || quote === "'" || quote === '(') {
    const closer = quote === '(' ? ')' : quote
    let end = index + 1
    while (end < text.length && text[end] !== closer) {
      end += text[end] === '\\' ? 2 : 1
    }
    if (end >= text.length) {
      return undefined
    }
    title = text.slice(index + 1, end).replace(/\\([!-/:-@[-`{-~])/g, '$1')
    index = end + 1
    skip()
  }
  if (text[index] !== ')') {
    return undefined
  }
  return title === undefined ? { end: index + 1, href } : { end: index + 1, href, title }
}

/** Adjacent text nodes joined, so a run of plain words is one node. */
const merge = (nodes: MarkdownInline[]): MarkdownInline[] => {
  const merged: MarkdownInline[] = []
  for (const node of nodes) {
    const last = merged.at(-1)
    if (node.kind === 'text' && last?.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', text: last.text + node.text }
    } else if (node.kind !== 'text' || node.text !== '') {
      merged.push(node)
    }
  }
  return merged
}

/** Matches openers to closers in `tokens[from..]`, CommonMark's "process emphasis". */
const processEmphasis = (tokens: Token[], from: number): void => {
  let closerAt = from
  while (closerAt < tokens.length) {
    const closer = tokens[closerAt]?.delimiter
    if (!closer?.canClose || closer.count === 0) {
      closerAt += 1
      continue
    }
    let openerAt = closerAt - 1
    let found = false
    while (openerAt >= from) {
      const opener = tokens[openerAt]?.delimiter
      if (
        opener?.canOpen &&
        opener.count > 0 &&
        opener.character === closer.character &&
        (closer.character === '~'
          ? opener.count === closer.count
          : !(
              (opener.canClose || closer.canOpen) &&
              (opener.original + closer.original) % 3 === 0 &&
              !(opener.original % 3 === 0 && closer.original % 3 === 0)
            ))
      ) {
        found = true
        break
      }
      openerAt -= 1
    }
    if (!found) {
      closerAt += 1
      continue
    }
    const opener = tokens[openerAt]?.delimiter as Delimiter
    const used =
      closer.character === '~' ? closer.count : opener.count >= 2 && closer.count >= 2 ? 2 : 1
    const inside = tokens.splice(openerAt + 1, closerAt - openerAt - 1)
    const kind = closer.character === '~' ? 'del' : used === 2 ? 'strong' : 'em'
    const wrapped: Token = { node: { children: merge(inside.map((token) => token.node)), kind } }
    tokens.splice(openerAt + 1, 0, wrapped)
    closerAt = openerAt + 2
    opener.count -= used
    closer.count -= used
    const openerToken = tokens[openerAt] as Token
    openerToken.node = { kind: 'text', text: opener.character.repeat(opener.count) }
    const closerToken = tokens[closerAt] as Token
    closerToken.node = { kind: 'text', text: closer.character.repeat(closer.count) }
    if (opener.count === 0) {
      delete openerToken.delimiter
    }
    if (closer.count === 0) {
      delete closerToken.delimiter
      closerAt += 1
    }
  }
}

/** Whether a delimiter run can open and close, from the characters either side of it. */
const flanking = (
  before: string,
  after: string,
  character: string,
): Pick<Delimiter, 'canClose' | 'canOpen'> => {
  const beforeSpace = before === '' || WHITESPACE.test(before)
  const afterSpace = after === '' || WHITESPACE.test(after)
  const beforePunctuation = PUNCTUATION.test(before)
  const afterPunctuation = PUNCTUATION.test(after)
  const left = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation)
  const right = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation)
  if (character === '_') {
    return {
      canClose: right && (!left || afterPunctuation),
      canOpen: left && (!right || beforePunctuation),
    }
  }
  return { canClose: right, canOpen: left }
}

/** A trailing URL's characters that GitHub leaves outside its autolink. */
const trimUrl = (url: string): string => {
  let end = url.length
  while (end > 0 && /[?!.,:*_~'"]/.test(url[end - 1] ?? '')) {
    end -= 1
  }
  let trimmed = url.slice(0, end)
  while (trimmed.endsWith(')')) {
    const opens = trimmed.split('(').length - 1
    const closes = trimmed.split(')').length - 1
    if (closes <= opens) {
      break
    }
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed
}

const BARE_URL = /(?:https?:\/\/|www\.)[^\s<]+/g

/** A text node's bare URLs as links, as GitHub draws them. */
const bareLinks = (nodes: MarkdownInline[]): MarkdownInline[] =>
  nodes.flatMap((node): MarkdownInline[] => {
    if (node.kind === 'link') {
      return [node]
    }
    if (node.kind === 'em' || node.kind === 'strong' || node.kind === 'del') {
      return [{ ...node, children: bareLinks(node.children) }]
    }
    if (node.kind !== 'text' || !/https?:\/\/|www\./.test(node.text)) {
      return [node]
    }
    const out: MarkdownInline[] = []
    let last = 0
    for (const match of node.text.matchAll(BARE_URL)) {
      const before = node.text[match.index - 1]
      if (match.index > 0 && before !== undefined && !/[\s*_~(]/.test(before)) {
        continue
      }
      const url = trimUrl(match[0])
      if (url === '' || (url.startsWith('www.') && !/^www\.[^.]+\./.test(`${url}.`))) {
        continue
      }
      out.push({ kind: 'text', text: node.text.slice(last, match.index) })
      out.push({
        children: [{ kind: 'text', text: url }],
        href: url.startsWith('www.') ? `http://${url}` : url,
        kind: 'link',
      })
      last = match.index + url.length
    }
    out.push({ kind: 'text', text: node.text.slice(last) })
    return merge(out)
  })

/**
 * The text's inline nodes.
 *
 * With `open`, the end of the text is read as the end of a block still
 * arriving, as the module's description sets out.
 */
export const parseInline = (text: string, options: InlineOptions = {}): MarkdownInline[] => {
  const open = options.open === true
  const tokens: Token[] = []
  let plain = ''
  const flush = (): void => {
    if (plain !== '') {
      tokens.push({ node: { kind: 'text', text: plain } })
      plain = ''
    }
  }
  let at = 0
  while (at < text.length) {
    const character = text[at] ?? ''
    const rest = text.slice(at)
    if (character === '\\') {
      const next = text[at + 1]
      if (next === '\n') {
        flush()
        tokens.push({ node: { kind: 'break' } })
        at += 2
        continue
      }
      if (next !== undefined && ESCAPABLE.test(next)) {
        plain += next
        at += 2
        continue
      }
      if (next === undefined && open) {
        break
      }
      plain += character
      at += 1
      continue
    }
    if (character === '`') {
      const run = /^`+/.exec(rest)?.[0] ?? '`'
      const closer = new RegExp(`(?<!\`)${run}(?!\`)`, 'g')
      closer.lastIndex = at + run.length
      const match = closer.exec(text)
      if (match) {
        flush()
        let code = text.slice(at + run.length, match.index).replace(/\n/g, ' ')
        if (/^ .*[^ ].* $/.test(code) || /^ [^ ]+ $/.test(code)) {
          code = code.slice(1, -1)
        }
        tokens.push({ node: { kind: 'code', text: code } })
        at = match.index + run.length
        continue
      }
      if (open && at + run.length >= text.length) {
        break
      }
      if (open) {
        flush()
        tokens.push({
          node: { kind: 'code', text: text.slice(at + run.length).replace(/\n/g, ' ') },
        })
        at = text.length
        continue
      }
      plain += run
      at += run.length
      continue
    }
    if (character === '&') {
      const match = ENTITY.exec(rest)
      if (match) {
        const [whole, hex, decimal, name] = match
        const point = hex ? Number.parseInt(hex, 16) : decimal ? Number(decimal) : undefined
        const decoded =
          point !== undefined
            ? String.fromCodePoint(point > 0x10ffff || point === 0 ? 0xfffd : point)
            : ENTITIES[name ?? '']
        if (decoded !== undefined) {
          plain += decoded
          at += whole.length
          continue
        }
      }
      if (open && PENDING_ENTITY.test(rest)) {
        break
      }
      plain += character
      at += 1
      continue
    }
    if (character === '<') {
      const match = AUTOLINK.exec(rest)
      if (match) {
        flush()
        const target = match[1] ?? ''
        const href = target.includes(':') ? target : `mailto:${target}`
        tokens.push({ node: { children: [{ kind: 'text', text: target }], href, kind: 'link' } })
        at += match[0].length
        continue
      }
      if (open && PENDING_AUTOLINK.test(rest)) {
        break
      }
      plain += character
      at += 1
      continue
    }
    if (character === '*' || character === '_' || character === '~') {
      const run = new RegExp(`^\\${character}+`).exec(rest)?.[0] ?? character
      const after = text[at + run.length] ?? ''
      if (open && after === '') {
        break
      }
      if (character === '~' && run.length > 2) {
        plain += run
        at += run.length
        continue
      }
      flush()
      const sides = flanking(text[at - 1] ?? '', after, character)
      tokens.push({
        delimiter: { ...sides, character, count: run.length, original: run.length },
        node: { kind: 'text', text: run },
      })
      at += run.length
      continue
    }
    if (character === '!' && text[at + 1] === '[') {
      flush()
      tokens.push({ bracket: { active: true, image: true }, node: { kind: 'text', text: '![' } })
      at += 2
      continue
    }
    if (character === '!' && open && at + 1 >= text.length) {
      break
    }
    if (character === '[') {
      flush()
      tokens.push({ bracket: { active: true, image: false }, node: { kind: 'text', text: '[' } })
      at += 1
      continue
    }
    if (character === ']') {
      flush()
      let openerAt = tokens.length - 1
      while (openerAt >= 0 && !tokens[openerAt]?.bracket) {
        openerAt -= 1
      }
      const opener = tokens[openerAt]
      if (!opener?.bracket) {
        plain += ']'
        at += 1
        continue
      }
      if (!opener.bracket.active) {
        tokens.splice(openerAt, 1, { node: opener.node })
        plain += ']'
        at += 1
        continue
      }
      const destination = text[at + 1] === '(' ? readDestination(text, at + 2) : undefined
      /* The rest of a link that has not arrived: the `]` at the end, or a `(`
         whose `)` has not come yet. */
      const pending =
        open && destination === undefined && (at + 1 >= text.length || text[at + 1] === '(')
      if (!destination && !pending) {
        tokens.splice(openerAt, 1, { node: opener.node })
        plain += ']'
        at += 1
        continue
      }
      processEmphasis(tokens, openerAt + 1)
      const inside = tokens.splice(openerAt + 1).map((token) => token.node)
      tokens.pop()
      if (opener.bracket.image) {
        const alt = textOf(inside)
        tokens.push({
          node: destination
            ? {
                alt,
                kind: 'image',
                src: destination.href,
                ...(destination.title === undefined ? {} : { title: destination.title }),
              }
            : { children: [{ kind: 'text', text: alt }], kind: 'link' },
        })
      } else {
        tokens.push({
          node: {
            children: merge(inside),
            kind: 'link',
            ...(destination ? { href: destination.href } : {}),
            ...(destination?.title === undefined ? {} : { title: destination.title }),
          },
        })
        /* A link holds no link, so the brackets before it can no longer open one. */
        for (const token of tokens) {
          if (token.bracket && !token.bracket.image) {
            token.bracket.active = false
          }
        }
      }
      if (!destination) {
        at = text.length
        continue
      }
      at = destination.end
      continue
    }
    if (character === '\n') {
      /* Two spaces or more before a line break make it a hard one. */
      const hard = / {2,}$/.test(plain)
      plain = plain.replace(/ +$/, '')
      flush()
      tokens.push({ node: hard ? { kind: 'break' } : { kind: 'text', text: '\n' } })
      at += 1
      while (text[at] === ' ' || text[at] === '\t') {
        at += 1
      }
      continue
    }
    plain += character
    at += 1
  }
  flush()
  processEmphasis(tokens, 0)
  if (open) {
    closeOpen(tokens)
  }
  return bareLinks(merge(tokens.map((token) => token.node)))
}

/**
 * Draws what is still open at the end of an open block as if it closed there:
 * an unmatched opening delimiter wraps everything after it, and a bracket
 * that never closed loses its bracket.
 */
const closeOpen = (tokens: Token[]): void => {
  for (let at = tokens.length - 1; at >= 0; at -= 1) {
    const token = tokens[at] as Token
    if (token.bracket) {
      token.node = { kind: 'text', text: '' }
      delete token.bracket
      continue
    }
    const delimiter = token.delimiter
    if (!delimiter?.canOpen || delimiter.count === 0 || at === tokens.length - 1) {
      continue
    }
    const inside = merge(tokens.splice(at + 1).map((one) => one.node))
    let node: MarkdownInline
    if (delimiter.character === '~') {
      node = { children: inside, kind: 'del' }
    } else if (delimiter.count >= 3) {
      node = { children: [{ children: inside, kind: 'em' }], kind: 'strong' }
    } else {
      node = { children: inside, kind: delimiter.count === 2 ? 'strong' : 'em' }
    }
    token.node = node
    delete token.delimiter
  }
}

/** The plain text of some inline nodes, as an image's alternative text reads it. */
export const textOf = (nodes: MarkdownInline[]): string =>
  nodes
    .map((node) => {
      switch (node.kind) {
        case 'break':
          return '\n'
        case 'code':
        case 'text':
          return node.text
        case 'image':
          return node.alt
        default:
          return textOf(node.children)
      }
    })
    .join('')
