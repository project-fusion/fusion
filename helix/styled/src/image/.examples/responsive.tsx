export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* **Three real files at three real widths, which is the whole point.** The
          descriptors used to name pictures that did not exist, so the example
          rendered nothing and demonstrated nothing; pointing all three at one
          file would render and demonstrate nothing either, since a browser
          choosing between three names for the same bytes has made no choice.

          400, 800 and 1536 rather than a round 1600: the photograph is 1536 wide
          and a descriptor claiming more than the file has is the same lie in the
          other direction. What a reader should take from this is the weight,
          which is where the choosing pays: 17 KB, 61 KB and 316 KB for the same
          picture.

          `sizes` is what makes the choice, and it is a promise about layout
          rather than about the image: 32rem once there is room for it, the
          viewport's width before that. A browser reads it before it has laid
          anything out, which is why it is stated rather than measured. */}
      <helix-image
        alt="Sunlight breaking through the surface of the sea, seen from below"
        fetchpriority="high"
        loading="eager"
        sizes="(min-width: 40rem) 32rem, 100vw"
        src="/media/scale/seawater-800.jpg"
        srcSet="/media/scale/seawater-400.jpg 400w, /media/scale/seawater-800.jpg 800w, /media/scale/seawater.jpg 1536w"
      ></helix-image>
    </helix-flex>
  )
}
