import './preview.css'

export function Example() {
  return (
    <helix-headless-combobox
      hint="Type to narrow the list"
      label="Language"
      name="language"
      placeholder="Search languages"
    >
      <helix-headless-option value="c">C</helix-headless-option>
      <helix-headless-option value="go">Go</helix-headless-option>
      <helix-headless-option value="js">JavaScript</helix-headless-option>
      <helix-headless-option value="py">Python</helix-headless-option>
      <helix-headless-option value="rb">Ruby</helix-headless-option>
      <helix-headless-option value="rs">Rust</helix-headless-option>
      <helix-headless-option value="ts">TypeScript</helix-headless-option>
      <helix-headless-option value="zig">Zig</helix-headless-option>
    </helix-headless-combobox>
  )
}
