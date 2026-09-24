import './preview.css'

export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="gallery"
      >
        Open the gallery
      </helix-button>

      {/* Open, so the picture is of a lightbox. */}
      <helix-lightbox
        id="gallery"
        label="Coastline"
        loop
        open
      >
        <helix-button-group
          label="Lightbox actions"
          slot="header"
        >
          <helix-icon-button
            command="--previous"
            commandfor="gallery"
            label="Previous picture"
          >
            <helix-icon name="caret-left"></helix-icon>
          </helix-icon-button>
          <helix-icon-button
            command="--next"
            commandfor="gallery"
            label="Next picture"
          >
            <helix-icon name="caret-right"></helix-icon>
          </helix-icon-button>
          <helix-icon-button
            command="--close"
            commandfor="gallery"
            label="Close"
          >
            <helix-icon name="x"></helix-icon>
          </helix-icon-button>
        </helix-button-group>

        <helix-lightbox-item
          label="Seawater over pale sand"
          value="seawater"
        >
          <img
            alt="Seawater over pale sand"
            src="/media/scale/seawater-800.jpg"
          />
          <helix-text slot="description">
            Seawater, shallow enough to read the sand through.
          </helix-text>
        </helix-lightbox-item>

        <helix-lightbox-item
          label="The sun low over open water"
          value="ocean-sun"
        >
          <img
            alt="The sun low over open water"
            src="/media/scale/ocean-sun.jpg"
          />
          <helix-text slot="description">The same coast an hour later.</helix-text>
        </helix-lightbox-item>
      </helix-lightbox>
    </>
  )
}
