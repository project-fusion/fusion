export function Example() {
  return (
    <>
      {/* Closed on the same line on purpose: a newline here costs the label. */}
      <helix-checkbox hint="Hint" label="Label" name="option" value="accepted"></helix-checkbox>
    </>
  )
}
