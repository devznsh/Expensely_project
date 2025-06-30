import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
