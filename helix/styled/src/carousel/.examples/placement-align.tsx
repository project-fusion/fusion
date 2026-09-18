export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-carousel
        controls-align="center"
        controls-placement="top"
        indicator-align="center"
        indicator-placement="bottom"
        label="Centered"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>

      <helix-carousel
        controls-align="start"
        controls-placement="top"
        indicator-align="end"
        indicator-placement="top"
        label="Top row, split"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>

      <helix-carousel
        controls-align="start"
        controls-placement="overlay"
        indicator-align="end"
        indicator-placement="bottom"
        label="Arrows high, dots to the far end"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>
    </helix-flex>
  )
}
