export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-button
        aria-describedby="material-inverse-tip"
        id="material-inverse"
      >
        Inverse
      </helix-button>
      <helix-tooltip
        content="Lorem ipsum dolor sit amet"
        for="material-inverse"
        id="material-inverse-tip"
      ></helix-tooltip>
      <helix-button
        aria-describedby="material-glass-tip"
        id="material-glass"
      >
        Glass
      </helix-button>
      <helix-tooltip
        content="Lorem ipsum dolor sit amet"
        for="material-glass"
        id="material-glass-tip"
        material="glass"
      ></helix-tooltip>
    </helix-flex>
  )
}
