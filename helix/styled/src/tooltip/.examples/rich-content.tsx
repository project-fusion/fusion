export function Example() {
  return (
    <helix-tooltip placement="top">
      <helix-button>Save changes</helix-button>
      <span slot="content">
        Save
        <helix-kbd>Cmd</helix-kbd>
        <helix-kbd>S</helix-kbd>
      </span>
    </helix-tooltip>
  )
}
