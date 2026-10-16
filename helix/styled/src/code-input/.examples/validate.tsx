const SETTINGS = '{ "theme": "dark", "density": "compact", }'

/** Accepts the value where it parses, and says what to look for where it does not. */
const validJson = (value: string): true | string => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return 'Settings must be valid JSON. Check for a comma after the last entry.'
  }
}

export function Example() {
  return (
    <helix-code-input
      label="Settings"
      language="json"
      required
      validate={validJson}
      value={SETTINGS}
    ></helix-code-input>
  )
}
