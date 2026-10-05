const code = `import '@fusion.dev/helix/button'

const save = document.querySelector('helix-button')
save?.addEventListener('click', () => {
  console.log('Saved')
})`

export function Example() {
  return (
    <helix-code-block
      label="save.ts"
      line-numbers
    >
      {code}
    </helix-code-block>
  )
}
