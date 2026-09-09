/**
 * Dev-only LogBox filters. Imported for its side effect, before anything else.
 *
 * This MUST be its own module. ES imports are hoisted, so a `LogBox.ignoreLogs`
 * call written at the top of index.js still runs AFTER `import App` — and by
 * then react-navigation has already emitted its deprecation. Only a separate
 * module, imported first, is guaranteed to execute before App's import graph.
 *
 * The toast this suppresses is not merely noise: it renders over the game's
 * action row and swallows taps on Hint / Undo / Reset.
 */

import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  // react-navigation pulls in DrawerLayoutAndroid, which RN 0.87 deprecates.
  // Nothing we can act on until react-navigation drops it.
  'DrawerLayoutAndroid is deprecated',
]);
