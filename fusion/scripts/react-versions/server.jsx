import { renderToString } from 'react-dom/server'
import { App } from './app.jsx'

/** The page's markup, as the version's own server renderer writes it. */
export const render = () => renderToString(<App />)
