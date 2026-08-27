export function Example() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-number-input
        default-value="120"
        hint="Drag the label. Hold Shift for tens, Alt for a slower hand."
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
        hint="A step of 0.25, which the drag lands on and never between."
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
