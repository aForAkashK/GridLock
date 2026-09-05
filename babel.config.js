module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated 4 ships its worklet transform via react-native-worklets.
    // MUST stay last in the plugin list.
    'react-native-worklets/plugin',
  ],
};
