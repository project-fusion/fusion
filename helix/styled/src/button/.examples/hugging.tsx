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
        Button
      </helix-button>
      <helix-button className="hug">Button</helix-button>
    </helix-flex>
  )
}
