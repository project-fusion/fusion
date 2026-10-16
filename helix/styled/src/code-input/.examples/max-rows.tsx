const STYLES = `.banner {
  background: var(--helix-color-surface-raised);
  border-radius: var(--helix-radii-md);
  padding: var(--helix-space-md);
}

.banner h2 {
  font-size: var(--helix-text-lg);
  margin: 0;
}`

export function Example() {
  return (
    <helix-code-input
      label="Custom styles"
      language="css"
      maxRows={6}
      value={STYLES}
    ></helix-code-input>
  )
}
