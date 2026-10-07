const html = `<script type="module" src="./app.ts"></script>
<link rel="stylesheet" href="./app.css" />`

const ts = `import '@fusion.dev/helix/button'

document.querySelector('helix-button')?.addEventListener('click', () => {
  console.log('pressed')
})`

const css = `helix-button {
  --button-radius: 999px;
}`

export function Example() {
  return (
    <helix-code-block file="app.ts">
      <helix-code-block
        label="index.html"
        language="html"
      >
        {html}
      </helix-code-block>
      <helix-code-block
        label="app.ts"
        language="ts"
      >
        {ts}
      </helix-code-block>
      <helix-code-block
        label="app.css"
        language="css"
      >
        {css}
      </helix-code-block>
    </helix-code-block>
  )
}
