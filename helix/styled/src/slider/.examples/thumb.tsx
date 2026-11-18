import './thumb.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="2xl"
    >
      <helix-slider
        className="grip"
        default-value="40"
        label="Volume"
        show-value
      >
        <helix-icon
          name="dots-six-vertical"
          slot="thumb"
        ></helix-icon>
      </helix-slider>

      <helix-slider
        className="grip"
        default-value="20,70"
        label="Price"
        range
        show-value
      >
        <helix-icon
          name="caret-left"
          slot="thumb"
        ></helix-icon>
        <helix-icon
          name="caret-right"
          slot="thumb-end"
        ></helix-icon>
      </helix-slider>

      <helix-slider
        default-value="60"
        label="Gain"
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
