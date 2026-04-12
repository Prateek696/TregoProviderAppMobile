/**
 * @format
 */

import { AppRegistry } from 'react-native';
import './src/i18n'; // Initialize i18n before anything else
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
