export function Example() {
  return (
    <helix-select filterable label="Time zone" placeholder="Choose one">
      <helix-option value="utc">UTC</helix-option>
      <helix-option value="lisbon">Europe/Lisbon</helix-option>
      <helix-option value="london">Europe/London</helix-option>
      <helix-option value="madrid">Europe/Madrid</helix-option>
      <helix-option value="berlin">Europe/Berlin</helix-option>
      <helix-option value="athens">Europe/Athens</helix-option>
    </helix-select>
  )
}
