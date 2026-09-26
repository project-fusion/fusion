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
        <helix-headless-option
          selected
          value="one"
        >
          Alex Kim
        </helix-headless-option>
        <helix-headless-option
          data-active
          value="two"
        >
          Sam Patel
        </helix-headless-option>
        <helix-headless-option value="three">Jordan Lee</helix-headless-option>
        <helix-headless-option
          disabled
          value="four"
        >
          Priya Shah
        </helix-headless-option>
      </div>
    </>
  )
}
