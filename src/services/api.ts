import axios from 'axios';

export const API = axios.create({
  baseURL: 'http://10.0.2.2:6000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
