import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  FlatList, ActivityIndicator, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

type Message = {
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
};

const Chatbot: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const suggestions = [
    { text: 'How much did I spend this week?', icon: 'calendar-today' },
    { text: 'Show my last 5 expenses', icon: 'list' },
    { text: 'Did I exceed my budget?', icon: 'trending-up' },
    { text: "What's my biggest expense this month?", icon: 'pie-chart' },
    { text: 'Any tips to save money?', icon: 'lightbulb-outline' },
  ];

  const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newUserMsg: Message = {
      type: 'user',
      text: userMessage,
      timestamp: getCurrentTimestamp(),
    };

    // Add user message immediately and clear input
    setMessages(prevMessages => [newUserMsg, ...prevMessages]);
    setInput('');
    setLoading(true);

    try {
      const token = await auth().currentUser?.getIdToken();
      const response = await fetch('http://10.0.2.2:9000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      const botReply: Message = {
        type: 'bot',
        text: data.reply ?? 'No response from bot.',
        timestamp: getCurrentTimestamp(),
      };

      // Add bot reply to existing messages (including the user message)
      setMessages(prevMessages => [botReply, ...prevMessages]);
    } catch (err) {
      console.error('Bot error:', err);
      const errorReply: Message = {
        type: 'bot',
        text: 'Something went wrong while contacting the AI.',
        timestamp: getCurrentTimestamp(),
      };
      // Add error message to existing messages (including the user message)
      setMessages(prevMessages => [errorReply, ...prevMessages]);
    }

    setLoading(false);
  };

  const handleSuggestionPress = (suggestionText: string) => {
    setInput(suggestionText);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="smart-toy" size={24} color="#5D5FEF" />
          </View>
          <Text style={styles.headerTitle}>Financial Assistant</Text>
          <Text style={styles.headerSubtitle}>Ask me about your finances</Text>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          inverted
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.messageWrapper}>
              <View
                style={[
                  styles.messageContainer,
                  item.type === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                {item.type === 'bot' && (
                  <View style={styles.botIcon}>
                    <Icon name="smart-toy" size={16} color="#5D5FEF" />
                  </View>
                )}
                <View style={[
                  styles.messageContent,
                  item.type === 'user' ? styles.userMessageContent : styles.botMessageContent
                ]}>
                  <Text style={[
                    styles.messageText,
                    item.type === 'user' ? styles.userText : styles.botText
                  ]}>
                    {item.text}
                  </Text>
                  <Text style={[
                    styles.timestamp,
                    item.type === 'user' ? styles.userTimestamp : styles.botTimestamp
                  ]}>
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#5D5FEF" />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          </View>
        )}

        {/* Suggestions */}
        {messages.length === 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Quick Questions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionBubble}
                  onPress={() => handleSuggestionPress(suggestion.text)}
                >
                  <Icon name={suggestion.icon} size={16} color="#5D5FEF" />
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              style={styles.input}
              placeholder="Ask me anything about your finances..."
              placeholderTextColor="#A0A0A0"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Icon
                name="send"
                size={20}
                color={input.trim() ? '#FFFFFF' : '#A0A0A0'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9FF',
  },
  headerIcon: {
    backgroundColor: '#E8E9FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  chatContainer: {
    paddingVertical: 20,
  },
  messageWrapper: {
    marginVertical: 4,
  },
  messageContainer: {
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  botIcon: {
    backgroundColor: '#E8E9FF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageContent: {
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userMessageContent: {
    backgroundColor: '#5D5FEF',
  },
  botMessageContent: {
    backgroundColor: '#FFFFFF',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#2C3E50',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#A0A0A0',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typingText: {
    marginLeft: 8,
    color: '#5D5FEF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  suggestionBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
  },
  suggestionText: {
    fontSize: 12,
    color: '#2C3E50',
    marginLeft: 6,
    flex: 1,
  },
  inputSection: {
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    maxHeight: 100,
    paddingRight: 10,
  },
  sendButton: {
    backgroundColor: '#5D5FEF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E9FF',
  },
});

export default Chatbot;