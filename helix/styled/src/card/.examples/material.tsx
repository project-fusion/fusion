import './material.css'

export function Example() {
  return (
    <div className="band">
      <helix-card
        aria-labelledby="material-title"
        material="glass"
      >
        <h3
          id="material-title"
          slot="header"
        >
          Glass
        </h3>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
        labore.
        <helix-button
          emphasis="ghost"
          slot="footer"
        >
          Action
        </helix-button>
      </helix-card>

      <helix-card
        aria-labelledby="opaque-title"
        separation="elevated"
      >
        <h3
          id="opaque-title"
          slot="header"
        >
          Opaque
        </h3>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
        labore.
        <helix-button
          emphasis="ghost"
          slot="footer"
        >
          Action
        </helix-button>
      </helix-card>
    </div>
  )
}
