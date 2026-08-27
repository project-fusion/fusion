import './preview.css'

export function Example() {
  return (
    <>
      {/* Hand-written owner: `role="option"` requires one. */}
      <div aria-label="Label" className="listbox" role="listbox">
        <helix-headless-option selected value="one">
          Option One
        </helix-headless-option>
        <helix-headless-option data-active value="two">
          Option Two
        </helix-headless-option>
        <helix-headless-option value="three">Option Three</helix-headless-option>
        <helix-headless-option disabled value="four">
          Option Four
        </helix-headless-option>
      </div>
    </>
  )
}
