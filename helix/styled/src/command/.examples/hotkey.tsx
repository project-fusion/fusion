export function Example() {
  return (
    <helix-command
      empty-text="No matching commands"
      hotkey="mod+shift+p"
      label="Commands"
    >
      <helix-option value="reload">Reload window</helix-option>
      <helix-option value="reset">Reset workspace</helix-option>
      {/* The `keys` attribute shows each key with the right name for the
          platform. */}
      <helix-kbd
        keys="mod+shift+p"
        slot="footer"
      ></helix-kbd>
    </helix-command>
  )
}
