import axios from 'axios';
import auth from '@react-native-firebase/auth';
const api = axios.create({
  baseURL: 'http://10.0.2.2:1234/api', // Replace with your server URL in production
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 403) {
        // Handle unauthorized access
        console.error('Authentication error:', error);
        // You might want to redirect to login here
      }
    }
    return Promise.reject(error);
  }
);

export default api;