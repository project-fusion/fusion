import './preview.css'

export function Example() {
  return (
    <helix-headless-canvas label="Document approval">
      <helix-headless-canvas-node
        height={64}
        name="write"
        width={160}
        x={0}
        y={0}
      >
        Write the draft
      </helix-headless-canvas-node>

      <helix-headless-canvas-node
        height={64}
        name="review"
        width={160}
        x={320}
        y={0}
      >
        Review the draft
      </helix-headless-canvas-node>

      <helix-headless-canvas-node
        height={64}
        name="ship"
        width={160}
        x={160}
        y={192}
      >
        Publish the draft
      </helix-headless-canvas-node>

      <helix-headless-canvas-edge
        from="write"
        label="when it is complete"
        to="review"
      ></helix-headless-canvas-edge>

      <helix-headless-canvas-edge
        from="review"
        to="ship"
      ></helix-headless-canvas-edge>
    </helix-headless-canvas>
  )
}
