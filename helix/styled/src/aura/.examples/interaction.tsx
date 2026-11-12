import './interaction.css'

export function Example() {
  return (
    <helix-aura
      interaction="ripple"
      interactive
      reach={1.6}
      speed={0.6}
      style={{ blockSize: '16rem' }}
    ></helix-aura>
  )
}
