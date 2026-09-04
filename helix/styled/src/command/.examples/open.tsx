export function Example() {
  return (
    <helix-command
      default-open
      label="Commands"
      placeholder="Type to narrow the list"
    >
      <helix-option value="new">New file</helix-option>
      <helix-option value="open">Open recent</helix-option>
      <helix-option value="save">Save all</helix-option>
      <helix-option value="theme">Switch color mode</helix-option>
    </helix-command>
  )
}
