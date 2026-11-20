export function Example() {
  return (
    <helix-tooltip placement="top">
      <helix-button>Save changes</helix-button>
      <span slot="content">
        Save
        <helix-kbd keys="mod+s" />
      </span>
    </helix-tooltip>
  )
}
