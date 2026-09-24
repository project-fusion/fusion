export function Example() {
  return (
    <helix-canvas
      grid="dots"
      label="What happens to a pull request"
      path="step"
    >
      <helix-canvas-node
        height={48}
        name="opened"
        shape="pill"
        width={160}
        x={0}
        y={0}
      >
        Opened
      </helix-canvas-node>

      <helix-canvas-node
        height={64}
        name="checks"
        shape="square"
        width={160}
        x={0}
        y={112}
      >
        Checks run
      </helix-canvas-node>

      <helix-canvas-node
        height={112}
        name="green"
        shape="diamond"
        tone="accent"
        width={160}
        x={0}
        y={240}
      >
        Green?
      </helix-canvas-node>

      <helix-canvas-node
        height={64}
        name="fix"
        shape="square"
        tone="warning"
        width={160}
        x={256}
        y={264}
      >
        Fix and push
      </helix-canvas-node>

      <helix-canvas-node
        height={96}
        name="merged"
        shape="circle"
        tone="success"
        width={96}
        x={32}
        y={416}
      >
        Merged
      </helix-canvas-node>

      <helix-canvas-edge
        from="opened"
        to="checks"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="checks"
        to="green"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="green"
        label="no"
        to="fix"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="fix"
        from-side="top"
        to="checks"
        to-side="right"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="green"
        label="yes"
        to="merged"
      ></helix-canvas-edge>
    </helix-canvas>
  )
}
