import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { 
  ActivityIndicator, 
  Dimensions, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface CategoryItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export default function ReportsScreen() {
  const [total, setTotal] = useState<number | null>(null);
  const [categoryData, setCategoryData] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'bar' | 'pie'>('pie');

  const userId = auth().currentUser?.uid;

  const categoryColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#F7DC6F', '#85C1E9', '#F8C471', '#82E0AA'
  ];

  const categoryIcons: { [key: string]: string } = {
    'Food': 'restaurant',
    'Transport': 'directions-car',
    'Shopping': 'shopping-bag',
    'Entertainment': 'movie',
    'Bills': 'receipt',
    'Health': 'local-hospital',
    'Education': 'school',
    'Travel': 'flight',
    'Other': 'more-horiz',
    'Uncategorized': 'category',
  };

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

  const getCategoryList = (): CategoryItem[] => {
    const totalAmount = Object.values(categoryData).reduce((sum, amount) => sum + amount, 0);
    
    return Object.entries(categoryData)
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        color: categoryColors[index % categoryColors.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const barChartData = {
    labels: Object.keys(categoryData).map(label => 
      label.length > 8 ? label.substring(0, 8) + '...' : label
    ),
    datasets: [{ data: Object.values(categoryData) }],
  };

  const pieChartData = getCategoryList().map((item, index) => ({
    name: item.category,
    population: item.amount,
    color: item.color,
    legendFontColor: '#7F8C8D',
    legendFontSize: 14,
  }));

  const getTopSpendingCategory = () => {
    const categories = getCategoryList();
    return categories.length > 0 ? categories[0] : null;
  };

  const getSpendingInsight = () => {
    const categories = getCategoryList();
    const topCategory = categories[0];
    
    if (!topCategory) return 'No spending data available';
    
    if (topCategory.percentage > 40) {
      return `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your spending. Consider reviewing this category.`;
    }
    
    return `Your spending is well distributed across categories. Great job maintaining balance!`;
  };

  const renderCategoryItem = ({ item }: { item: CategoryItem }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
          <Icon 
            name={categoryIcons[item.category] || 'category'} 
            size={20} 
            color={item.color} 
          />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.category}</Text>
          <Text style={styles.categoryPercentage}>{item.percentage.toFixed(1)}%</Text>
        </View>
      </View>
      <Text style={styles.categoryAmount}>₹{item.amount.toFixed(0)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="bar-chart" size={32} color="#5D5FEF" />
        </View>
        <Text style={styles.title}>Expense Reports</Text>
        <Text style={styles.subtitle}>Analyze your spending patterns</Text>
      </View>

      {/* Total Expenses Card */}
      <View style={styles.totalCard}>
        <View style={styles.totalHeader}>
          <Icon name="account-balance-wallet" size={24} color="#5D5FEF" />
          <Text style={styles.totalLabel}>Total Expenses</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#5D5FEF" style={styles.loader} />
        ) : (
          <Text style={styles.totalAmount}>₹{total?.toFixed(0) || '0'}</Text>
        )}
      </View>

      {/* Insights Card */}
      {!loading && Object.keys(categoryData).length > 0 && (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Icon name="lightbulb-outline" size={20} color="#F39C12" />
            <Text style={styles.insightTitle}>Spending Insight</Text>
          </View>
          <Text style={styles.insightText}>{getSpendingInsight()}</Text>
        </View>
      )}

      {/* Chart Toggle */}
      {!loading && Object.keys(categoryData).length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Spending Analysis</Text>
            <View style={styles.chartToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, activeChart === 'pie' && styles.activeToggle]}
                onPress={() => setActiveChart('pie')}
              >
                <Icon name="pie-chart" size={16} color={activeChart === 'pie' ? '#FFFFFF' : '#5D5FEF'} />
                <Text style={[styles.toggleText, activeChart === 'pie' && styles.activeToggleText]}>
                  Pie
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, activeChart === 'bar' && styles.activeToggle]}
                onPress={() => setActiveChart('bar')}
              >
                <Icon name="bar-chart" size={16} color={activeChart === 'bar' ? '#FFFFFF' : '#5D5FEF'} />
                <Text style={[styles.toggleText, activeChart === 'bar' && styles.activeToggleText]}>
                  Bar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {activeChart === 'pie' ? (
              <PieChart
                data={pieChartData}
                width={width - 40}
                height={220}
                chartConfig={{
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 10]}
                absolute
              />
            ) : (
              <BarChart
                data={barChartData}
                width={width - 40}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
                chartConfig={{
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(93, 95, 239, ${opacity})`,
                  labelColor: () => '#7F8C8D',
                  barPercentage: 0.7,
                }}
                style={styles.barChart}
              />
            )}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      {!loading && Object.keys(categoryData).length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <FlatList
            data={getCategoryList()}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.category}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Empty State */}
      {!loading && Object.keys(categoryData).length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="insert-chart" size={80} color="#B0BEC5" />
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>
            Start adding expenses to see your spending reports and insights.
          </Text>
        </View>
      )}
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
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 10,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
  insightCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F39C12',
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  chartSection: {
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activeToggle: {
    backgroundColor: '#5D5FEF',
  },
  toggleText: {
    fontSize: 12,
    color: '#5D5FEF',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
  },
  barChart: {
    borderRadius: 16,
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
});