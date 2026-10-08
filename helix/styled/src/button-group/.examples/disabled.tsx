export function Example() {
  return (
    <helix-button-group
      disabled
      label="Calendar view"
      selection-mode="single"
      value="week"
    >
      <helix-button value="day">Day</helix-button>
      <helix-button value="week">Week</helix-button>
      <helix-button value="month">Month</helix-button>
    </helix-button-group>
  )
}
