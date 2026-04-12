/**
 * Chat List Screen - Messages
 * Exact match with web version - ProviderChatListScreen
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainStackParamList } from '../navigation/types';
import { StartupOrb } from '../components/StartupOrb';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { useTranslation } from 'react-i18next';

type ChatListScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatList'>;

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  isAI: boolean;
  orbColor?: string;
  isSupport?: boolean;
  jobSynopsis?: {
    service: string;
    status: 'active' | 'completed' | 'pending';
  };
}

export default function ChatListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [assistantName, setAssistantName] = useState('Sage');
  const [orbColor, setOrbColor] = useState('#3b82f6');

  useEffect(() => {
    // Load user preferences
    const loadUserData = async () => {
      const profile = await jsonStorage.getItem<any>(STORAGE_KEYS.PROVIDER_PROFILE);
      if (profile) {
        setAssistantName(profile.assistantName || 'Bolt');
        setOrbColor(profile.orbColor || '#3b82f6');
      }

      // Initialize mock chats
      const mockChats: Chat[] = [
        {
          id: 'ai-assistant',
          name: profile?.assistantName || 'Sage',
          lastMessage: t('chat.lastMessage1'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          unreadCount: 0,
          isOnline: true,
          isPinned: true,
          isAI: true,
          orbColor: profile?.orbColor || '#3b82f6',
        },
        {
          id: 'trego-support',
          name: 'Trego Support',
          lastMessage: t('chat.supportMessage'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
          unreadCount: 1,
          isOnline: true,
          isPinned: false,
          isAI: true,
          orbColor: '#ef4444',
          isSupport: true,
        },
        {
          id: 'lisboa-residence-hotel',
          name: 'Lisboa Residence Hotel',
          avatar: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=150&h=150&fit=crop&crop=center',
          lastMessage: t('chat.mockClient1'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          unreadCount: 3,
          isOnline: true,
          isPinned: true,
          isAI: false,
          jobSynopsis: {
            service: 'HVAC Maintenance',
            status: 'active',
          },
        },
        {
          id: 'maria-santos',
          name: 'Maria Santos',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=center',
          lastMessage: t('chat.mockClient2'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          unreadCount: 2,
          isOnline: false,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'Kitchen Renovation',
            status: 'active',
          },
        },
        {
          id: 'riverside-apartments',
          name: 'Riverside Apartments',
          avatar: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=150&h=150&fit=crop&crop=center',
          lastMessage: t('chat.mockClient3'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
          unreadCount: 1,
          isOnline: true,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'Electrical Installation',
            status: 'active',
          },
        },
        {
          id: 'pedro-almeida',
          name: 'Pedro Almeida',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=center',
          lastMessage: t('chat.mockClient4'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          unreadCount: 1,
          isOnline: true,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'AC Repair',
            status: 'completed',
          },
        },
        {
          id: 'central-coworking-hub',
          name: 'Central Coworking Hub',
          avatar: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=150&h=150&fit=crop&crop=center',
          lastMessage: t('chat.mockClient5'),
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          unreadCount: 3,
          isOnline: false,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'Network Installation',
            status: 'completed',
          },
        },
        {
          id: 'sofia-martins',
          name: 'Sofia Martins',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=center',
          lastMessage: 'Hi! I need help with a leaking pipe under the kitchen sink.',
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          unreadCount: 1,
          isOnline: true,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'Plumbing Repair',
            status: 'pending',
          },
        },
        {
          id: 'joao-silva',
          name: 'João Silva',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=center',
          lastMessage: 'When can you start the bathroom renovation?',
          lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
          unreadCount: 1,
          isOnline: false,
          isPinned: false,
          isAI: false,
          jobSynopsis: {
            service: 'Plumbing Installation',
            status: 'active',
          },
        },
      ];

      setChats(mockChats);
    };

    loadUserData();
  }, []);

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const filteredChats = useMemo(() => {
    let filtered = chats;

    if (searchQuery) {
      filtered = filtered.filter(
        chat =>
          chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: AI assistant first (if pinned), then support, then pinned, then by time
    return filtered.sort((a, b) => {
      if (a.isAI && a.isPinned && !a.isSupport) return -1;
      if (b.isAI && b.isPinned && !b.isSupport) return 1;
      if (a.isSupport && !b.isSupport && !(b.isAI && b.isPinned)) return -1;
      if (b.isSupport && !a.isSupport && !(a.isAI && a.isPinned)) return 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (b.isPinned && !a.isPinned) return 1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });
  }, [chats, searchQuery]);

  const handleChatPress = (chatId: string) => {
    // Navigate to chat detail (ChatScreen for AI, or client chat)
    navigation.navigate('ChatDetail', { chatId });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getServiceTagColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'completed':
        return { bg: '#f3f4f6', text: '#4b5563' };
      case 'pending':
        return { bg: '#dbeafe', text: '#1e40af' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <View style={styles.logoDot} />
            </View>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <View style={styles.logoDot} />
            </View>
          </View>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell-outline" size={24} color="#f3f4f6" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>1</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plusButton}>
            <Icon name="plus" size={24} color="#f3f4f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat List */}
      <ScrollView
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}>
        {filteredChats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatRow}
            onPress={() => handleChatPress(chat.id)}
            activeOpacity={0.7}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {chat.isSupport ? (
                <View style={styles.supportAvatar}>
                  <Text style={styles.supportAvatarText}>S</Text>
                </View>
              ) : chat.isAI ? (
                <View style={styles.orbAvatar}>
                  <StartupOrb size="xs" intensity="normal" color={chat.orbColor || orbColor} />
                </View>
              ) : chat.avatar ? (
                <Image source={{ uri: chat.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(chat.name)}</Text>
                </View>
              )}
              {chat.isOnline && !chat.isAI && !chat.isSupport && (
                <View style={styles.onlineIndicator} />
              )}
            </View>

            {/* Chat Content */}
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text
                  style={[
                    styles.chatName,
                    chat.isSupport && styles.chatNameSupport,
                  ]}
                  numberOfLines={1}>
                  {chat.name}
                </Text>
                <Text style={styles.chatTime}>{formatTime(chat.lastMessageTime)}</Text>
              </View>

              {/* Service Tag */}
              {chat.jobSynopsis && (
                <View
                  style={[
                    styles.serviceTag,
                    {
                      backgroundColor: getServiceTagColor(chat.jobSynopsis.status).bg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.serviceTagText,
                      { color: getServiceTagColor(chat.jobSynopsis.status).text },
                    ]}>
                    {chat.jobSynopsis.service}
                  </Text>
                </View>
              )}

              <View style={styles.chatFooter}>
                <Text
                  style={[
                    styles.chatMessage,
                    chat.unreadCount > 0 && styles.chatMessageUnread,
                  ]}
                  numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
                {chat.unreadCount > 0 && (
                  <View style={styles.unreadContainer}>
                    <View style={styles.unreadDot} />
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 18,
    height: 18,
    flexDirection: 'column',
    gap: 3,
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    gap: 3,
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  plusButton: {
    padding: 8,
  },
  plusIcon: {
    fontSize: 20,
    color: '#f3f4f6',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: '#9ca3af',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f3f4f6',
    padding: 0,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 80,
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  supportAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  orbAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Prevent orb from extending outside
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  chatNameSupport: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  chatTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  serviceTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatMessage: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  chatMessageUnread: {
    color: '#f3f4f6',
    fontWeight: '500',
  },
  unreadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
});
