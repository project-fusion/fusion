export function Example() {
  return (
    <helix-video
      label="Making Of, Part Two"
      src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
    >
      <helix-icon-button
        emphasis="solid"
        label="Back to the series"
        slot="back"
        tone="neutral"
      >
        <helix-icon name="arrow-left"></helix-icon>
      </helix-icon-button>
    </helix-video>
  )
}
