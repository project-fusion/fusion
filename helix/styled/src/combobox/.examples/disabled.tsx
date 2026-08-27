export function Example() {
  return (
    <helix-combobox
      default-value="ts"
      disabled
      hint="Set by your workspace"
      label="Language"
      name="language"
    >
      <helix-option value="js">JavaScript</helix-option>
      <helix-option value="ts">TypeScript</helix-option>
    </helix-combobox>
  )
}
