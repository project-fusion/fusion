import './default-open.css'

export function Example() {
  return (
    <helix-popover
      className="hint"
      default-open
      id="whats-new"
      label="What is new"
    >
      <helix-button slot="trigger">What is new</helix-button>
      <helix-flex
        direction="column"
        gap="md"
      >
        <helix-text variant="body">
          You can now share folders. Files you add to a folder later are shared too.
        </helix-text>
        <helix-flex justify-content="end">
          <helix-button
            command="--close"
            commandfor="whats-new"
            emphasis="outlined"
          >
            Got it
          </helix-button>
        </helix-flex>
      </helix-flex>
    </helix-popover>
  )
}
