import './hugging.css'

export function Example() {
  return (
    <helix-flex
      className="column"
      direction="column"
      gap="sm"
    >
      <helix-button
        emphasis="solid"
        tone="primary"
      >
        Save changes
      </helix-button>
      <helix-button className="hug">Cancel</helix-button>
    </helix-flex>
  )
}
