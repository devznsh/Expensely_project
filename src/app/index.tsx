import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import ExpenseCard from '../components/ExpenseCard';
import Header from '../components/Header';
import { COLORS } from '../constants/Colors';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';

export default function HomeScreen() {
  const [expenses, setExpenses] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const userId = auth().currentUser?.uid;

      if (!userId) {
        console.warn('User is not logged in');
        Alert.alert('Error', 'User is not logged in. Please log in again.');
        return;
      }

      API.get(`/expenses?userId=${userId}`)
        .then((res) => setExpenses(res.data))
        .catch((err) => {
          console.error('Error fetching expenses:', err);
          Alert.alert('Error', 'Failed to fetch expenses');
        });
    }, [])
  );

  return (
    <ScrollView style={styles.container}>
      <Header title="Home" />
      <View style={styles.content}>
        <Text style={styles.title}>Recent Expenses</Text>
        {expenses.map((item, index) => (
          <ExpenseCard key={index} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
});
