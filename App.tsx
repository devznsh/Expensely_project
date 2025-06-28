import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
// import FireAuth from './src/pages/fireauth';
import OCR from './src/ocr/ocr'; 

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <OCR />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
