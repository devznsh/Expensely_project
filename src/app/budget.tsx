import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';

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
      Alert.alert('Budget Updated!');
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget Overview</Text>
      <Text style={styles.info}>Your Budget: ₹{budget.toFixed(2)}</Text>
      <Text style={styles.info}>Expenses So Far: ₹{spent.toFixed(2)}</Text>
      <Text style={[styles.info, { color: remaining < 0 ? 'red' : 'green' }]}>
        Remaining: ₹{remaining.toFixed(2)}
      </Text>

      <TextInput
        placeholder="Update Budget Amount"
        value={input}
        onChangeText={setInput}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Set Budget" onPress={handleUpdateBudget} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fb' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  info: { fontSize: 18, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
});
