import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import Header from '../components/Header';
import { COLORS } from '../constants/Colors';
import auth from '@react-native-firebase/auth';
import { API } from '../services/api';

export default function ScanScreen() {
  const [ocrText, setOcrText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

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
          Alert.alert('Permission Error', 'Not all permissions granted!');
        }
      } catch (err) {
        console.warn('Permission request failed:', err);
      }
    }
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
      setOcrText(data.text || 'No text extracted.');
    } catch (err) {
      console.error('OCR API failed:', err);
      setOcrText('Error extracting text.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: true });
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
      const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      extractText(cleanBase64);
    } else {
      Alert.alert('Error', 'No image selected or unreadable.');
    }
  };

  const handleCameraCapture = async () => {
    const result = await launchCamera({ mediaType: 'photo', includeBase64: true });
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
      const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      extractText(cleanBase64);
    } else {
      Alert.alert('Error', 'No photo captured or unreadable.');
    }
  };

  const saveTextToFile = async () => {
    if (!ocrText.trim()) {
      Alert.alert('No Text', 'Extract text first.');
      return;
    }

    const filePath = `${RNFS.DownloadDirectoryPath}/ocr_output_${Date.now()}.txt`;

    try {
      await RNFS.writeFile(filePath, ocrText, 'utf8');
      Alert.alert('Saved', `Text saved to:\n${filePath}`);
    } catch (err) {
      console.error('File save failed:', err);
      Alert.alert('Error', 'Failed to save file.');
    }
  };

  const handleAddExpense = async () => {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      console.warn('User is not logged in');
      Alert.alert('Error', 'User is not logged in. Please log in again.');
      return;
    }

    try {
      await API.post('/expenses', {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Scan Receipt" />

      <View style={styles.cameraBox}>
        <MaterialIcons name="photo-camera" size={64} color={COLORS.muted} />
        <Text style={styles.placeholder}>Camera Preview</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleCameraCapture}>
            <Text style={styles.buttonText}>Scan Now (Camera)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleImageSelection}>
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={saveTextToFile}>
            <Text style={styles.buttonText}>Download Extracted Text</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.resultInput}
            multiline
            placeholder="Extracted text will appear here"
            value={ocrText}
            onChangeText={setOcrText}
          />

          <View style={styles.divider} />

          <Text style={styles.title}>Add Expense from OCR</Text>

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

          <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
            <Text style={styles.buttonText}>Add Expense</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1 },
  cameraBox: {
    height: 250,
    backgroundColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginVertical: 20,
  },
  placeholder: {
    color: COLORS.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultInput: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
});
