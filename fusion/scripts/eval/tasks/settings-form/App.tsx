import { useState } from 'react'

export function App() {
  const [language, setLanguage] = useState('en')
  return (
    <form>
      <helix-select
        label="Language"
        name="language"
        onhelix-before-change={(event) => setLanguage(event.detail.value)}
        value={language}
      >
        <helix-option value="en">English</helix-option>
        <helix-option value="es">Spanish</helix-option>
        <helix-option value="fr">French</helix-option>
      </helix-select>
      <helix-button command="--show" commandfor="confirm" emphasis="solid" tone="primary">
        Save
      </helix-button>
      <helix-dialog id="confirm" label="Save settings">
        <helix-text>Save the new language for every device?</helix-text>
        <helix-button command="--close" commandfor="confirm" slot="footer">
          Save
        </helix-button>
      </helix-dialog>
    </form>
  )
}
