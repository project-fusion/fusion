/**
 * The renderers that draw on the CPU, as ANGLE and Mesa name themselves.
 *
 * SwiftShader is Chromium's own, which every headless browser and every machine
 * with no usable GPU falls back to; `llvmpipe` and `softpipe` are Mesa's;
 * "Software Rasterizer" and Microsoft's "Basic Render Driver" are what Windows
 * answers without a driver. Matched on the unmasked name rather than on a
 * vendor, because ANGLE reports the same vendor either way: on this machine
 * `Google Inc. (Google)` for SwiftShader and `Google Inc. (Apple)` for Metal.
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software rasterizer|basic render/i

/**
 * Whether WebGL here is drawn on the CPU, asked before one is drawn into.
 *
 * Shared by the elements that draw a decorative field with WebGL, `Aura` and
 * `Strands`, which take their gradient on a software renderer rather than pay
 * for a shader nobody can see at speed.
 *
 * **The shader costs what a GPU makes it cheap to ask for.** Measured on Aura,
 * 15 Sep 2026: on Metal the browser shares the compiled program and each aura
 * after the first draws its opening frame in about 2ms, while under SwiftShader
 * nothing is shared and each one compiles the pipeline again for about 450ms.
 * On a page of 720 pixel auras the worst frame gap went 568ms to 50ms with one
 * aura, 1626ms to 34ms with three and 3200ms to 42ms with six once this check
 * was in place, and a page of three or six ran at 13 frames a second before and
 * at the display's own rate after.
 *
 * **The unmasked name is the only one that answers.** `gl.RENDERER` is masked
 * to `WebKit WebGL` on Chromium, the same string on SwiftShader and on Metal,
 * and `WEBGL_debug_renderer_info` is what lifts the mask.
 *
 * **An unreadable renderer draws**, which is the safe direction and not the
 * tidy one. The extension is optional and is withheld deliberately: Firefox's
 * `privacy.resistFingerprinting` and Safari's equivalent both drop it, and a
 * browser may drop it at any time, since a GPU name is a fingerprinting
 * surface. Treating "we cannot tell" as software would take the shader away
 * from every reader on a machine that hides its hardware, which is a real GPU
 * far more often than not.
 *
 * **A probe context of its own, and given straight back.** Asking the caller's
 * own canvas would spend it, and the probe has to release what it took or a
 * page of fields runs the browser into its cap of about sixteen contexts. One
 * pixel by one, and released through `WEBGL_lose_context`.
 *
 * **The same attributes the real context asks for**, because they are part of
 * the question: `powerPreference` can select a different adapter, so a probe
 * asking for a high-performance context would name a GPU the drawing one is
 * never given.
 *
 * **Asked per context rather than once for the page.** The answer is not fixed:
 * a GPU process that crashes takes the page down to SwiftShader for the rest of
 * its life, and a field rebuilding after that should get the current answer. It
 * costs a context creation and two calls, about 2ms, once per context.
 *
 * @param attributes What the caller's drawing context asks for.
 * @returns `true` only when the renderer names itself as one that draws on the
 *   CPU. No WebGL at all, or a name it cannot read, answers `false`.
 */
export function drawsInSoftware(attributes: WebGLContextAttributes): boolean {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const gl = probe.getContext('webgl2', attributes)
  if (!gl) {
    /* No WebGL at all, which the caller is about to discover for itself and
       answer with its own fallback. Not this function's call to make. */
    return false
  }
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const name = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return typeof name === 'string' && SOFTWARE_RENDERER.test(name)
}
