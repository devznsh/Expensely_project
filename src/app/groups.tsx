import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { API } from '../services/api';
import auth from '@react-native-firebase/auth';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');

  const userId = auth().currentUser?.uid;

  // Fetch groups from backend
  const fetchGroups = async () => {
    if (!userId) {
      console.warn('User is not logged in');
      return;
    }
    try {
      const res = await API.get(`/groups?userId=${userId}`);
      console.log('Groups Fetched:', res.data);
      setGroups(res.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  // Create a new group
  const handleCreateGroup = async () => {
    if (!newGroup.trim()) return;

    try {
      await API.post('/groups', { name: newGroup, members: [userId], userId });
      Alert.alert('Success', 'Group created!');
      setNewGroup('');
      fetchGroups();
    } catch (err) {
      Alert.alert('Error', 'Could not create group');
      console.error(err);
    }
  };

  // Load groups when screen loads
  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Groups</Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item?._id ?? Math.random().toString()}
        renderItem={({ item }) => {
          
  // Only render if the item has a valid name and members array
  if (!item?.name || !Array.isArray(item.members)) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.groupName}>{item.name}</Text>
      <Text style={styles.members}>Members: {item.members.length}</Text>
    </View>
  );
}}

        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 16 }}>No groups yet.</Text>}
      />

      <TextInput
        style={styles.input}
        placeholder="New Group Name"
        value={newGroup}
        onChangeText={setNewGroup}
      />

      <Button title="Create Group" onPress={handleCreateGroup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f4f4' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: {
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  groupName: { fontSize: 18, fontWeight: '600' },
  members: { color: 'gray', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});
