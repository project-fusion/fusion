const PATCH = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,4 +10,5 @@ export const config = {
   retries: 3,
-  timeout: 1000,
+  timeout: 5000,
+  backoff: 'exponential',
   region: 'us-east-1',
 }
`

export function Example() {
  return <helix-code-block diff>{PATCH}</helix-code-block>
}
