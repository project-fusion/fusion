export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-number-input
        default-value="120"
        hint="Drag the label. Hold Shift for steps of 10, or Alt to drag slowly."
        label="Weight"
        max={500}
        min={0}
        scrub
        step={5}
      >
        <span slot="end">kg</span>
      </helix-number-input>

      <helix-number-input
        default-value="2.5"
        hint="Changes in steps of 0.25."
        label="Dose"
        max={10}
        min={0}
        scrub
        step={0.25}
      >
        <span slot="end">ml</span>
      </helix-number-input>
    </helix-flex>
  )
}
