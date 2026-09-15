export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button
        emphasis="solid"
        tone="primary"
      >
        <helix-icon
          name="play"
          slot="start"
        ></helix-icon>
        Play
        <helix-icon
          mirror
          name="arrow-right"
          slot="end"
        ></helix-icon>
      </helix-button>
      <helix-button emphasis="outlined">
        <helix-icon
          name="pause"
          slot="start"
        ></helix-icon>
        Pause
      </helix-button>
    </helix-flex>
  )
}
