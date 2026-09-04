export function Example() {
  return (
    <helix-button-group label="Label">
      <helix-button>
        <helix-icon
          name="arrow-left"
          slot="start"
        ></helix-icon>
        Back
      </helix-button>
      <helix-button>
        Forward
        <helix-icon
          name="arrow-right"
          slot="end"
        ></helix-icon>
      </helix-button>
    </helix-button-group>
  )
}
