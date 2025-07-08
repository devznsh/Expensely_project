import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  StyleSheet, 
  ScrollView,
  Dimensions,
  Animated 
} from 'react-native';
import authService from '../groups/backend2/authService';
import apiService from '../groups/backend2/apiService';
import messaging from '@react-native-firebase/messaging';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface User {
  email: string;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

interface Member {
  email: string;
  name?: string;
  joined?: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
}

const GroupsScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const isLoggedIn = await authService.loadStoredAuth();
    if (isLoggedIn) {
      const currentUser = authService.getUser();
      setUser(currentUser);
      await subscribeToUserTopic(currentUser?.email || '');
      loadGroups();
      setupNotifications();
    }
  };

  const subscribeToUserTopic = async (email: string) => {
    const topic = `user_${email.replace(/[@.]/g, '_')}`;
    await messaging().subscribeToTopic(topic);
    console.log(`Subscribed to topic: ${topic}`);
  };

  const setupNotifications = async () => {
    const permission = await messaging().requestPermission();
    if (permission) {
      messaging().onMessage(async remoteMessage => {
        Alert.alert(
          remoteMessage.notification?.title || 'Notification',
          remoteMessage.notification?.body || ''
        );
      });
    }
  };

  const handleAuth = async (isSignUp = false) => {
    try {
      setLoading(true);
      const result = isSignUp 
        ? await authService.signUp(email, password)
        : await authService.signIn(email, password);

      if (result.user) {
        setUser(result.user);
        setEmail('');
        setPassword('');
        await subscribeToUserTopic(result.user.email);
        loadGroups();
        setupNotifications();
      }
    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert('Auth Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await apiService.getGroups();
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName || !memberEmail || !user) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(memberEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (memberEmail === user.email) {
      Alert.alert('Error', 'You cannot add yourself as a member');
      return;
    }

    try {
      setLoading(true);
      await apiService.createGroup(groupName, [user.email, memberEmail]);
      setGroupName('');
      setMemberEmail('');
      loadGroups();
      Alert.alert('Success', `Group "${groupName}" created and invitation sent to ${memberEmail}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    try {
      setLoading(true);
      const expensesData = await apiService.getExpenses(group.id);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!expenseDesc || !expenseAmount || !selectedGroup || !user) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await apiService.createExpense(selectedGroup.id, {
        description: expenseDesc,
        amount: amount,
        paidBy: user.email,
        splitBetween: selectedGroup.members.map((m: Member) => m.email)
      });

      setExpenseDesc('');
      setExpenseAmount('');
      selectGroup(selectedGroup);
      Alert.alert('Success', 'Expense added and notifications sent!');
    } catch (error) {
      console.error('Failed to add expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (memberEmail: string) => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      await apiService.sendPaymentReminder(selectedGroup.id, memberEmail);
      Alert.alert('Success', `Payment reminder sent to ${memberEmail}!`);
    } catch (error) {
      console.error('Failed to send reminder:', error);
      Alert.alert('Error', 'Failed to send reminder');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
    setGroups([]);
    setSelectedGroup(null);
    setExpenses([]);
  };

  const getMemberDisplayName = (member: Member) => {
    if (member.name) return member.name;
    return member.email.split('@')[0];
  };

  const calculateGroupTotal = (group: Group) => {
    // This would need to be implemented based on your expense data
    return 0; // Placeholder
  };

  // Auth Screen
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authHeader}>
          <View style={styles.logoContainer}>
            <Icon name="account-balance-wallet" size={40} color="#5D5FEF" />
          </View>
          <Text style={styles.authTitle}>Expensely</Text>
          <Text style={styles.authSubtitle}>Manage your group expenses effortlessly</Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={() => handleAuth(false)}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authButtonSecondary, loading && styles.authButtonDisabled]}
            onPress={() => handleAuth(true)}
            disabled={loading}
          >
            <Text style={styles.authButtonSecondaryText}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Group Detail Screen
  if (selectedGroup) {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const userShare = totalExpenses / selectedGroup.members.length;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedGroup(null)}
          >
            <Icon name="arrow-back" size={24} color="#5D5FEF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedGroup.name}</Text>
            <Text style={styles.headerSubtitle}>{selectedGroup.members.length} members</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Expense Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Icon name="analytics" size={24} color="#5D5FEF" />
              <Text style={styles.summaryTitle}>Expense Summary</Text>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{totalExpenses.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{userShare.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Your Share</Text>
              </View>
            </View>
          </View>

          {/* Add Expense Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="add-circle" size={20} color="#5D5FEF" />
              <Text style={styles.sectionTitle}>Add Expense</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="description" size={20} color="#5D5FEF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="What did you spend on?"
                value={expenseDesc}
                onChangeText={setExpenseDesc}
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="currency-rupee" size={20} color="#5D5FEF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Amount"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                keyboardType="numeric"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={addExpense}
              disabled={loading}
            >
              <Icon name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>
                {loading ? 'Adding...' : 'Add Expense'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expenses List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="receipt" size={20} color="#5D5FEF" />
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
            </View>
            
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="receipt-long" size={48} color="#E0E0E0" />
                <Text style={styles.emptyStateText}>No expenses yet</Text>
                <Text style={styles.emptyStateSubtext}>Add your first expense to get started</Text>
              </View>
            ) : (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseIcon}>
                    <Icon name="receipt" size={20} color="#5D5FEF" />
                  </View>
                  <View style={styles.expenseContent}>
                    <Text style={styles.expenseDescription}>{expense.description}</Text>
                    <Text style={styles.expensePaidBy}>Paid by {expense.paidBy}</Text>
                  </View>
                  <View style={styles.expenseAmount}>
                    <Text style={styles.expenseAmountText}>₹{expense.amount.toFixed(0)}</Text>
                    <Text style={styles.expensePerPerson}>
                      ₹{(expense.amount / selectedGroup.members.length).toFixed(0)} per person
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Group Members */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="group" size={20} color="#5D5FEF" />
              <Text style={styles.sectionTitle}>Group Members</Text>
            </View>
            
            {selectedGroup.members.map(member => (
              member.email !== user?.email && (
                <View key={member.email} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Icon name="person" size={20} color="#5D5FEF" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{getMemberDisplayName(member)}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    <View style={styles.memberStatusContainer}>
                      <View style={[
                        styles.memberStatusDot,
                        { backgroundColor: member.joined ? '#4CAF50' : '#FF9800' }
                      ]} />
                      <Text style={styles.memberStatus}>
                        {member.joined ? 'Joined' : 'Invited'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reminderButton}
                    onPress={() => sendReminder(member.email)}
                  >
                    <Icon name="notifications" size={16} color="#5D5FEF" />
                    <Text style={styles.reminderButtonText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              )
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Groups List Screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeSubtitle}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Icon name="logout" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Create Group Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="group-add" size={20} color="#5D5FEF" />
            <Text style={styles.sectionTitle}>Create New Group</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="group" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Group Name"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="person-add" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Member Email"
              value={memberEmail}
              onChangeText={setMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={createGroup}
            disabled={loading}
          >
            <Icon name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Creating...' : 'Create Group'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="groups" size={20} color="#5D5FEF" />
            <Text style={styles.sectionTitle}>Your Groups</Text>
          </View>
          
          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="groups" size={48} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>No groups yet</Text>
              <Text style={styles.emptyStateSubtext}>Create your first group to start tracking expenses</Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupItem}
                onPress={() => selectGroup(group)}
              >
                <View style={styles.groupIcon}>
                  <Icon name="group" size={24} color="#5D5FEF" />
                </View>
                <View style={styles.groupContent}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>
                    {group.members.map(member => getMemberDisplayName(member)).join(', ')}
                  </Text>
                  <View style={styles.groupStats}>
                    <View style={styles.groupStat}>
                      <Icon name="people" size={14} color="#7F8C8D" />
                      <Text style={styles.groupStatText}>{group.members.length} members</Text>
                    </View>
                    <View style={styles.groupStat}>
                      <Icon name="account-balance-wallet" size={14} color="#7F8C8D" />
                      <Text style={styles.groupStatText}>₹{calculateGroupTotal(group)}</Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color="#E0E0E0" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  
  // Auth Screen Styles
  authHeader: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    backgroundColor: '#E8E9FF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 30,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  authButton: {
    backgroundColor: '#5D5FEF',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5D5FEF',
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
  },
  authButtonDisabled: {
    backgroundColor: '#B0BEC5',
    borderColor: '#B0BEC5',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonSecondaryText: {
    color: '#5D5FEF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Layout Styles
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },

  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },

  // Button Styles
  primaryButton: {
    backgroundColor: '#5D5FEF',
    borderRadius: 15,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Summary Card Styles
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Expense Item Styles
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
  },
  expenseIcon: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseContent: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  expensePaidBy: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expenseAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  expensePerPerson: {
    fontSize: 12,
    color: '#7F8C8D',
  },

  // Group Item Styles
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
  },
  groupIcon: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  groupStatText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },

  // Member Item Styles
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  memberStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  memberStatus: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  reminderButton: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderButtonText: {
    color: '#5D5FEF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default GroupsScreen;