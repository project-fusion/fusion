import type { StreamParser } from '@codemirror/language'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { tags } from '@lezer/highlight'

/**
 * Shell, with the command named.
 *
 * **The stock mode colours nothing in the commands this documentation actually
 * contains.** It knows sh: builtins, keywords, redirects, quoting, comments.
 * Every shell fence here is `bun add @helix-io/web`, and to that mode `bun` is
 * an ordinary word, so all three blocks came out entirely grey. A highlighter
 * that returns the input unchanged is not highlighting.
 *
 * So this delegates first and only relabels what the mode declined to classify.
 * A bare word in command position, which is the start of a line or whatever
 * follows a pipe or a `&&`, becomes `command`. Anything the mode does recognise
 * keeps the mode's answer, which is why `export` stays a keyword and `cd` stays
 * a builtin rather than being flattened into the same colour by a wrapper that
 * guessed first and asked afterwards.
 *
 * **Delegating first is what stops this becoming a second grammar.** The
 * alternative was to carry a copy of sh's keyword and builtin lists here in
 * order to know what to skip, and a copy is a thing that goes stale silently:
 * the mode would learn a builtin and this would go on calling it a command.
 * Nothing here knows a single shell word.
 *
 * `command` is tagged `keyword` rather than given a colour of its own, because
 * the palette in the site's stylesheet is a fixed set of `tok-` classes and a
 * new one would paint nothing until that file learned about it. A command is
 * the verb of its line, which is the job `keyword` already does for `export`.
 */

/**
 * Whether a token hands command position to whatever follows it.
 *
 * One character at a time, because that is how the mode emits them: measured,
 * `cd site && bun run dev` comes back as `cd`, `site`, `&`, `&`, `bun`, and a
 * pattern written for the `&&` a reader sees never matches anything. It cost
 * the first version of this: `bun` after a `&&` stayed grey while the same word
 * at the start of a line was a command.
 */
const OPENS = /^[|&;({!]+$/

interface Head {
  helixHead: boolean
}

const commandAware: StreamParser<Head> = {
  ...(shell as StreamParser<Head>),

  startState(indent) {
    const state = (shell as StreamParser<Head>).startState?.(indent) ?? ({} as Head)
    state.helixHead = true
    return state
  },

  token(stream, state) {
    if (stream.sol()) {
      state.helixHead = true
    }
    const head = state.helixHead
    const from = stream.pos
    const token = (shell as StreamParser<Head>).token(stream, state)
    const text = stream.string.slice(from, stream.pos)

    /* Whitespace decides nothing: it neither is a command nor ends the position
       a command could be in, so it passes through without touching the flag. */
    if (text.trim() === '') {
      return token
    }
    if (OPENS.test(text.trim())) {
      state.helixHead = true
      return token
    }
    state.helixHead = false
    return token === null && head && /^[A-Za-z_][\w.@/-]*$/.test(text) ? 'command' : token
  },
}

/** The shell grammar, with `command` mapped into the palette. */
export const shellLanguage = StreamLanguage.define<Head>({
  ...commandAware,
  tokenTable: { command: tags.keyword },
})
