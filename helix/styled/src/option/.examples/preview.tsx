import './preview.css'

export function Example() {
  return (
    <>
      {/* An option needs a parent with `role="listbox"`. */}
      <div
        aria-label="Assignee"
        className="listbox"
        role="listbox"
      >
        <helix-option
          selected
          value="one"
        >
          Alex Kim
        </helix-option>
        <helix-option
          data-active
          value="two"
        >
          Sam Patel
        </helix-option>
        <helix-option value="three">Jordan Lee</helix-option>
        <helix-option
          disabled
          value="four"
        >
          Priya Shah
        </helix-option>
      </div>
    </>
  )
}
