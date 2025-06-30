import React, { useState } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';

export default function AddExpense() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = async () => {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      console.warn('User is not logged in');
      Alert.alert('Error', 'User is not logged in. Please log in again.');
      return;
    }

    try {
      const res = await API.post('/expenses', {
        name,
        amount: parseFloat(amount),
        category,
        userId: userId,
      });

      Alert.alert('Success', 'Expense added successfully!');
      setName('');
      setAmount('');
      setCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
      console.error('Add Expense Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Expense</Text>

      <TextInput
        style={styles.input}
        placeholder="Expense Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />

      <Button title="Add Expense" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
});
