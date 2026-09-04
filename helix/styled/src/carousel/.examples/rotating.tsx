export function Example() {
  return (
    <helix-carousel
      autoplay
      interval={4000}
      label="Label"
      loop
    >
      <helix-callout tone="info">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </helix-callout>
      <helix-callout tone="success">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </helix-callout>
    </helix-carousel>
  )
}
