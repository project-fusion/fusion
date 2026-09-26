export function Example() {
  return (
    <helix-combobox
      hint="Choose a language to continue"
      label="Language"
      name="language"
      placeholder="Search languages"
      required
    >
      <helix-option value="go">Go</helix-option>
      <helix-option value="rs">Rust</helix-option>
      <helix-option value="ts">TypeScript</helix-option>
    </helix-combobox>
  )
}
