export function Example() {
  return (
    <helix-menu
      label="Undo history"
      open-on="long-press"
    >
      <helix-button
        emphasis="outlined"
        slot="trigger"
      >
        Undo
      </helix-button>
      <helix-menu-item value="typing">Undo typing</helix-menu-item>
      <helix-menu-item value="format">Undo bold</helix-menu-item>
      <helix-menu-item value="paste">Undo paste</helix-menu-item>
    </helix-menu>
  )
}
