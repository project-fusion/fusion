export function Example() {
  return (
    <helix-log
      label="Test run"
      line-href="#L{n}"
      line-numbers
      selectable
      selected-lines="5-6"
    >
      <helix-log-line>$ bun test styled/button</helix-log-line>
      <helix-log-line>button-root.dom.spec.ts:</helix-log-line>
      <helix-log-line>✓ renders its label in the button part</helix-log-line>
      <helix-log-line>✓ takes the height of the region it is in</helix-log-line>
      <helix-log-line level="error">
        ✗ keeps a long label on one line in a 120px column
      </helix-log-line>
      <helix-log-line level="error">
        {'  expected 1 line, received 2, at button-root.dom.spec.ts:88:42'}
      </helix-log-line>
      <helix-log-line>✓ forwards a press to the form it is in</helix-log-line>
      <helix-log-line>3 passed, 1 failed in 1.4s</helix-log-line>
    </helix-log>
  )
}
