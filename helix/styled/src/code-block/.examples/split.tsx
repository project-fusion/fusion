const PATCH = `--- a/src/retry.ts
+++ b/src/retry.ts
@@ -1,6 +1,8 @@
 export async function retry(task, attempts) {
-  for (let tried = 0; tried != attempts; tried++) {
-    try { return await task() } catch {}
+  for (let tried = 0; tried !== attempts; tried += 1) {
+    try {
+      return await task()
+    } catch {}
   }
-  throw new Error('failed')
+  throw new Error(\`failed after \${attempts} attempts\`)
 }
`

export function Example() {
  return (
    <helix-code-block
      diff
      variant="split"
    >
      {PATCH}
    </helix-code-block>
  )
}
