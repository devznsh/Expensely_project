import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';


export default function AddExpense() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { name: 'Food', icon: 'restaurant', color: '#FF6B6B' },
    { name: 'Transport', icon: 'directions-car', color: '#4ECDC4' },
    { name: 'Shopping', icon: 'shopping-bag', color: '#45B7D1' },
    { name: 'Entertainment', icon: 'movie', color: '#96CEB4' },
    { name: 'Bills', icon: 'receipt', color: '#FFEAA7' },
    { name: 'Health', icon: 'local-hospital', color: '#DDA0DD' },
    { name: 'Other', icon: 'more-horiz', color: '#B0BEC5' },
  ];

  const handleSubmit = async () => {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      console.warn('User is not logged in');
      Alert.alert('Error', 'User is not logged in. Please log in again.');
      return;
    }

    if (!name.trim() || !amount.trim() || !category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="add-circle" size={32} color="#5D5FEF" />
          </View>
          <Text style={styles.title}>Add New Expense</Text>
          <Text style={styles.subtitle}>Track your spending effortlessly</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Icon name="edit" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="What did you spend on?"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="attach-money" size={20} color="#5D5FEF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Select Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryItem,
                    { backgroundColor: category === cat.name ? cat.color : '#F5F5F5' },
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Icon 
                    name={cat.icon} 
                    size={24} 
                    color={category === cat.name ? '#FFFFFF' : cat.color} 
                  />
                  <Text style={[
                    styles.categoryText,
                    { color: category === cat.name ? '#FFFFFF' : '#333333' }
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Icon name="check" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContainer: {
    flexGrow: 1,
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
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  categorySection: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});