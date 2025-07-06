import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { CompositeNavigationProp} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import ExpenseCard from '../components/ExpenseCard';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
type RootStackParamList = {
  Tabs: undefined;
  AddExpense: undefined;
  SetBudget: undefined;
  Reports: undefined;
  ScanReceipt: undefined;
  LoginScreen:undefined;
};
type TabParamList = {
  Home: undefined;
};
type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width } = Dimensions.get('window');

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
}

interface DashboardStats {
  totalExpenses: number;
  monthlySpent: number;
  budget: number;
  transactionCount: number;
}

export default function HomeScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlySpent: 0,
    budget: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const userId = auth().currentUser?.uid;

  const fetchDashboardData = async () => {
    if (!userId) {
      console.warn('User is not logged in');
      Alert.alert('Error', 'User is not logged in. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch expenses
      const expensesRes = await API.get(`/expenses?userId=${userId}`);
      const expenseData = expensesRes.data || [];
      setExpenses(expenseData.slice(0, 5)); // Show only recent 5 expenses
      
      // Fetch budget overview
      const budgetRes = await API.get(`/budget/overview?userId=${userId}`);
      const budgetData = budgetRes.data || {};
      
      // Calculate stats
      const totalExpenses = expenseData.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyExpenses = expenseData.filter((expense: Expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });
      
      const monthlySpent = monthlyExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
      
      setStats({
        totalExpenses,
        monthlySpent,
        budget: budgetData.budget || 0,
        transactionCount: expenseData.length
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      Alert.alert('Error', 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    const user = auth().currentUser;
    return user?.displayName || user?.email?.split('@')[0] || 'User';
  };

  const getBudgetProgress = () => {
    if (stats.budget === 0) return 0;
    return (stats.monthlySpent / stats.budget) * 100;
  };

  const getBudgetColor = () => {
    const progress = getBudgetProgress();
    if (progress <= 50) return '#4CAF50';
    if (progress <= 80) return '#FF9800';
    return '#F44336';
  };

  const renderStatCard = (title: string, value: string, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const renderQuickAction = (title: string, icon: string, color: string, onPress: () => void) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <ExpenseCard item={item} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D5FEF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{getUserName()}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('LoginScreen')}>
  <Icon name="account-circle" size={32} color="#5D5FEF" />
</TouchableOpacity>
      </View>

      {/* Budget Progress Card */}
      {stats.budget > 0 && (
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Monthly Budget</Text>
            <Text style={styles.budgetPercentage}>
              {getBudgetProgress().toFixed(0)}%
            </Text>
          </View>
          <View style={styles.budgetAmounts}>
            <Text style={styles.budgetSpent}>₹{stats.monthlySpent.toFixed(0)}</Text>
            <Text style={styles.budgetTotal}>of ₹{stats.budget.toFixed(0)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(getBudgetProgress(), 100)}%`,
                  backgroundColor: getBudgetColor()
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total Expenses', 
          `₹${stats.totalExpenses.toFixed(0)}`, 
          'account-balance-wallet',
          '#5D5FEF'
        )}
        {renderStatCard(
          'This Month', 
          `₹${stats.monthlySpent.toFixed(0)}`, 
          'calendar-today',
          '#4CAF50'
        )}
        {renderStatCard(
          'Transactions', 
          stats.transactionCount.toString(), 
          'receipt',
          '#FF9800'
        )}
        {renderStatCard(
          'Budget Left', 
          `₹${Math.max(0, stats.budget - stats.monthlySpent).toFixed(0)}`, 
          'savings',
          '#E91E63'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {renderQuickAction('Add Expense', 'add-circle', '#5D5FEF', () => navigation.navigate('AddExpense'))}
          {renderQuickAction('Scan Receipt', 'camera-alt', '#4CAF50', () => navigation.navigate('ScanReceipt'))}
          {renderQuickAction('View Reports', 'bar-chart', '#FF9800', () => navigation.navigate('Reports'))}
          {renderQuickAction('Set Budget', 'account-balance', '#E91E63', () => navigation.navigate('SetBudget'))}
        </View>
      </View>

      {/* Recent Expenses */}
      <View style={styles.expensesSection}>
        <View style={styles.expensesHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {expenses.length > 0 ? (
          <FlatList
            data={expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="receipt-long" size={60} color="#B0BEC5" />
            <Text style={styles.emptyTitle}>No Expenses Yet</Text>
            <Text style={styles.emptyText}>Start tracking your expenses to see them here</Text>
            <TouchableOpacity style={styles.addFirstExpenseButton}>
              <Text style={styles.addFirstExpenseText}>Add Your First Expense</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Spending Tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Icon name="lightbulb-outline" size={20} color="#F39C12" />
          <Text style={styles.tipTitle}>💡 Spending Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Review your expenses weekly to stay on track with your budget goals.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7F8C8D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 5,
  },
  profileButton: {
    padding: 5,
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  budgetPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  budgetSpent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  budgetTotal: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E9FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    width: (width - 50) / 2,
    marginBottom: 10,
    marginRight: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    width: (width - 60) / 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  expensesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#5D5FEF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
  },
  addFirstExpenseButton: {
    backgroundColor: '#5D5FEF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstExpenseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F39C12',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});