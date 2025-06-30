import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ExpenseCard({ item }: { item: any }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name || item.title}</Text>
      <Text style={styles.amount}>₹{item.amount}</Text>
      <Text style={styles.category}>{item.category || 'No Category'}</Text>


    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 16,
    color: 'green',
    marginTop: 4,
  },
  category: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
});
