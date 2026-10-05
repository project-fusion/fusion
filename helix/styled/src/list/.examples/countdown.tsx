export function Example() {
  return (
    <helix-list
      kind="ordered"
      label="Top languages"
      reversed
      start={5}
    >
      <helix-list-item>Rust</helix-list-item>
      <helix-list-item>Go</helix-list-item>
      <helix-list-item>Python</helix-list-item>
      <helix-list-item>TypeScript</helix-list-item>
      <helix-list-item>Kotlin</helix-list-item>
    </helix-list>
  )
}
