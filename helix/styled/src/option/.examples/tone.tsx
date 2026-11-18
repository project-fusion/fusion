import './tone.css'

export function Example() {
  return (
    <helix-listbox
      className="listbox"
      label="Token actions"
    >
      <helix-option
        tone="neutral"
        value="copy"
      >
        Copy token
      </helix-option>
      <helix-option
        tone="neutral"
        value="rename"
      >
        Rename token
      </helix-option>
      <helix-option
        tone="danger"
        value="revoke"
      >
        Revoke token
      </helix-option>
    </helix-listbox>
  )
}
