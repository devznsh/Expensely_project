// authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;

    // Start listening for SDK auth state changes
    this._observeFirebaseAuthState();
  }

  _observeFirebaseAuthState() {
    auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const userInfo = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
          };

          this.token = idToken;
          this.user = userInfo;

          await AsyncStorage.setItem('token', idToken);
          await AsyncStorage.setItem('user', JSON.stringify(userInfo));
        } catch (err) {
          console.error('Token fetch error:', err);
        }
      } else {
        this.token = null;
        this.user = null;
        await AsyncStorage.multiRemove(['token', 'user']);
      }
    });
  }

  async loadStoredAuth() {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');

      if (token && user) {
        this.token = token;
        this.user = JSON.parse(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('loadStoredAuth error:', error);
      return false;
    }
  }

  async refreshToken() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return null;

      const freshToken = await currentUser.getIdToken(true); // force refresh
      this.token = freshToken;
      await AsyncStorage.setItem('token', freshToken);
      return freshToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  async signOut() {
    try {
      await auth().signOut();
    } catch (error) {
      console.warn('Firebase sign out failed:', error);
    }
    this.token = null;
    this.user = null;
    await AsyncStorage.multiRemove(['token', 'user']);
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.token;
  }
}

export default new AuthService();
