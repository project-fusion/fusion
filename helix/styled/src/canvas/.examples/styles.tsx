export function Example() {
  return (
    <helix-canvas
      grid="dots"
      label="Project plan"
      toneLabels={{ accent: 'In progress', success: 'Done', warning: 'At risk' }}
    >
      <helix-canvas-node
        height={64}
        name="outlined"
        width={160}
        x={0}
        y={0}
      >
        Research
      </helix-canvas-node>

      <helix-canvas-node
        height={64}
        name="filled"
        separation="filled"
        tone="success"
        width={160}
        x={256}
        y={0}
      >
        Design
      </helix-canvas-node>

      <helix-canvas-node
        height={64}
        name="elevated"
        separation="elevated"
        tone="accent"
        width={160}
        x={0}
        y={160}
      >
        Prototype
      </helix-canvas-node>

      <helix-canvas-node
        height={64}
        name="plain"
        separation="plain"
        width={160}
        x={256}
        y={160}
      >
        Launch
      </helix-canvas-node>

      <helix-canvas-edge
        from="outlined"
        to="filled"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="filled"
        label="optional"
        to="plain"
        variant="dashed"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="outlined"
        label="later"
        to="elevated"
        tone="warning"
        variant="dotted"
      ></helix-canvas-edge>
    </helix-canvas>
  )
}
