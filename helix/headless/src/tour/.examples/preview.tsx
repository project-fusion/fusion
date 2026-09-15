import './preview.css'

import { useState } from 'react'

export function Example() {
  /* Preview frame: a real page would remember it had been taken. Opening is the
     page's business, the way a dialog's is. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="app">
        {' '}
        <aside
          className="rail"
          id="rail"
        >
          {' '}
          <p>Project</p> <p>Drafts</p> <p>Published</p> <p>Archive</p>{' '}
        </aside>{' '}
        <div className="main">
          {' '}
          <header className="bar">
            {' '}
            <helix-headless-button id="publish">Publish</helix-headless-button>{' '}
            <helix-headless-button id="preview">Preview</helix-headless-button>{' '}
            <helix-headless-icon-button
              id="settings"
              label="Settings"
            >
              {' '}
              <helix-headless-icon name="gear"></helix-headless-icon>{' '}
            </helix-headless-icon-button>{' '}
          </header>{' '}
          <section
            className="sheet"
            id="sheet"
          >
            {' '}
            <h2>Quarterly review</h2>{' '}
            <p>
              {' '}
              A draft nobody has read yet. Everything below this line is the part you are still
              writing.{' '}
            </p>{' '}
          </section>{' '}
        </div>{' '}
      </div>{' '}
      <helix-headless-button
        onClick={() => {
          setIndex(0)
          setOpen(true)
        }}
      >
        Take the tour
      </helix-headless-button>{' '}
      <helix-headless-tour
        index={index}
        label="Getting started"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        open={open}
      >
        {' '}
        <helix-headless-tour-stop
          for="rail"
          placement="right-start"
        >
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">Everything lives here</h3>{' '}
            <p> Drafts, published work and the archive. Nothing is ever deleted. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop for="sheet">
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">Write in the open</h3>{' '}
            <p>
              {' '}
              Saved as you type. There is no save button because there is nothing to press.{' '}
            </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop
          for="preview"
          placement="bottom"
        >
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">See it as a reader would</h3>{' '}
            <p> Opens the same page anybody with the link gets. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop
          for="publish"
          placement="bottom-start"
        >
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">And when it is ready</h3>{' '}
            <p> Publishing is reversible. The archive keeps every version you ever had. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
      </helix-headless-tour>
    </>
  )
}
