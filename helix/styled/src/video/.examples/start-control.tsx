export function Example() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-video
        label="A clip to press"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      ></helix-video>

      <helix-video
        label="A clip that is decoration"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
        start-control="none"
      ></helix-video>
    </helix-flex>
  )
}
