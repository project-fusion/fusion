import './thumb.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
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
    </helix-flex>
  )
}
