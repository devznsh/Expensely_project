import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ScrollView,
  Alert,
  PermissionsAndroid,
  type Permission,
  type PermissionStatus,
} from 'react-native';

import {
  launchImageLibrary,
  launchCamera,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';

import RNFS from 'react-native-fs';

const OCR: React.FC = () => {
  const [ocrText, setOcrText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions: Permission[] = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ];

        const granted: Record<Permission, PermissionStatus> =
          await PermissionsAndroid.requestMultiple(permissions);

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

  useEffect(() => {
    requestPermissions();
  }, []);

  const extractText = async (base64: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://10.0.2.2:3000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const pickImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true,
    };

    const result = await launchImageLibrary(options);
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
  const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
  extractText(cleanBase64);
} else {
      Alert.alert('Error', 'Image not selected or unreadable.');
    }
  };

  const captureImage = async () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      saveToPhotos: true,
    };

    const result = await launchCamera(options);
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.base64) {
  const cleanBase64 = asset.base64.replace(/^data:image\/[a-z]+;base64,/, '');
  extractText(cleanBase64);
    } else {
      Alert.alert('Error', 'Camera image not captured or unreadable.');
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Pick Image from Gallery" onPress={pickImage} />
          <View style={{ height: 10 }} />
          <Button title="Capture Image with Camera" onPress={captureImage} />
          <View style={{ height: 10 }} />
          <Button title="Download Extracted Text" onPress={saveTextToFile} />
          <Text style={styles.resultText}>{ocrText}</Text>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  resultText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
});

export default OCR;
