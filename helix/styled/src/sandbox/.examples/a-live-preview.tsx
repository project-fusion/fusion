import './a-live-preview.css'

export function Example() {
  return (
    <div className="stage">
      <helix-sandbox>
        <helix-sandbox-source
          name="html"
          slot="source"
          value="&lt;p&gt;Edited here, drawn beside it.&lt;/p&gt;"
        ></helix-sandbox-source>

        {/* The frame runs with `allow-scripts` and without `allow-same-origin`,
            so code in it cannot reach your page. `src` is the document the
            frame loads, `styles` is the CSS it adds, and `source` is the code
            it runs. */}
        <helix-sandbox-preview
          label="Live preview"
          layout="padded"
          slot="preview"
          source="&lt;p&gt;Edited here, drawn beside it.&lt;/p&gt;"
          src="/sandbox/frame.html"
          styles="p { font: inherit }"
        ></helix-sandbox-preview>
      </helix-sandbox>
    </div>
  )
}
