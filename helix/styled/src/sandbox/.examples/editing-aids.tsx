export function Example() {
  return (
    <helix-sandbox-source
      close-brackets
      complete
      completions={['helix-button', 'helix-card', 'helix-input']}
      line-numbers
      match-brackets
      name="js"
      value={'const greet = (name) => {\n  console.log(name)\n}'}
    />
  )
}
