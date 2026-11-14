/*
 * A renderer that names itself as one that draws on the CPU, for the
 * conformance halves of the families that draw a field with WebGL, Aura and
 * Strands.
 *
 * **Their records hold what a reader hears, never the field**, which is out of
 * a screen reader's reach on both platforms, so a scenario has nothing to gain
 * from the shader and everything to lose to its cost. Headless Chromium is
 * SwiftShader, which the elements already decline for their gradient. Linux
 * WebKit draws on Mesa's llvmpipe but names itself `Apple GPU`, so the
 * elements drew there: under CI's WebKit each frame of a running aura held the
 * page for seconds, and the scenario that presses the pause control twice ran
 * out of time. Named as software, every browser runs the scenario on the
 * gradient, as a phone without react-native-skia does.
 */

/** `UNMASKED_RENDERER_WEBGL`, which a stubbed extension has to carry itself. */
const UNMASKED_RENDERER = 0x9246

/** A real software name, as ANGLE reports SwiftShader. */
const SOFTWARE =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)'

type Asked = (this: WebGL2RenderingContext, asked: never) => unknown

/**
 * Makes `WEBGL_debug_renderer_info` name a software renderer, and gives back
 * the undo. A no-op where there is no WebGL at all.
 */
export const drawInSoftware = (): (() => void) => {
  const proto = globalThis.WebGL2RenderingContext?.prototype
  if (!proto) {
    return () => {}
  }
  const extension = proto.getExtension as Asked
  const parameter = proto.getParameter as Asked
  proto.getExtension = function (this: WebGL2RenderingContext, asked: string) {
    return asked === 'WEBGL_debug_renderer_info'
      ? { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER }
      : extension.call(this, asked as never)
  } as WebGL2RenderingContext['getExtension']
  proto.getParameter = function (this: WebGL2RenderingContext, asked: number) {
    return asked === UNMASKED_RENDERER ? SOFTWARE : parameter.call(this, asked as never)
  } as WebGL2RenderingContext['getParameter']
  return () => {
    proto.getExtension = extension as WebGL2RenderingContext['getExtension']
    proto.getParameter = parameter as WebGL2RenderingContext['getParameter']
  }
}
