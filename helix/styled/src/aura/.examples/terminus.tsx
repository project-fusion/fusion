import './terminus.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-aura
        scale={1.4}
        style={{ blockSize: '11rem' }}
        terminus={0.25}
      ></helix-aura>

      <helix-aura
        scale={1.4}
        style={{ blockSize: '11rem' }}
        terminus={0.75}
      ></helix-aura>
    </helix-flex>
  )
}
