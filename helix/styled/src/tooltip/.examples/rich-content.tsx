export function Example() {
  return (
    <>
      <helix-button
        aria-describedby="rich-content-tip"
        id="rich-content-trigger"
      >
        Save changes
      </helix-button>
      <helix-tooltip
        for="rich-content-trigger"
        id="rich-content-tip"
        placement="top"
      >
        <span slot="content">
          Save
          <helix-kbd>Cmd</helix-kbd>
          <helix-kbd>S</helix-kbd>
        </span>
      </helix-tooltip>
    </>
  )
}
