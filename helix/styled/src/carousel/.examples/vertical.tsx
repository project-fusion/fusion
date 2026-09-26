import './vertical.css'

export function Example() {
  return (
    <helix-carousel
      className="stack"
      label="Releases"
      orientation="vertical"
    >
      <helix-callout tone="info">New features are available.</helix-callout>
      <helix-callout tone="success">Your changes were saved.</helix-callout>
      <helix-callout tone="warning">Your storage is almost full.</helix-callout>
    </helix-carousel>
  )
}
