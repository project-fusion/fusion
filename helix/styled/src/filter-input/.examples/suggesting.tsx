import type { HelixFilterInput } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

/**
 * The grammar is this page's, and the field never learns it. A real console
 * reads the values from its own data; what matters is that the element is
 * handed a list and asked to show it, never asked what a key is.
 */
const VOCABULARY: Record<string, readonly string[]> = {
  area: ['billing', 'infra', 'docs'],
  owner: ['ada', 'grace', 'linus'],
  status: ['open', 'closed', 'draft'],
}

/**
 * Everything after the last space is what is being typed now. A term with no
 * colon is a key being named; one with a colon is a value for the key before it.
 */
function termAt(text: string, caret: number) {
  const term = text.slice(0, caret).split(/\s+/).at(-1) ?? ''
  const colon = term.indexOf(':')
  return colon === -1
    ? { key: null, text: term }
    : { key: term.slice(0, colon), text: term.slice(colon + 1) }
}

function suggestionsFor(text: string, caret: number): readonly string[] {
  const term = termAt(text, caret)
  return term.key === null
    ? Object.keys(VOCABULARY).filter((key) => key.startsWith(term.text))
    : (VOCABULARY[term.key] ?? []).filter((value) => value.startsWith(term.text))
}

export function Example() {
  const filter = useRef<HelixFilterInput>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<readonly string[]>(Object.keys(VOCABULARY))

  const offer = () => {
    const element = filter.current
    if (!element) {
      return
    }
    setQuery(element.value)
    setSuggestions(suggestionsFor(element.value, element.selectionStart))
  }

  /**
   * A key completes to `owner:` and the panel carries straight on into its
   * values; a value completes to `owner:ada ` and the panel closes, because the
   * next term is empty and every key matches again.
   *
   * Awaited, because the caret cannot be put into text that is not there yet:
   * setting `value` schedules a render, and a `setSelectionRange` before it
   * lands clamps to the old length and is then moved again by the render.
   */
  const choose = async (event: CustomEvent<{ value: string }>) => {
    const element = filter.current
    if (!element) {
      return
    }
    const caret = element.selectionStart
    const term = termAt(element.value, caret)
    const insert = term.key === null ? `${event.detail.value}:` : `${event.detail.value} `
    const head = element.value.slice(0, caret)
    const typed = term.key === null ? term.text.length : term.text.length + term.key.length + 1
    const kept = head.slice(0, head.length - typed)
    element.value = kept + insert + element.value.slice(caret)
    await element.updateComplete
    const at = kept.length + insert.length
    element.setSelectionRange(at, at)
    offer()
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* One handler for both ways of choosing, since the option announces its
          own `helix-select` whether it was pressed or reached with Enter. */}
      <helix-filter-input
        hint="Type a letter, or press Down. Choosing a key offers its values next."
        label="Filter rows"
        onhelix-select={choose}
        onInput={offer}
        placeholder="owner:ada status:open"
        ref={filter}
      >
        {suggestions.map((value) => (
          <helix-option
            key={value}
            slot="suggestions"
            value={value}
          >
            {value}
          </helix-option>
        ))}
      </helix-filter-input>

      <helix-code-block label="Query">{query === '' ? 'Everything' : query}</helix-code-block>
    </helix-flex>
  )
}
