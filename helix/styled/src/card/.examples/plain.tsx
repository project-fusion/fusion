export function Example() {
  return (
    <helix-card aria-labelledby="plain-title" separation="plain">
      <h3 id="plain-title" slot="header">
        Plain
      </h3>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
      labore.
      <helix-button emphasis="ghost" slot="footer">
        Action
      </helix-button>
    </helix-card>
  )
}
