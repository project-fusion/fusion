import type { HelixFilterInput } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

/**
 * The page defines the keys and the values each one accepts. The field shows
 * the list it is given.
 */
const VOCABULARY: Record<string, readonly string[]> = {
  area: ['billing', 'infra', 'docs'],
  owner: ['ada', 'grace', 'linus'],
  status: ['open', 'closed', 'draft'],
}

/**
 * Everything after the last space is the term being typed. A term with no colon
 * is a key, and a term with a colon is a value for that key.
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
   * A key completes to `owner:` and the panel shows its values. A value
   * completes to `owner:ada ` and the panel closes.
   *
   * Wait for the render before moving the caret. Until then, the input holds
   * the old text, and `setSelectionRange` would clamp to its length.
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
      {/* The option sends `helix-select` when it is pressed or chosen with
          Enter, so one handler covers both. */}
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
