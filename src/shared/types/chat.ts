/**
 * Chat/Message Types
 * Extracted from web app - React Native compatible
 */

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  isTyping?: boolean;
  isDelivered?: boolean;
  isBidSubmission?: boolean; // Mark as a bid submission message
}

export interface Chat {
  id: string;
  contactId?: string;
  contactName: string;
  contactAvatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientConversation {
  id: string;
  clientName: string;
  clientAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

