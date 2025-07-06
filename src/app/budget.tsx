import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { 
  Alert, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function BudgetScreen() {
  const [budget, setBudget] = useState<number>(0);
  const [spent, setSpent] = useState<number>(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = auth().currentUser?.uid;

  const fetchBudgetAndExpenses = async () => {
    if (!userId) {
      console.warn('User is not logged in');
      return;
    }
    try {
      setLoading(true);
      const res = await API.get(`/budget/overview?userId=${userId}`);
      setBudget(res.data.budget || 0);
      setSpent(res.data.spent || 0);
    } catch (err) {
      console.error('Error fetching budget overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBudget = async () => {
    if (!input.trim()) return;

    try {
      const parsed = parseFloat(input);
      await API.post('/budget/set', { userId, amount: parsed });
      Alert.alert('Success', 'Budget updated successfully!');
      setInput('');
      fetchBudgetAndExpenses();
    } catch (err) {
      Alert.alert('Error', 'Could not update budget');
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBudgetAndExpenses();
    }, [])
  );

  const remaining = budget - spent;
  const spentPercentage = budget > 0 ? (spent / budget) * 100 : 0;
  const progressWidth = Math.min(spentPercentage, 100);

  const getProgressColor = () => {
    if (spentPercentage <= 50) return '#4CAF50';
    if (spentPercentage <= 80) return '#FF9800';
    return '#F44336';
  };

  const getRemainingColor = () => {
    return remaining < 0 ? '#F44336' : '#4CAF50';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="account-balance-wallet" size={32} color="#5D5FEF" />
        </View>
        <Text style={styles.title}>Budget Overview</Text>
        <Text style={styles.subtitle}>Track your spending goals</Text>
      </View>

      <View style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetTitle}>Monthly Budget</Text>
          <Text style={styles.budgetAmount}>₹{budget.toFixed(0)}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progressWidth}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {spentPercentage.toFixed(1)}% used
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FFE5E5' }]}>
              <Icon name="trending-up" size={20} color="#F44336" />
            </View>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>₹{spent.toFixed(0)}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: remaining < 0 ? '#FFE5E5' : '#E8F5E8' }]}>
              <Icon name="account-balance" size={20} color={getRemainingColor()} />
            </View>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={[styles.statValue, { color: getRemainingColor() }]}>
              ₹{remaining.toFixed(0)}
            </Text>
          </View>
        </View>

        {remaining < 0 && (
          <View style={styles.warningBanner}>
            <Icon name="warning" size={20} color="#F44336" />
            <Text style={styles.warningText}>
              You've exceeded your budget by ₹{Math.abs(remaining).toFixed(0)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.updateSection}>
        <Text style={styles.updateTitle}>Update Budget</Text>
        <View style={styles.inputContainer}>
          <Icon name="edit" size={20} color="#5D5FEF" style={styles.inputIcon} />
          <TextInput
            placeholder="Enter new budget amount"
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor="#A0A0A0"
          />
        </View>
        <TouchableOpacity
          style={[styles.updateButton, loading && styles.updateButtonDisabled]}
          onPress={handleUpdateBudget}
          disabled={loading}
        >
          <Icon name="save" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.updateButtonText}>
            {loading ? 'Updating...' : 'Update Budget'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Budget Tips</Text>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-outline" size={16} color="#5D5FEF" />
          <Text style={styles.tipText}>Set realistic monthly goals</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-outline" size={16} color="#5D5FEF" />
          <Text style={styles.tipText}>Track expenses daily</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="lightbulb-outline" size={16} color="#5D5FEF" />
          <Text style={styles.tipText}>Review spending weekly</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIcon: {
    backgroundColor: '#E8E9FF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  budgetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetTitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 5,
  },
  budgetAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E9FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#7F8C8D',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  warningBanner: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  updateSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  updateButton: {
    backgroundColor: '#5D5FEF',
    borderRadius: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonIcon: {
    marginRight: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 10,
  },
});