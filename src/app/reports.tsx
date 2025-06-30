import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import Header from '../components/Header';
import { COLORS } from '../constants/Colors';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';

export default function ReportsScreen() {
  const [total, setTotal] = useState<number | null>(null);
  const [categoryData, setCategoryData] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  const userId = auth().currentUser?.uid;

  const fetchData = async () => {
    if (!userId) {
      console.warn('User is not logged in');
      return;
    }
    setLoading(true);
    try {
      const totalRes = await API.get(`/expenses/total?userId=${userId}`);
      setTotal(totalRes.data.total);

      const expensesRes = await API.get(`/expenses?userId=${userId}`);
      const categorySummary: { [key: string]: number } = {};

      expensesRes.data.forEach((item: any) => {
        const cat = item.category || 'Uncategorized';
        categorySummary[cat] = (categorySummary[cat] || 0) + item.amount;
      });

      setCategoryData(categorySummary);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const chartData = {
    labels: Object.keys(categoryData),
    datasets: [{ data: Object.values(categoryData) }],
  };

  return (
    <ScrollView style={styles.container}>
      <Header title="Reports" />
      <View style={styles.content}>
        <Text style={styles.heading}>Expense Overview</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Total Expenses</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.amount}>₹{total}</Text>
          )}
        </View>

        <Text style={styles.heading}>Spending by Category</Text>
        {!loading && Object.keys(categoryData).length > 0 ? (
          <BarChart
            data={chartData}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisLabel="₹"
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundGradientFrom: '#f8f9fb',
              backgroundGradientTo: '#f8f9fb',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: () => '#333',
              barPercentage: 0.7,
            }}
            style={{ marginVertical: 8, borderRadius: 8 }}
          />
        ) : (
          <Text style={{ color: 'gray' }}>No data to show</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray },
  content: { padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
  },
  label: { fontSize: 16, color: 'gray' },
  amount: { fontSize: 24, fontWeight: 'bold', color: 'green', marginTop: 4 },
});
