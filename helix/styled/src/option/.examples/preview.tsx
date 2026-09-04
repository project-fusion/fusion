import './preview.css'

export function Example() {
  return (
    <>
      {/* Hand-written owner: `role="option"` requires one. */}
      <div
        aria-label="Label"
        className="listbox"
        role="listbox"
      >
        <helix-option
          selected
          value="one"
        >
          Option One
        </helix-option>
        <helix-option
          data-active
          value="two"
        >
          Option Two
        </helix-option>
        <helix-option value="three">Option Three</helix-option>
        <helix-option
          disabled
          value="four"
        >
          Option Four
        </helix-option>
      </div>
    </>
  )
}
