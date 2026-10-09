export function Example() {
  return (
    <helix-menu
      context
      label="Edit"
    >
      <helix-textarea
        default-value="Right-click in this field."
        label="Notes"
        slot="trigger"
      ></helix-textarea>

      <helix-menu-item
        shortcut="mod+x"
        value="cut"
      >
        Cut
      </helix-menu-item>
      <helix-menu-item
        shortcut="mod+c"
        value="copy"
      >
        Copy
      </helix-menu-item>
      <helix-menu-item
        shortcut="mod+v"
        value="paste"
      >
        Paste
      </helix-menu-item>
    </helix-menu>
  )
}
