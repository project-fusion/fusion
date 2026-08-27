import './grouped.css'

export function Example() {
  return (
    <>
      {/* Hand-written owner: `role="option"` requires one. */}
      <div aria-label="Label" className="listbox" role="listbox">
        <helix-option-group label="Group One">
          <helix-option selected value="one">
            Option One
          </helix-option>
          <helix-option value="two">Option Two</helix-option>
        </helix-option-group>
        <helix-option-group label="Group Two">
          <helix-option value="three">Option Three</helix-option>
          <helix-option value="four">Option Four</helix-option>
        </helix-option-group>
      </div>
    </>
  )
}
