import './vertical.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="2xl"
    >
      <helix-flex
        align="end"
        gap="2xl"
      >
        <helix-slider
          default-value="70"
          label="Low"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>

        <helix-slider
          default-value="45"
          label="Mid"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>

        <helix-slider
          default-value="20"
          label="High"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>
      </helix-flex>

      {/* **The length belongs to the row, not to one slider in it.**

             `--slider-length` is a custom property, so it inherits: set on the group
             it reaches every slider inside and they cannot disagree. Set on one
             child, that child is taller than its neighbors, the tracks still share a
             foot, and its label floats above theirs, which is a ragged row of names
             that no amount of aligning the row fixes. The hook is the fix, put where
             a length actually belongs. */}
      <helix-flex
        align="end"
        className="tall"
        gap="2xl"
      >
        <helix-slider
          default-value="80"
          label="Left"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>

        <helix-slider
          default-value="35"
          label="Right"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>
      </helix-flex>
    </helix-flex>
  )
}
