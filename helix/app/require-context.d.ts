/* Metro's `require.context`, which gathers the proof app's route tree for
   Expo Router as its own entry does. */
declare const require: {
  context(directory: string, deep: boolean, filter: RegExp): import('expo-router').RequireContext
}
