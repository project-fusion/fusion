export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-carousel
        indicator-placement="top"
        label="Announcements"
      >
        <helix-callout tone="info">New features are available.</helix-callout>
        <helix-callout tone="success">Your changes were saved.</helix-callout>
        <helix-callout tone="warning">Your storage is almost full.</helix-callout>
      </helix-carousel>

      <helix-carousel
        indicator-placement="start"
        label="Updates"
      >
        <helix-callout tone="info">New features are available.</helix-callout>
        <helix-callout tone="success">Your changes were saved.</helix-callout>
        <helix-callout tone="warning">Your storage is almost full.</helix-callout>
      </helix-carousel>

      <helix-carousel
        indicator-placement="end"
        label="Tips"
      >
        <helix-callout tone="info">New features are available.</helix-callout>
        <helix-callout tone="success">Your changes were saved.</helix-callout>
        <helix-callout tone="warning">Your storage is almost full.</helix-callout>
      </helix-carousel>

      <helix-carousel
        indicator-placement="overlay"
        label="News"
      >
        <helix-callout tone="info">New features are available.</helix-callout>
        <helix-callout tone="success">Your changes were saved.</helix-callout>
        <helix-callout tone="warning">Your storage is almost full.</helix-callout>
      </helix-carousel>
    </helix-flex>
  )
}
