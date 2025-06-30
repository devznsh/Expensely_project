import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native'; 
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import FireAuth from './src/fireauth/fireauth'; 
import Layout from './src/app/_layout';          

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {user ? <Layout /> : <FireAuth />}
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
