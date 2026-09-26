import './grouped.css'

export function Example() {
  return (
    <>
      {/* An option needs a parent with `role="listbox"`. */}
      <div
        aria-label="Assignee"
        className="listbox"
        role="listbox"
      >
        <helix-option-group label="Design">
          <helix-option
            selected
            value="one"
          >
            Alex Kim
          </helix-option>
          <helix-option value="two">Sam Patel</helix-option>
        </helix-option-group>
        <helix-option-group label="Engineering">
          <helix-option value="three">Jordan Lee</helix-option>
          <helix-option value="four">Priya Shah</helix-option>
        </helix-option-group>
      </div>
    </>
  )
}
