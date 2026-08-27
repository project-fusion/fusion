export function Example() {
  return (
    <helix-steps label="Label" orientation="vertical">
      <helix-step complete value="one">
        Step One
        <helix-text slot="content">Lorem ipsum dolor sit amet, consectetur.</helix-text>
      </helix-step>
      <helix-step current value="two">
        Step Two
        <helix-text slot="content">Adipiscing elit, sed do eiusmod tempor incididunt.</helix-text>
      </helix-step>
      <helix-step value="three">
        Step Three
        <helix-text slot="content">Ut labore et dolore magna aliqua.</helix-text>
      </helix-step>
    </helix-steps>
  )
}
