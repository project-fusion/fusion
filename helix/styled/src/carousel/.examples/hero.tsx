import './hero.css'

const panel = (tone: string) =>
  ({
    '--card-background-color': `var(--helix-color-${tone})`,
    '--card-padding': 'var(--helix-space-3xl)',
    '--card-radius': '0',
  }) as React.CSSProperties

export function Example() {
  return (
    <helix-carousel
      controls-placement="overlay"
      indicator-placement="overlay"
      label="Highlights"
      loop
    >
      <helix-card
        class="slide"
        separation="filled"
        style={panel('primary')}
      ></helix-card>
      <helix-card
        class="slide"
        separation="filled"
        style={panel('success')}
      ></helix-card>
      <helix-card
        class="slide"
        separation="filled"
        style={panel('danger')}
      ></helix-card>
    </helix-carousel>
  )
}
