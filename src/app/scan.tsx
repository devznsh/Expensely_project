import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import { COLORS } from '../constants/Colors';
import auth from '@react-native-firebase/auth';
import { API } from '../services/api';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const [ocrText, setOcrText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [detectedAmounts, setDetectedAmounts] = useState<string[]>([]);
  const [suggestedTotal, setSuggestedTotal] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [scanStep, setScanStep] = useState<'scan' | 'review' | 'add'>('scan');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert('Permission Required', 'Camera and storage permissions are required for scanning receipts.');
        }
      } catch (err) {
        console.warn('Permission request failed:', err);
      }
    }
  };

  const parseReceiptText = (text: string) => {
    const amountRegex = /\$?\d+\.?\d{0,2}/g;
    const totalRegex = /(?:total|sum|amount|grand total|subtotal)[\s:]*\$?(\d+\.?\d{0,2})/gi;
    
    const amounts = text.match(amountRegex) || [];
    const cleanAmounts = amounts
      .filter(amt => parseFloat(amt.replace('$', '')) > 0)
      .map(amt => amt.replace('$', ''));
    
    const totalMatch = text.match(totalRegex);
    let suggestedTotal = '';
    
    if (totalMatch) {
      suggestedTotal = totalMatch[1];
    } else if (cleanAmounts.length > 0) {
      const maxAmount = Math.max(...cleanAmounts.map(amt => parseFloat(amt)));
      suggestedTotal = maxAmount.toString();
    }
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const merchantName = lines[0]?.trim() || 'Receipt';
    
    return {
      amounts: cleanAmounts,
      suggestedTotal,
      merchantName,
    };
  };

  const extractText = async (base64: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://10.0.2.2:3000/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      const extractedText = data.text || 'No text extracted.';
      setOcrText(extractedText);
      
      const parsed = parseReceiptText(extractedText);
      setDetectedAmounts(parsed.amounts);
      setSuggestedTotal(parsed.suggestedTotal);
      setAmount(parsed.suggestedTotal);
      setName(parsed.merchantName);
      setCategory(suggestCategory(parsed.merchantName));
      
      setScanStep('review');
    } catch (err) {
      console.error('OCR API failed:', err);
      setOcrText('Error extracting text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const suggestCategory = (merchantName: string): string => {
    const name = merchantName.toLowerCase();
    if (name.includes('grocery') || name.includes('market') || name.includes('food')) return 'Groceries';
    if (name.includes('gas') || name.includes('fuel') || name.includes('shell') || name.includes('bp')) return 'Transportation';
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('pizza')) return 'Dining';
    if (name.includes('pharmacy') || name.includes('medical') || name.includes('hospital')) return 'Healthcare';
    return 'Other';
  };

  const handleImageSelection = async () => {
    const result = await launchImageLibrary({ 
      mediaType: 'photo', 
      includeBase64: true,
      quality: 0.8 
    });
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
      const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      extractText(cleanBase64);
    } else {
      Alert.alert('Error', 'No image selected or unreadable.');
    }
  };

  const handleCameraCapture = async () => {
    const result = await launchCamera({ 
      mediaType: 'photo', 
      includeBase64: true,
      quality: 0.8 
    });
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
      const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      extractText(cleanBase64);
    } else {
      Alert.alert('Error', 'No photo captured or unreadable.');
    }
  };

  const handleAddExpense = async () => {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      Alert.alert('Error', 'User is not logged in. Please log in again.');
      return;
    }

    if (!name.trim() || !amount.trim() || !category.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    try {
      await API.post('/expenses', {
        name: name.trim(),
        amount: parseFloat(amount),
        category: category.trim(),
        userId: userId,
        ocrText: ocrText,
      });

      Alert.alert('Success', 'Expense added successfully!');
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
      console.error('Add Expense Error:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategory('');
    setOcrText('');
    setDetectedAmounts([]);
    setSuggestedTotal('');
    setScanStep('scan');
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetForm();
    setRefreshing(false);
  };

  const renderScanStep = () => (
    <View style={styles.scanSection}>
      <View style={styles.scanHeader}>
        <Text style={styles.sectionTitle}>Scan Receipt</Text>
        <Text style={styles.sectionSubtitle}>Automatically extract expense details</Text>
      </View>

      <View style={styles.cameraBox}>
        <Icon name="camera-alt" size={60} color="#B0BEC5" />
        <Text style={styles.cameraPlaceholder}>Position receipt clearly</Text>
        <Text style={styles.cameraSubtext}>Ensure text is visible and well-lit</Text>
      </View>

      <View style={styles.scanActions}>
        <TouchableOpacity style={styles.primaryAction} onPress={handleCameraCapture}>
          <Icon name="camera-alt" size={24} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Scan Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryAction} onPress={handleImageSelection}>
          <Icon name="photo-library" size={20} color="#5D5FEF" />
          <Text style={styles.secondaryActionText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={() => setScanStep('scan')}>
          <Icon name="arrow-back" size={24} color="#5D5FEF" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Review Extracted Data</Text>
        <TouchableOpacity onPress={() => setScanStep('add')}>
          <Icon name="check" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.extractedCard}>
        <Text style={styles.cardTitle}>Extracted Text</Text>
        <TextInput
          style={styles.extractedText}
          multiline
          value={ocrText}
          onChangeText={setOcrText}
          placeholder="Extracted text will appear here..."
        />
      </View>

      {detectedAmounts.length > 0 && (
        <View style={styles.amountsCard}>
          <Text style={styles.cardTitle}>Detected Amounts</Text>
          <View style={styles.amountChips}>
            {detectedAmounts.map((amt, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.amountChip,
                  amount === amt && styles.selectedChip
                ]}
                onPress={() => setAmount(amt)}
              >
                <Text style={[
                  styles.amountChipText,
                  amount === amt && styles.selectedChipText
                ]}>
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.continueButton} onPress={() => setScanStep('add')}>
        <Text style={styles.continueButtonText}>Continue to Add Expense</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderAddStep = () => (
    <View style={styles.addSection}>
      <View style={styles.addHeader}>
        <TouchableOpacity onPress={() => setScanStep('review')}>
          <Icon name="arrow-back" size={24} color="#5D5FEF" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Add Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Merchant Name</Text>
          <View style={styles.inputContainer}>
            <Icon name="store" size={20} color="#7F8C8D" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Walmart, Target"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-balance-wallet" size={20} color="#7F8C8D" style={styles.inputIcon} />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            {suggestedTotal && amount !== suggestedTotal && (
              <TouchableOpacity 
                style={styles.suggestButton}
                onPress={() => setAmount(suggestedTotal)}
              >
                <Text style={styles.suggestButtonText}>₹{suggestedTotal}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.inputContainer}>
            <Icon name="category" size={20} color="#7F8C8D" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Groceries, Dining"
              value={category}
              onChangeText={setCategory}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
          <Icon name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addExpenseButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D5FEF" />
        <Text style={styles.loadingText}>Analyzing receipt...</Text>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Scanner</Text>
        <Text style={styles.headerSubtitle}>Extract expenses from receipts</Text>
      </View>

      {scanStep === 'scan' && renderScanStep()}
      {scanStep === 'review' && renderReviewStep()}
      {scanStep === 'add' && renderAddStep()}

      {/* Quick Tips */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Icon name="lightbulb-outline" size={20} color="#F39C12" />
          <Text style={styles.tipTitle}>💡 Scanning Tips</Text>
        </View>
        <Text style={styles.tipText}>
          For best results, ensure good lighting and position the receipt flat without shadows.
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 5,
  },
  scanSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scanHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
  cameraBox: {
    height: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E8E9FF',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraPlaceholder: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 15,
    fontWeight: '500',
  },
  cameraSubtext: {
    fontSize: 12,
    color: '#B0BEC5',
    marginTop: 5,
  },
  scanActions: {
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#5D5FEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E8E9FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryActionText: {
    color: '#5D5FEF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  extractedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  extractedText: {
    fontSize: 14,
    color: '#7F8C8D',
    borderWidth: 1,
    borderColor: '#E8E9FF',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8F9FB',
  },
  amountsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountChip: {
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E9FF',
  },
  selectedChip: {
    backgroundColor: '#5D5FEF',
    borderColor: '#5D5FEF',
  },
  amountChipText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  addSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E9FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#7F8C8D',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  suggestButton: {
    backgroundColor: '#5D5FEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  suggestButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  addExpenseButton: {
    backgroundColor: '#5D5FEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addExpenseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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