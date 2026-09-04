import './preview.css'

export function Example() {
  return (
    <div className="page">
      <helix-headless-speed-dial
        data-dock="bottom-end"
        data-dock-within
        label="Actions"
      >
        <helix-headless-icon-button
          label="Actions"
          slot="trigger"
        >
          <helix-headless-icon name="plus"></helix-headless-icon>
        </helix-headless-icon-button>

        <helix-headless-speed-dial-item value="share">
          Share
          <helix-headless-icon
            name="share-network"
            slot="icon"
          ></helix-headless-icon>
        </helix-headless-speed-dial-item>
        <helix-headless-speed-dial-item value="copy">
          Duplicate
          <helix-headless-icon
            name="copy"
            slot="icon"
          ></helix-headless-icon>
        </helix-headless-speed-dial-item>
        <helix-headless-speed-dial-item value="delete">
          Delete
          <helix-headless-icon
            name="trash"
            slot="icon"
          ></helix-headless-icon>
        </helix-headless-speed-dial-item>
      </helix-headless-speed-dial>
    </div>
  )
}
