export function Example() {
  return (
    <helix-combobox
      hint="Type to narrow the list"
      label="Language"
      name="language"
      placeholder="Search languages"
    >
      <helix-option value="c">C</helix-option>
      <helix-option value="go">Go</helix-option>
      <helix-option value="js">JavaScript</helix-option>
      <helix-option value="py">Python</helix-option>
      <helix-option value="rb">Ruby</helix-option>
      <helix-option value="rs">Rust</helix-option>
      <helix-option value="ts">TypeScript</helix-option>
      <helix-option value="zig">Zig</helix-option>
    </helix-combobox>
  )
}
