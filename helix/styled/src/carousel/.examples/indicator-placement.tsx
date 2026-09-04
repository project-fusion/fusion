export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-carousel
        indicator-placement="block-start"
        label="Above"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>

      <helix-carousel
        indicator-placement="inline-start"
        label="Beside, near"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>

      <helix-carousel
        indicator-placement="inline-end"
        label="Beside, far"
      >
        <helix-callout tone="info">Slide One</helix-callout>
        <helix-callout tone="success">Slide Two</helix-callout>
        <helix-callout tone="warning">Slide Three</helix-callout>
      </helix-carousel>
    </helix-flex>
  )
}
