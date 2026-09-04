import './terminus.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <div className="stage">
        <helix-aura
          scale={1.4}
          terminus={0.25}
        ></helix-aura>
      </div>

      <div className="stage">
        <helix-aura
          scale={1.4}
          terminus={0.75}
        ></helix-aura>
      </div>
    </helix-flex>
  )
}
