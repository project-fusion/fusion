export function Example() {
  return (
    <helix-radio-group
      feedback="Choose one to continue"
      hint="You can change this later"
      label="Deploy target"
      name="target"
    >
      <helix-radio value="preview">Preview</helix-radio>
      <helix-radio value="production">Production</helix-radio>
    </helix-radio-group>
  )
}
