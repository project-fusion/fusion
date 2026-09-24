import './preview.css'

export function Example() {
  return (
    <helix-headless-canvas label="How a release happens">
      <helix-headless-canvas-node
        height={64}
        id="write"
        width={160}
        x={0}
        y={0}
      >
        Write the change
      </helix-headless-canvas-node>

      <helix-headless-canvas-node
        height={64}
        id="review"
        width={160}
        x={320}
        y={0}
      >
        Review it
      </helix-headless-canvas-node>

      <helix-headless-canvas-node
        height={64}
        id="ship"
        width={160}
        x={160}
        y={192}
      >
        Tag and publish
      </helix-headless-canvas-node>

      <helix-headless-canvas-edge
        from="write"
        label="when it builds"
        to="review"
      ></helix-headless-canvas-edge>

      <helix-headless-canvas-edge
        from="review"
        to="ship"
      ></helix-headless-canvas-edge>
    </helix-headless-canvas>
  )
}
