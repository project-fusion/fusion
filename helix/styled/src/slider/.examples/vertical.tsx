import './vertical.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="2xl"
    >
      <helix-flex
        align-items="end"
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

      {/* `--slider-length` inherits, so setting it on the row gives every
          slider in the row the same length. */}
      <helix-flex
        align-items="end"
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
