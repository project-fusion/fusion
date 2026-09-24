export function Example() {
  return (
    <helix-canvas
      label="How a request reaches the database"
      path="step"
      readonly
    >
      <helix-canvas-node
        height={64}
        name="edge"
        width={160}
        x={0}
        y={0}
      >
        Edge function
      </helix-canvas-node>

      <helix-canvas-node
        color="5"
        height={64}
        name="cache"
        width={160}
        x={320}
        y={0}
      >
        Cache
      </helix-canvas-node>

      <helix-canvas-node
        color="6"
        height={64}
        name="db"
        width={160}
        x={320}
        y={160}
      >
        Database
      </helix-canvas-node>

      <helix-canvas-edge
        from="edge"
        label="asks first"
        to="cache"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="cache"
        label="on a miss"
        to="db"
      ></helix-canvas-edge>
    </helix-canvas>
  )
}
