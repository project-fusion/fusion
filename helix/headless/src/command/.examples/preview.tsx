import './preview.css'

export function Example() {
  return (
    <helix-headless-command
      default-open
      label="Commands"
    >
      <helix-headless-option value="new">New file</helix-headless-option>
      <helix-headless-option value="open">Open folder</helix-headless-option>
      <helix-headless-option value="save">Save all</helix-headless-option>
      <p slot="footer">
        <helix-headless-kbd keys="mod+k" /> to open, <helix-headless-kbd>Esc</helix-headless-kbd> to
        close
      </p>
    </helix-headless-command>
  )
}
