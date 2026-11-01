export function Example() {
  return (
    <div className="page">
      <helix-speed-dial
        data-dock="bottom-end"
        data-dock-within
        label="Actions"
      >
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
    </div>
  )
}
