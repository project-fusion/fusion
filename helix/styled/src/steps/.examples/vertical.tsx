export function Example() {
  return (
    <helix-steps
      label="Label"
      orientation="vertical"
    >
      <helix-step
        complete
        value="one"
      >
        Step One
        <span slot="description">Lorem ipsum dolor sit amet</span>
      </helix-step>
      <helix-step
        current
        value="two"
      >
        Step Two
        <span slot="description">Sed do eiusmod tempor</span>
      </helix-step>
      <helix-step value="three">
        Step Three
        <span slot="description">Ut enim ad minim veniam</span>
      </helix-step>
    </helix-steps>
  )
}
