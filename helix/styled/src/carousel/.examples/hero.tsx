import './hero.css'

export function Example() {
  return (
    <helix-carousel
      controls-placement="overlay"
      indicator-placement="overlay"
      label="Highlights"
      loop
    >
      <div className="slide"></div>
      <div className="slide"></div>
      <div className="slide"></div>
    </helix-carousel>
  )
}
