/**
 * @format
 */

// Must be the very first import in the app — react-native-gesture-handler
// patches the native touch system at load time.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
