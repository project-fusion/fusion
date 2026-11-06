export function Example() {
  return (
    <helix-flex justify-content="end">
      <helix-speed-dial label="Actions">
        <helix-speed-dial-item value="share">
          Share
          <helix-icon
            name="share-network"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
        <helix-speed-dial-item value="copy">
          Duplicate
          <helix-icon
            name="copy"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
        <helix-speed-dial-item
          tone="danger"
          value="delete"
        >
          Delete
          <helix-icon
            name="trash"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
      </helix-speed-dial>
    </helix-flex>
  )
}
