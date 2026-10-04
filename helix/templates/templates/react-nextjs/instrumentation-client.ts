/* **Diagnostics in development, and none of it in a build.** Next.js runs this
   file in the browser before the app hydrates, and replaces
   `process.env.NODE_ENV` when it builds, which drops the import with it. */
if (process.env.NODE_ENV === 'development') {
  void import('./app/diagnostics')
}
