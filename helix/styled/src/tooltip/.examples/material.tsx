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
        Copy link
      </helix-button>
      <helix-tooltip
        content="Copy the link to your clipboard"
        for="material-inverse"
        id="material-inverse-tip"
      ></helix-tooltip>
      <helix-button
        aria-describedby="material-glass-tip"
        id="material-glass"
      >
        Download file
      </helix-button>
      <helix-tooltip
        content="Save a PDF copy of the file"
        for="material-glass"
        id="material-glass-tip"
        material="glass"
      ></helix-tooltip>
    </helix-flex>
  )
}
