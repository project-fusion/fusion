import './vertical.css'

export function Example() {
  return (
    <helix-headless-button-group
      label="Export"
      orientation="vertical"
    >
      <helix-headless-button>Download CSV</helix-headless-button>
      <helix-headless-button>Download JSON</helix-headless-button>
      <helix-headless-button>Copy to clipboard</helix-headless-button>
    </helix-headless-button-group>
  )
}
