export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <helix-image
        alt="A harbour at first light"
        fetchpriority="high"
        loading="eager"
        sizes="(min-width: 40rem) 32rem, 100vw"
        src="/media/harbour-800.jpg"
        srcSet="/media/harbour-400.jpg 400w, /media/harbour-800.jpg 800w, /media/harbour-1600.jpg 1600w"
      ></helix-image>
    </helix-flex>
  )
}
