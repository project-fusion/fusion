export function Example() {
  return (
    <>
      {/* Closed on the same line on purpose: a newline here costs the label. */}
      <helix-checkbox
        default-checked
        hint="Hint"
        label="Label"
        name="option"
        value="accepted"
      ></helix-checkbox>
    </>
  )
}
