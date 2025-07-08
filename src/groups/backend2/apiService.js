// apiService.js
import authService from './authService';

const BASE_URL = 'http://10.0.2.2:1234/api';  

class ApiService {
  async request(endpoint, options = {}) {
    const token = authService.getToken();
    const url = `${BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Groups
  async getGroups() {
    return this.request('/groups');
  }

  async createGroup(name, members) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, members })
    });
  }

  async getGroupDetails(groupId) {
    return this.request(`/groups/${groupId}`);
  }

  // Expenses
  async createExpense(groupId, expense) {
    return this.request(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense)
    });
  }

  async getExpenses(groupId) {
    return this.request(`/groups/${groupId}/expenses`);
  }

  // Notifications
  async sendPaymentReminder(groupId, memberId) {
    return this.request(`/groups/${groupId}/remind`, {
      method: 'POST',
      body: JSON.stringify({ memberId })
    });
  }
}

export default new ApiService();