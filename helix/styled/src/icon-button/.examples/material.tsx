import './material.css'

export function Example() {
  return (
    <div className="band">
      <helix-icon-button
        label="Zoom in"
        raised
      >
        <helix-icon name="plus"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Zoom out"
        material="glass"
        raised
      >
        <helix-icon name="minus"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Layers"
        material="frosted"
        raised
      >
        <helix-icon name="stack"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Full screen"
        material="transparent"
        raised
      >
        <helix-icon name="corners-out"></helix-icon>
      </helix-icon-button>
    </div>
  )
}
