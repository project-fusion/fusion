export function Example() {
  return (
    <helix-combobox
      default-value="rs"
      hint="Used for new projects"
      label="Language"
      name="language"
    >
      <helix-option value="c">C</helix-option>
      <helix-option value="go">Go</helix-option>
      <helix-option value="js">JavaScript</helix-option>
      <helix-option value="rs">Rust</helix-option>
      <helix-option value="ts">TypeScript</helix-option>
    </helix-combobox>
  )
}
