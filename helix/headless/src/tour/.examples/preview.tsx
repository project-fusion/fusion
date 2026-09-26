import './preview.css'

import { useState } from 'react'

export function Example() {
  /* Preview frame: the button opens the tour at its first stop. A real page
     would also remember that the tour was taken. */
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
              A draft of the third quarter report. Add a summary and the results for each team
              before you publish.{' '}
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
            <h3 slot="header">Find your documents</h3>{' '}
            <p> Drafts, published documents, and archived documents are listed here. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop for="sheet">
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">Write your document</h3>{' '}
            <p> Your changes are saved as you type. You can close the page at any time. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop
          for="preview"
          placement="bottom"
        >
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">Preview your document</h3>{' '}
            <p> See the document as it looks to people with the link. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
        <helix-headless-tour-stop
          for="publish"
          placement="bottom-start"
        >
          {' '}
          <helix-headless-card>
            {' '}
            <h3 slot="header">Publish when you are ready</h3>{' '}
            <p> You can unpublish at any time. The archive keeps every earlier version. </p>{' '}
          </helix-headless-card>{' '}
        </helix-headless-tour-stop>{' '}
      </helix-headless-tour>
    </>
  )
}
