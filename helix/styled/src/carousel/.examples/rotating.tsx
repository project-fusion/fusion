export function Example() {
  return (
    <helix-carousel
      autoplay
      interval={4000}
      label="Announcements"
      loop
    >
      <helix-callout tone="info">Scheduled maintenance begins at 10 PM.</helix-callout>
      <helix-callout tone="success">New reports are available in your dashboard.</helix-callout>
    </helix-carousel>
  )
}
