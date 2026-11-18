import './states.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-canvas
        grid="dots"
        label="Release plan"
        loading
      >
        <div
          className="status"
          slot="loading"
        >
          <helix-progress
            indeterminate
            label="Loading the board"
          ></helix-progress>
        </div>
      </helix-canvas>

      <helix-canvas
        grid="dots"
        label="Retrospective"
      >
        <div
          className="status"
          slot="empty"
        >
          <helix-text emphasis="muted">No cards on the board yet</helix-text>
        </div>
      </helix-canvas>
    </helix-flex>
  )
}
