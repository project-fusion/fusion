import './proportions.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="2xl"
    >
      <helix-slider
        default-value="60"
        label="Volume"
        max={100}
        min={0}
        show-value
      ></helix-slider>

      <helix-flex
        className="thick"
        direction="column"
        gap="2xl"
      >
        <helix-slider
          default-value="60"
          label="Brightness"
          max={100}
          min={0}
          show-value
        ></helix-slider>

        <helix-slider
          default-value="35"
          label="Contrast"
          markers={5}
          max={100}
          min={0}
          show-value
        ></helix-slider>
      </helix-flex>

      <helix-flex
        align-items="end"
        className="thick"
        gap="2xl"
      >
        <helix-slider
          default-value="70"
          label="Bass"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>

        <helix-slider
          default-value="30"
          label="Treble"
          max={100}
          min={0}
          orientation="vertical"
          show-value
        ></helix-slider>
      </helix-flex>
    </helix-flex>
  )
}
