/**
 * Chat Screen - AI Assistant Interface
 * EXACT match with web version - ProviderChatInterfaceFixed
 * Every single color, style, and layout matches
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StartupOrb } from '../components/StartupOrb';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import ChatTutorialModal from '../components/modals/ChatTutorialModal';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  showQuickReplies?: boolean;
  quickReplies?: QuickReply[];
  isAnimating?: boolean;
}

interface QuickReply {
  id: string;
  text: string;
  value: string;
  color: 'blue' | 'gray' | 'purple' | 'emerald' | 'orange' | 'red' | 'yellow' | 'teal' | 'pink';
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesEndRef = useRef<View>(null);

  // Get user data
  const [assistantName, setAssistantName] = useState('Bolt');
  const [firstName, setFirstName] = useState('Provider');
  const [orbColor, setOrbColor] = useState('#3b82f6');

  useEffect(() => {
    // Load user preferences
    const loadUserData = async () => {
      const profile = await jsonStorage.getItem<any>(STORAGE_KEYS.PROVIDER_PROFILE);
      if (profile) {
        setAssistantName(profile.assistantName || 'Bolt');
        setFirstName(profile.firstName || 'Provider');
        setOrbColor(profile.orbColor || '#3b82f6');
      }

      // Check if chat initialized
      const chatInitialized = await jsonStorage.getItem('trego-chat-initialized');
      if (!chatInitialized) {
        // Show tutorial on first visit
        setShowTutorial(true);
      }

      // Initialize welcome message
      if (!hasInitialized && chatInitialized !== 'true') {
        setHasInitialized(true);
        jsonStorage.setItem('trego-chat-initialized', 'true');

        const welcomeMessage: Message = {
          id: `welcome-${Date.now()}`,
          text: `Hi **${firstName}**! I'm **${assistantName}**, your AI assistant. I'm here to help manage your jobs, connect with clients, and optimize your workflow. What would you like to do?`,
          isBot: true,
          timestamp: new Date(),
          isAnimating: false,
          showQuickReplies: true,
          quickReplies: [
            { id: '1', text: 'Testing Menu', value: 'testing_menu', color: 'blue' },
            { id: '2', text: 'Hamburger Menu', value: 'hamburger_menu', color: 'gray' },
            { id: '3', text: 'Marketing', value: 'marketing_menu', color: 'purple' },
            { id: '4', text: 'Learn', value: 'learn_menu', color: 'emerald' },
          ],
        };

        setMessages([welcomeMessage]);
      }
    };

    loadUserData();
  }, []);

  const handleSendMessage = useCallback((text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: `bot-${Date.now()}`,
        text: `I understand you said "${messageText}". How can I help you with your provider tasks today?`,
        isBot: true,
        timestamp: new Date(),
        isAnimating: false,
        showQuickReplies: true,
        quickReplies: [
          { id: '1', text: 'Show Jobs', value: 'show_jobs', color: 'blue' },
          { id: '2', text: 'Main Menu', value: 'main_menu', color: 'gray' },
        ],
      };

      setIsTyping(false);
      setMessages(prev => [...prev, botResponse]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000);
  }, [inputText]);

  const handleQuickReply = useCallback((reply: QuickReply) => {
    handleSendMessage(reply.value || reply.text);
  }, [handleSendMessage]);

  const formatText = useCallback((text: string) => {
    // Simple bold formatting: **text** becomes bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={styles.boldText}>
            {boldText}
          </Text>
        );
      }
      return part;
    });
  }, []);

  // Typing dots animation refs
  const typingDot1 = useRef(new Animated.Value(0.3)).current;
  const typingDot2 = useRef(new Animated.Value(0.3)).current;
  const typingDot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isTyping) {
      const animate = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const anim1 = animate(typingDot1, 0);
      const anim2 = animate(typingDot2, 200);
      const anim3 = animate(typingDot3, 400);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    }
  }, [isTyping]);

  // Get color styles - EXACT match with web version
  const getColorStyle = (color: string) => {
    const colors: { [key: string]: { border: string; text: string; bg: string } } = {
      blue: { border: '#60a5fa', text: '#1e40af', bg: '#ffffff' }, // border-blue-400 text-blue-700 bg-white
      emerald: { border: '#34d399', text: '#047857', bg: '#ffffff' }, // border-emerald-400 text-emerald-700 bg-white
      purple: { border: '#a78bfa', text: '#6b21a8', bg: '#ffffff' }, // border-purple-400 text-purple-700 bg-white
      gray: { border: '#9ca3af', text: '#374151', bg: '#ffffff' }, // border-gray-400 text-gray-700 bg-white
      orange: { border: '#fb923c', text: '#9a3412', bg: '#ffffff' },
      red: { border: '#f87171', text: '#991b1b', bg: '#ffffff' },
      yellow: { border: '#facc15', text: '#854d0e', bg: '#ffffff' },
      teal: { border: '#2dd4bf', text: '#0f766e', bg: '#ffffff' },
      pink: { border: '#f472b6', text: '#9f1239', bg: '#ffffff' },
    };
    return colors[color] || colors.gray;
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get optimal text color for user message bubble
  const getOptimalTextColor = (bgColor: string): string => {
    // For user messages, use white text on colored background
    return '#ffffff';
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: '#ffffff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Messages Area - EXACT match with web: bg-white dark:bg-gray-900 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Ready to chat!</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={styles.messageWrapper}>
              {message.isBot ? (
                <View style={styles.botMessageContainer}>
                  <View style={styles.botAvatar}>
                    <StartupOrb size="sm" intensity="normal" color={orbColor} />
                  </View>
                  <View style={styles.botMessageContent}>
                    {/* Assistant Name */}
                    <Text style={[styles.assistantName, { color: orbColor }]}>
                      {assistantName}
                    </Text>
                    {/* Message Bubble - EXACT: bg-white dark:bg-gray-800 rounded-2xl */}
                    <View style={styles.botMessageBubble}>
                      <Text style={styles.botMessageText}>
                        {formatText(message.text)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.userMessageContainer}>
                  {/* User Message Bubble - EXACT: rounded-2xl with orbColor background at 50% opacity */}
                  <View
                    style={[
                      styles.userMessageBubble,
                      {
                        backgroundColor: hexToRgba(orbColor, 0.5), // 50% opacity
                        borderColor: hexToRgba(orbColor, 0.2), // 20% opacity border
                        borderWidth: 1,
                      },
                    ]}>
                    <Text style={[styles.userMessageText, { color: getOptimalTextColor(orbColor) }]}>
                      {formatText(message.text)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Quick Replies - EXACT match with web version */}
              {message.showQuickReplies && message.quickReplies && (
                <View style={[styles.quickRepliesContainer, message.isBot && styles.quickRepliesLeft]}>
                  {message.quickReplies
                    .filter((reply) => reply.text !== 'Show Jobs' && reply.value !== 'show_jobs')
                    .map((reply) => {
                      const colorStyle = getColorStyle(reply.color);
                      return (
                        <TouchableOpacity
                          key={reply.id}
                          onPress={() => handleQuickReply(reply)}
                          style={[
                            styles.quickReplyButton,
                            {
                              borderColor: colorStyle.border,
                              borderWidth: 2,
                              backgroundColor: colorStyle.bg,
                            },
                          ]}>
                          <Text style={[styles.quickReplyText, { color: colorStyle.text }]}>
                            {reply.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>
          ))
        )}

        {/* Typing Indicator - EXACT match with web */}
        {isTyping && messages.length > 0 && (
          <View style={styles.botMessageContainer}>
            <View style={styles.botAvatar}>
              <StartupOrb size="sm" intensity="normal" color={orbColor} />
            </View>
            <View style={styles.botMessageContent}>
              <Text style={[styles.assistantName, { color: orbColor }]}>
                {assistantName}
              </Text>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDotsContainer}>
                  <Animated.View style={[styles.typingDot, { opacity: typingDot1 }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingDot2 }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingDot3 }]} />
                </View>
                <Text style={styles.typingText}>typing...</Text>
              </View>
            </View>
          </View>
        )}

        <View ref={messagesEndRef} style={styles.messagesEnd} />
      </ScrollView>

      {/* Input Area - EXACT match: border-t border-border dark:border-gray-700 bg-white dark:bg-gray-900 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={() => handleSendMessage()}
          style={[styles.sendButton, { backgroundColor: orbColor }]}
          disabled={!inputText.trim()}>
          <Icon name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Floating Orb (for future: voice/attachment) */}
      <View style={styles.floatingOrbContainer}>
        <TouchableOpacity
          style={[styles.floatingOrb, { backgroundColor: orbColor }]}
          onPress={() => {
            // Future: Open voice/attachment menu
          }}>
          <Icon name="microphone-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tutorial Modal */}
      <ChatTutorialModal
        isVisible={showTutorial}
        onDismiss={() => setShowTutorial(false)}
        assistantName={assistantName}
        orbColor={orbColor}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // bg-white
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 8, // pr-[8px] pl-[8px]
    paddingTop: 16, // pt-4
    paddingBottom: 60, // pb-[60px]
  },
  messageWrapper: {
    marginBottom: 16, // space-y-4
  },
  botMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '95%',
  },
  botAvatar: {
    marginRight: 8,
    marginLeft: -24, // -ml-6 equivalent
  },
  botMessageContent: {
    flex: 1,
    marginTop: 12, // mt-3
    marginLeft: 0, // ml-0
  },
  assistantName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4, // mb-1
  },
  botMessageBubble: {
    backgroundColor: '#ffffff', // bg-white
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    maxWidth: '95%',
  },
  botMessageText: {
    fontSize: 16,
    color: '#111827', // text-gray-900
    lineHeight: 24,
  },
  boldText: {
    fontWeight: '700',
    color: '#000000', // text-black
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: '90%',
    alignSelf: 'flex-end',
  },
  userMessageBubble: {
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // gap-2
    marginTop: 12, // mt-3
  },
  quickRepliesLeft: {
    marginLeft: 36, // ml-9 (avatar width + margin)
  },
  quickReplyButton: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 8, // py-2
    borderRadius: 9999, // rounded-full
    backgroundColor: '#ffffff', // bg-white
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickReplyText: {
    fontSize: 14, // text-sm
    fontWeight: '500',
  },
  typingIndicator: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // space-x-1
    marginBottom: 8,
  },
  typingDot: {
    width: 8, // w-2
    height: 8, // h-2
    borderRadius: 4,
    backgroundColor: '#9ca3af', // bg-gray-400
  },
  typingText: {
    fontSize: 14, // text-sm
    color: '#6b7280', // text-gray-500
  },
  messagesEnd: {
    height: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12, // px-3
    paddingVertical: 10, // pt-[10px] pb-[12px]
    backgroundColor: '#ffffff', // bg-white
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb', // border-border
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f9fafb', // bg-gray-50
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  floatingOrbContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 10,
  },
  floatingOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingOrbText: {
    fontSize: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
