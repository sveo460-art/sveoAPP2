export type ThemeId = 'classic' | 'graphite' | 'midnight' | 'organic';

export interface ChatTheme {
  id: ThemeId;
  name: string;
  isDark: boolean;
  themeColor: string;
  backgroundClass: string;
  headerClass: string;
  sidebarClass: string;
  bubbleSelfClass: string;
  bubbleOtherClass: string;
  activeAccentClass: string;
  textColorSec: string;
  cardClass: string;
  inputBg: string;
  wallpaperPattern?: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  avatarSymbol: string;
  joinedAt: number;
  type?: 'user' | 'group' | 'channel';
  creatorId?: string;
  bio?: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  userAvatar: string;
  text: string;
  photo?: string;
  audio?: string;
  audioDuration?: number;
  timestamp: number;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions: Record<string, string[]>;
  status?: 'sent' | 'read';
  recipientId?: string;
}

export interface TypingState {
  userId: string;
  userName: string;
  lastActive: number;
  recipientId?: string;
}
