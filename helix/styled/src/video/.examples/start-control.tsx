export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-video
        label="Product walkthrough"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      ></helix-video>

      <helix-video
        label="Background video"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
        start-control="none"
      ></helix-video>
    </helix-flex>
  )
}
