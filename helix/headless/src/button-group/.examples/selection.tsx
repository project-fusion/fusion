import './selection.css'

export function Example() {
  return (
    <helix-headless-button-group
      label="Calendar view"
      selection-mode="single"
      value="week"
    >
      <helix-headless-button value="day">Day</helix-headless-button>
      <helix-headless-button value="week">Week</helix-headless-button>
      <helix-headless-button value="month">Month</helix-headless-button>
    </helix-headless-button-group>
  )
}
