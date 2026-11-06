import './selection.css'

export function Example() {
  return (
    <helix-headless-button-group
      label="Text style"
      selection-mode="multiple"
      value="bold"
    >
      <helix-headless-button value="bold">Bold</helix-headless-button>
      <helix-headless-button value="italic">Italic</helix-headless-button>
      <helix-headless-button value="underline">Underline</helix-headless-button>
    </helix-headless-button-group>
  )
}
