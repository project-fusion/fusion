import './separated.css'

export function Example() {
  return (
    <helix-listbox
      className="listbox"
      label="Sort by"
    >
      <helix-option value="recent">Most recent</helix-option>
      <helix-option value="popular">Most popular</helix-option>
      <helix-option-separator></helix-option-separator>
      <helix-option value="name">Name</helix-option>
      <helix-option value="size">Size</helix-option>
    </helix-listbox>
  )
}
