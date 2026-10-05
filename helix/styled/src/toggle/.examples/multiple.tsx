export function Example() {
  return (
    <helix-toggle-group
      label="Format"
      name="format"
      selection-mode="multiple"
      value="bold"
    >
      <helix-toggle value="bold">Bold</helix-toggle>
      <helix-toggle value="italic">Italic</helix-toggle>
      <helix-toggle value="underline">Underline</helix-toggle>
    </helix-toggle-group>
  )
}
