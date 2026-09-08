export function Example() {
  return (
    <helix-command
      empty-text="Nothing by that name"
      hotkey="mod+shift+p"
      label="Commands"
    >
      <helix-option value="reload">Reload the window</helix-option>
      <helix-option value="reset">Reset the workspace</helix-option>
      {/* The chord written plainly rather than as glyphs: a literal Command
          symbol tells a reader on Windows to press a key their keyboard has not
          got, which is the fault `keys` exists to stop. */}
      <helix-kbd
        keys="mod+shift+p"
        slot="footer"
      ></helix-kbd>
    </helix-command>
  )
}
