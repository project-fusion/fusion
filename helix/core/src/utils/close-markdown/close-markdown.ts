/** A fence opener or closer: up to three spaces, then three or more of one mark. */
const FENCE = /^ {0,3}(`{3,}|~{3,})/

/** A link or image whose target has not finished arriving. */
const OPEN_TARGET = /!?\[[^\]]*\]\([^)]*$/

/** A link or image whose text has not finished arriving. */
const OPEN_TEXT = /!?\[[^\]]*$/

/**
 * A prefix of a markdown document, made safe to render as it arrives.
 *
 * **A streamed answer is a prefix, and a prefix is rarely valid markdown.** The
 * moment a model writes an opening fence, everything after it is code that has
 * not been told it is code: a renderer handed that prefix draws paragraphs,
 * then redraws the whole block when the closing fence lands three seconds
 * later. The same holds for a backtick, a `**`, and a link whose target is
 * still being typed — each renders as punctuation until its partner arrives.
 *
 * So this closes what is open. It does not parse markdown and does not render
 * it: it returns a string the caller's own renderer can be handed, in which
 * every construct that was opened is also closed.
 *
 * **What it does not do is remove anything a reader can already read.** The
 * exception is a link or image whose brackets are still open, because there is
 * no closing that: a target arrives character by character, and `[the docs](ht`
 * has no valid completion that is not a guess at a URL. That fragment is
 * withheld until it is whole, which is the one case where a word appears a beat
 * later than it was received.
 *
 * **Inside a fence nothing else applies**, which is why closing one returns
 * immediately. The characters in a code block are code: a stray backtick or a
 * lone asterisk in a shell command is not an unclosed span, and treating it as
 * one would append punctuation into somebody's code.
 *
 * **Underscores are left alone.** `_` opens emphasis in markdown and also sits
 * inside `snake_case`, `__init__` and a filename, and a prefix gives no way to
 * tell which: closing one turns an identifier into italics for as long as the
 * rest of the word takes to arrive, which is worse than the punctuation it was
 * meant to hide. `*` does not have that problem, being punctuation everywhere
 * it is not emphasis.
 *
 * Stable across a growing prefix, which is the property that matters: calling
 * this on each frame of a stream cannot make text move that has already
 * settled, because everything it adds is at the end and everything it withholds
 * is a fragment that has not been shown yet.
 */
export const closeMarkdown = (partial: string): string => {
  if (partial === '') {
    return partial
  }

  /* The fence a block is owed, or `undefined` outside one. A closing fence has
     to be at least as long as the one that opened it and of the same mark, so
     ```` inside a ``` block is text and ``` inside a ```` block is too. */
  let owed: string | undefined
  for (const line of partial.split('\n')) {
    const found = FENCE.exec(line)
    if (!found) {
      continue
    }
    const mark = found[1] as string
    if (owed === undefined) {
      owed = mark
    } else if (mark[0] === owed[0] && mark.length >= owed.length) {
      owed = undefined
    }
  }

  if (owed !== undefined) {
    return `${partial}${partial.endsWith('\n') ? '' : '\n'}${owed}`
  }

  /* Inline constructs do not span a blank line, so only the last block of the
     text can hold one open. */
  const cut = partial.lastIndexOf('\n\n')
  const head = cut === -1 ? '' : partial.slice(0, cut + 2)
  let tail = partial.slice(cut === -1 ? 0 : cut + 2)

  /* Withheld before anything is counted, so a bracket inside an unfinished
     target is not read as emphasis. */
  const target = OPEN_TARGET.exec(tail)
  if (target) {
    tail = tail.slice(0, target.index)
  } else {
    const text = OPEN_TEXT.exec(tail)
    if (text) {
      tail = tail.slice(0, text.index)
    }
  }

  /* Code first: a span holds everything in it, so `**` inside one is not
     emphasis and must not be counted. */
  const ticks = (tail.match(/`/g) ?? []).length
  if (ticks % 2 === 1) {
    tail += '`'
  }

  const strong = (tail.match(/\*\*/g) ?? []).length
  if (strong % 2 === 1) {
    tail += '**'
  }

  /* What is left after the pairs are taken out. A `***` is one of each and both
     counts see it, which is the reading markdown itself takes. */
  const single = (tail.match(/(?<!\*)\*(?!\*)/g) ?? []).length
  if (single % 2 === 1) {
    tail += '*'
  }

  return head + tail
}
