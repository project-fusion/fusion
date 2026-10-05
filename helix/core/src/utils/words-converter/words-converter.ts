/**
 * Reads an attribute holding words keyed by name, written as a JSON object,
 * such as Orb's `state-labels`, Sandbox Terminal's `level-words` or Color
 * Picker's `color-words`. A property declares it as its `converter`.
 *
 * **Anything else is no words, never `null`.** JSON that does not parse, an
 * array, a string or `null` gives an empty object, and a key whose value is
 * not a string is dropped, so every key keeps its default words. Lit's own
 * `Object` converter answers `null` for JSON that does not parse, and a render
 * that reads a key off it throws and draws nothing, over a typo in markup.
 */
export const wordsConverter = {
  fromAttribute: (value: string | null): Record<string, string> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(value ?? '')
    } catch {
      return {}
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  },
}
