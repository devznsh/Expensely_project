import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  useColorScheme
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define theme colors
const lightTheme = {
  background: '#ffffff',
  text: '#000000',
  primary: '#007AFF',
  border: '#E5E5E7',
  card: '#F2F2F7',
  notification: '#FF3B30',
};

const darkTheme = {
  background: '#000000',
  text: '#ffffff',
  primary: '#0A84FF',
  border: '#38383A',
  card: '#1C1C1E',
  notification: '#FF453A',
};

const AuthScreen = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const appState = useRef(AppState.currentState);
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Sign-In
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        GoogleSignin.configure({
          webClientId: '1072103831722-fhlgrkjc467tbn2o0jgn8v7vb2pu1d1s.apps.googleusercontent.com',
          offlineAccess: true,
        });

        // Load last login from storage
        const storedLastLogin = await AsyncStorage.getItem('lastLogin');
        if (storedLastLogin) {
          setLastLogin(storedLastLogin);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initializeAuth();

    const authStateUnsubscribe = auth().onAuthStateChanged(async (authUser) => {
      try {
        if (authUser) {
          const time = new Date().toLocaleString();
          await AsyncStorage.setItem('lastLogin', time);
          setLastLogin(time);
          setUser(authUser);
          startAutoLogoutTimer();
        } else {
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      authStateUnsubscribe();
      appStateSubscription.remove();
      stopAutoLogoutTimer();
    };
  }, []);

  const handleAppStateChange = (nextAppState: any) => {
    if (appState.current.match(/active/) && nextAppState === 'background') {
      stopAutoLogoutTimer();
    }
    if (appState.current.match(/background/) && nextAppState === 'active') {
      startAutoLogoutTimer();
    }
    appState.current = nextAppState;
  };

  const startAutoLogoutTimer = () => {
    stopAutoLogoutTimer();
    logoutTimer.current = setTimeout(() => {
      signOut(true);
    }, 30 * 60 * 1000); // 30 minutes
  };

  const stopAutoLogoutTimer = () => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        await auth().createUserWithEmailAndPassword(email, password);
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error: any) {
      let errorMessage = 'Authentication failed';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/user-not-found':
          errorMessage = 'User not found';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password';
          break;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
  try {
    setLoading(true);
    // Check if your device has Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Get the user's ID token
    const { idToken, serverAuthCode } = await GoogleSignin.signIn();
    
    if (!idToken) {
      // Try to get tokens silently if initial sign-in didn't return idToken
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      // Create a Google credential with the token
      const credential = auth.GoogleAuthProvider.credential(tokens.idToken);
      await auth().signInWithCredential(credential);
      return;
    }
    
    // Create a Google credential with the token
    const credential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
  } catch (error: any) {
    setLoading(false);
    console.error('Google Sign-In Error:', error);
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return; // User cancelled, don't show error
    } else if (error.code === statusCodes.IN_PROGRESS) {
      Alert.alert('Error', 'Sign in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert('Error', 'Google Play Services not available');
    } else {
      Alert.alert('Error', error.message || 'Sign in failed');
    }
  }
};

  const signOut = async (expired = false) => {
  try {
    setLoading(true);
    
    // Sign out from Firebase
    await auth().signOut();
    
    // Try to sign out from Google (no need to check if signed in first)
    try {
      await GoogleSignin.signOut();
    } catch (googleSignOutError) {
      console.log('Google Sign-Out Error:', googleSignOutError);
      // Continue with logout even if Google sign-out fails
    }
    
    // Clear local storage
    await AsyncStorage.removeItem('lastLogin');
    
    // Reset state
    setUser(null);
    setLastLogin(null);
    setEmail('');
    setPassword('');
    stopAutoLogoutTimer();
    
    if (expired) {
      Alert.alert('Session Expired', 'You have been logged out due to inactivity');
    }
  } catch (error) {
    console.error('Sign out error:', error);
    Alert.alert('Error', 'Failed to sign out');
  } finally {
    setLoading(false);
  }
};
  const resetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      await auth().sendPasswordResetEmail(email.trim());
      Alert.alert('Success', 'Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo placeholder */}
            <View style={[styles.logoPlaceholder, { backgroundColor:'white' }]}>
            <Image
  source={require('./assets/logo.png')}
  style={styles.logoImage}
/>
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Email"
                placeholderTextColor={colors.text + '80'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.text + '80'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons name="visibility" size={24} color="black" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.primary }]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.text }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={onGoogleButtonPress}
              disabled={loading}
            >
              <View style={styles.googleIconPlaceholder}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View style={styles.switchAuthContainer}>
              <Text style={{ color: colors.text }}>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={[styles.switchAuthText, { color: colors.primary }]}>
                  {isLogin ? ' Sign Up' : ' Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity onPress={resetPassword} disabled={loading}>
                <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.profileContainer}>
        <View style={styles.profileHeader}>
          {user.photoURL ? (
            <Image 
              source={{ uri: user.photoURL }} 
              style={styles.avatar}
              onError={() => console.log('Avatar image failed to load')}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Text style={[styles.name, { color: colors.text }]}>
            {user.displayName || 'User'}
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {user.email}
          </Text>
          {lastLogin && (
            <Text style={[styles.lastLogin, { color: colors.text + '80' }]}>
              Last active: {lastLogin}
            </Text>
          )}
        </View>

        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => {
              Alert.alert('Settings', 'Settings screen not implemented yet');
            }}
          >
            <Icon name="settings" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => {
              Alert.alert('Edit Profile', 'Edit profile screen not implemented yet');
            }}
          >
            <Icon name="edit" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.notification }]}
          onPress={() => signOut()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.notification} />
          ) : (
            <Text style={[styles.logoutButtonText, { color: colors.notification }]}>
              Sign Out
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoPlaceholder: {
  width: 80,
  height: 80,
  borderRadius: 40, 
  alignSelf: 'center',
  marginBottom: 32,
  justifyContent: 'center',
  alignItems: 'center',
},
  logoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoImage: {
  width: 60,
  height: 60,
  resizeMode: 'contain',
},
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  authButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleIconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchAuthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  switchAuthText: {
    fontWeight: 'bold',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: 8,
  },
  profileContainer: {
    flexGrow: 1,
    padding: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    marginBottom: 8,
  },
  lastLogin: {
    fontSize: 14,
  },
  profileActions: {
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  actionButtonText: {
    marginLeft: 16,
    fontSize: 16,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AuthScreen;