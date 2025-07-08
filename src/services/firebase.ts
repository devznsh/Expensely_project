import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { Alert } from 'react-native';

// Initialize Firebase (make sure you've set up firebase.json)
const firebaseConfig = {
  apiKey: "AIzaSyBZ71iP-T7WvLiB_cjhw6WhNgjeR-ILMnQ",
  authDomain: "expensely-f4c59.firebaseapp.com",
  projectId: "expensely-f4c59",
  storageBucket: "expensely-f4c59.appspot.com",
  messagingSenderId: "1072103831722",
  appId: "1:1072103831722:android:1f34a76fcca966d9a238d3"
};

// Request notification permission and get FCM token
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return getFCMToken();
  }
}

async function getFCMToken() {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    
    // Save token to Firestore or your backend
    const currentUser = auth().currentUser;
    if (currentUser) {
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          fcmTokens: firestore.FieldValue.arrayUnion(token),
        });
    }
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Listen for FCM messages when app is in foreground
function setupForegroundNotifications() {
  return messaging().onMessage(async remoteMessage => {
    console.log('Foreground notification:', remoteMessage);
    // Display the notification to the user
    Alert.alert(
      remoteMessage.notification?.title || 'New notification',
      remoteMessage.notification?.body
    );
  });
}

export {
  auth,
  firestore,
  messaging,
  requestUserPermission,
  getFCMToken,
  setupForegroundNotifications
};