/**
 * The capture driver: the Node half of `proof`, which runs Playwright.
 *
 * **Empty until capture exists, and shipped now so the package has its final
 * shape.** The binary will start this once per run and stream it one request per
 * picture as JSON lines on standard input, reading the answers on standard
 * output. Its interface is written with the first command that calls it, so
 * nothing here describes a protocol no code speaks yet.
 *
 * **Node and Playwright, decided on October 8, 2026.** Chromium's work is about
 * 94% of the time of a picture, so a capture written in Rust over the browser
 * protocol is the same speed. It would also lose what Playwright already tests:
 * auto-waiting, disabled animations, request routing, media emulation,
 * `ariaSnapshot()`, Firefox and WebKit, and `playwright install --with-deps`.
 */
export {}
