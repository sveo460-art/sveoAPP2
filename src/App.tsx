import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ThemeId, ChatTheme, TypingState } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { ThemeSelector, CHAT_THEMES } from './components/ThemeSelector';
import { VoiceMessagePlayer } from './components/VoiceMessagePlayer';
import { CallAudioHelper } from './lib/audio';
import { 
  Send, Smile, CornerUpLeft, Trash2, Sparkles, CheckCheck, Check,
  ChevronDown, X, Info, Phone, Video, Search, MessageSquare, Edit3, Heart, LogOut,
  Paperclip, Camera, Image, Mic, Play, Pause, Volume2, Plus, ArrowLeft,
  Bookmark, Pin, MicOff, VolumeX, Settings, User as LucideUser
} from 'lucide-react';

const POPULAR_REACTIONS = ['👍', '🔥', '❤️', '😂', '😮', '🎉', '💩'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>((() => {
    try {
      const saved = localStorage.getItem('tg_web_chat_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })());

  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('tg_web_chat_theme');
    return (saved as ThemeId) || 'midnight';
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('global'); // 'global' or 'private_userId'
  const activeChatIdRef = useRef(activeChatId);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showChatListMobile, setShowChatListMobile] = useState<boolean>(true); // For portrait mobile double viewport
  const [newPmSearchName, setNewPmSearchName] = useState<string>('');
  const [isCreateEntityOpen, setIsCreateEntityOpen] = useState<'group' | 'channel' | null>(null);
  const [createEntityName, setCreateEntityName] = useState('');
  const [createEntityAvatar, setCreateEntityAvatar] = useState('');
  const [isSearchEntitiesOpen, setIsSearchEntitiesOpen] = useState<boolean>(false);
  const [joinedEntityIds, setJoinedEntityIds] = useState<string[]>(() => {
    try {
      const savedUser = localStorage.getItem('tg_web_chat_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const saved = localStorage.getItem(`tg_web_chat_joined_${parsed.id}`);
        return saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.error("Failed to load joined entities from localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`tg_web_chat_joined_${currentUser.id}`, JSON.stringify(joinedEntityIds));
    }
  }, [joinedEntityIds, currentUser]);

  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chats' | 'settings'>('chats');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  const [inputText, setInputText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = React.useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [showEmojiPickerForMessageId, setShowEmojiPickerForMessageId] = useState<string | null>(null);
  const [showQuickReactions, setShowQuickReactions] = useState<boolean>(false);
  
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBio, setEditBio] = useState('');

  const [loading, setLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  // States for pinning and muting chats
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tg_web_chat_pinned');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mutedChatIds, setMutedChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tg_web_chat_muted');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    chatId: string;
    chatName: string;
    isPinned: boolean;
    isMuted: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    chatId: '',
    chatName: '',
    isPinned: false,
    isMuted: false,
    x: 0,
    y: 0
  });

  const touchTimeoutRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const blockNextClickRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('tg_web_chat_pinned', JSON.stringify(pinnedChatIds));
  }, [pinnedChatIds]);

  useEffect(() => {
    localStorage.setItem('tg_web_chat_muted', JSON.stringify(mutedChatIds));
  }, [mutedChatIds]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.isOpen) {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('contextmenu', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, [contextMenu.isOpen]);

  const handleChatContextMenu = (e: React.MouseEvent, chatId: string, chatName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isPinned = pinnedChatIds.includes(chatId);
    const isMuted = mutedChatIds.includes(chatId);
    
    setContextMenu({
      isOpen: true,
      chatId,
      chatName,
      isPinned,
      isMuted,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleChatTouchStart = (e: React.TouchEvent, chatId: string, chatName: string) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    blockNextClickRef.current = false;

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }

    touchTimeoutRef.current = setTimeout(() => {
      const isPinned = pinnedChatIds.includes(chatId);
      const isMuted = mutedChatIds.includes(chatId);
      
      setContextMenu({
        isOpen: true,
        chatId,
        chatName,
        isPinned,
        isMuted,
        x: touch.clientX,
        y: touch.clientY
      });
      blockNextClickRef.current = true;
      
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 450);
  };

  const handleChatTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    if (dx > 10 || dy > 10) {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
    }
  };

  const handleChatTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  const callDurationTimerRef = useRef<any>(null);
  const callAudioHelperRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  const activeCallRef = useRef<any | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  
  useEffect(() => {
    const checkOrientation = () => {
      const landscapeQuery = window.matchMedia('(orientation: landscape)');
      setIsLandscape(landscapeQuery.matches);
    };

    checkOrientation();
    
    const landscapeQuery = window.matchMedia('(orientation: landscape)');
    
    try {
      landscapeQuery.addEventListener('change', checkOrientation);
    } catch (e) {
      window.addEventListener('resize', checkOrientation);
    }

    return () => {
      try {
        landscapeQuery.removeEventListener('change', checkOrientation);
      } catch (e) {
        window.removeEventListener('resize', checkOrientation);
      }
    };
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const typingTimerRef = useRef<any>(null);

  const activeTheme = React.useMemo(() => CHAT_THEMES.find((t) => t.id === activeThemeId) || CHAT_THEMES[0], [activeThemeId]);

  useEffect(() => {
    if (activeTheme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [activeTheme]);

  const activeChatsList = React.useMemo(() => {
    const participants: Map<string, { lastMsg?: Message; unreadCount: number }> = new Map();
    
    const sorted = [...messages].sort((a,b) => a.timestamp - b.timestamp);
    
    sorted.forEach((msg) => {
      if (!msg.recipientId) return;
      
      const targetUser = allUsers.find(u => u.id === msg.recipientId);
      const isGroupOrChannel = targetUser?.type === 'group' || targetUser?.type === 'channel';

      // Skip showing groups/channels that the user has not joined
      if (isGroupOrChannel) {
        const isJoined = joinedEntityIds.includes(msg.recipientId) || targetUser?.creatorId === currentUser?.id;
        if (!isJoined) return;
      }

      let otherId = '';
      let isFromOpponent = false;

      if (isGroupOrChannel) {
        otherId = msg.recipientId;
        isFromOpponent = msg.userId !== currentUser?.id;
      } else {
        if (msg.userId === currentUser?.id) {
          otherId = msg.recipientId;
        } else if (msg.recipientId === currentUser?.id) {
          otherId = msg.userId;
          isFromOpponent = true;
        }
      }
      
      if (otherId) {
        const currentData = participants.get(otherId) || { unreadCount: 0 };
        participants.set(otherId, {
          lastMsg: msg,
          unreadCount: (isFromOpponent && msg.status !== 'read') 
            ? currentData.unreadCount + 1 
            : currentData.unreadCount
        });
      }
    });
    
    // Auto-add only joined groups and channels
    allUsers.forEach(u => {
      const isJoined = joinedEntityIds.includes(u.id) || u.creatorId === currentUser?.id;
      if ((u.type === 'group' || u.type === 'channel') && isJoined && !participants.has(u.id)) {
        participants.set(u.id, { unreadCount: 0 });
      }
    });

    return Array.from(participants.entries()).map(([otherId, data]) => {
      const otherUser = allUsers.find(u => u.id === otherId);
      return {
        id: otherId,
        name: otherUser?.name || `Пользователь #${otherId.slice(-4)}`,
        color: otherUser?.color || '#3b82f6',
        avatarSymbol: otherUser?.avatarSymbol || '👤',
        type: otherUser?.type || 'user',
        lastMessage: data.lastMsg,
        unreadCount: data.unreadCount
      };
    });
  }, [messages, currentUser?.id, allUsers, joinedEntityIds]);

  const sidebarChats = React.useMemo(() => {
    const lastGlobalMsg = messages.filter(m => !m.recipientId).slice(-1)[0];
    const globalChat = {
      id: 'global',
      chatIdSelector: 'global',
      name: 'Общий чат',
      color: '#0ea5e9',
      avatarSymbol: '💬',
      type: 'global' as const,
      lastMessageText: lastGlobalMsg ? lastGlobalMsg.text : 'Нажмите сюда, чтобы войти в общий чат',
      lastMessageTime: lastGlobalMsg ? lastGlobalMsg.timestamp : null,
      unreadCount: 0,
      isOnline: sseConnected,
      isPinned: pinnedChatIds.includes('global'),
      isMuted: mutedChatIds.includes('global')
    };

    const activeMapped = activeChatsList.map(chat => {
      const isOnline = onlineUserIds.includes(chat.id);
      let lastText = 'История пуста';
      if (chat.lastMessage) {
        lastText = chat.lastMessage.userId === currentUser?.id ? `Вы: ${chat.lastMessage.text}` : chat.lastMessage.text;
      }
      return {
        id: chat.id,
        chatIdSelector: `private_${chat.id}`,
        name: chat.name,
        color: chat.color,
        avatarSymbol: chat.avatarSymbol,
        type: chat.type,
        lastMessageText: lastText,
        lastMessageTime: chat.lastMessage ? chat.lastMessage.timestamp : null,
        unreadCount: chat.unreadCount,
        isOnline,
        isPinned: pinnedChatIds.includes(chat.id),
        isMuted: mutedChatIds.includes(chat.id)
      };
    });

    return [globalChat, ...activeMapped];
  }, [messages, activeChatsList, sseConnected, pinnedChatIds, mutedChatIds, currentUser?.id, onlineUserIds]);

  const pinnedChats = React.useMemo(() => {
    return sidebarChats.filter(c => c.isPinned).sort((a, b) => {
      return pinnedChatIds.indexOf(b.id) - pinnedChatIds.indexOf(a.id);
    });
  }, [sidebarChats, pinnedChatIds]);

  const unpinnedChats = React.useMemo(() => {
    const unpinned = sidebarChats.filter(c => !c.isPinned);
    const globalChat = unpinned.find(c => c.id === 'global');
    const others = unpinned.filter(c => c.id !== 'global').sort((a, b) => {
      const timeA = a.lastMessageTime || 0;
      const timeB = b.lastMessageTime || 0;
      return timeB - timeA;
    });
    return globalChat ? [globalChat, ...others] : others;
  }, [sidebarChats]);

  const renderChatItem = (chat: any) => {
    const isOnline = chat.isOnline;
    const isSelected = activeChatId === chat.chatIdSelector;
    
    return (
      <button
        key={chat.id}
        onClick={(e) => {
          if (blockNextClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
            blockNextClickRef.current = false;
            return;
          }
          setActiveChatId(chat.chatIdSelector);
          if (!isLandscape) {
            setShowChatListMobile(false);
          }
        }}
        onContextMenu={(e) => handleChatContextMenu(e, chat.id, chat.name)}
        onTouchStart={(e) => handleChatTouchStart(e, chat.id, chat.name)}
        onTouchMove={handleChatTouchMove}
        onTouchEnd={handleChatTouchEnd}
        className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 cursor-pointer select-none relative ${
          isSelected ? 'bg-[#243241]' : 'hover:bg-[#121c25]'
        }`}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <div 
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 font-bold text-white relative shadow border border-white/10"
          style={{ backgroundColor: chat.color }}
        >
          {chat.avatarSymbol}
          {chat.unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-[#17212b] ${
              chat.isMuted ? 'bg-[#4b5563] border-[#24303f] text-gray-300' : 'bg-[#1aa11a] animate-pulse'
            }`}>
              {chat.unreadCount}
            </span>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#17212b] animate-pulse" title="В сети" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-sm truncate flex items-center gap-1.5 text-white">
              {chat.name}
              {isOnline && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="В сети" />
              )}
              {chat.isMuted && (
                <VolumeX className="w-3.5 h-3.5 text-gray-500 shrink-0" title="Уведомления отключены" />
              )}
            </span>
            <span className="text-[9px] text-gray-400 flex items-center gap-1">
              {chat.isPinned && <Pin className="w-2.5 h-2.5 text-sky-400 rotate-45 shrink-0" />}
              {chat.lastMessageTime ? formatLastMessageTime(chat.lastMessageTime) : ''}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">
            {chat.lastMessageText}
          </p>
        </div>
      </button>
    );
  };

  const displayedMessages = React.useMemo(() => messages.filter((msg) => {
    if (activeChatId === 'global') {
      return !msg.recipientId;
    } else {
      const targetUserId = activeChatId.replace('private_', '');
      const userOrEntity = allUsers.find(u => u.id === targetUserId);
      if (userOrEntity?.type === 'group' || userOrEntity?.type === 'channel') {
        return msg.recipientId === targetUserId;
      }
      return msg.recipientId && (
        (msg.userId === currentUser?.id && msg.recipientId === targetUserId) ||
        (msg.userId === targetUserId && msg.recipientId === currentUser?.id)
      );
    }
  }), [messages, activeChatId, currentUser?.id, allUsers]);

  const searchedMessages = React.useMemo(() => searchQuery.trim()
    ? displayedMessages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayedMessages, [searchQuery, displayedMessages]);

  const pinnedMessage = React.useMemo(() => displayedMessages.find((m: any) => m.pinned), [displayedMessages]);

  const activeTypingUsersInThisChat = React.useMemo(() => typingUsers.filter((t: any) => {
    if (activeChatId === 'global') {
      return !t.recipientId;
    } else {
      const targetUserId = activeChatId.replace('private_', '');
      return t.userId === targetUserId && t.recipientId === currentUser?.id;
    }
  }), [typingUsers, activeChatId, currentUser?.id]);

  const isChannelGuest = React.useMemo(() => {
    if (!activeChatId.startsWith('private_') || !currentUser) return false;
    const targetUserId = activeChatId.replace('private_', '');
    const userOrEntity = allUsers.find(u => u.id === targetUserId);
    return userOrEntity?.type === 'channel' && userOrEntity.creatorId !== currentUser.id;
  }, [activeChatId, currentUser, allUsers]);

  const formatLastMessageTime = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    
    if (diffMin < 1) return 'сейчас';
    if (diffMin < 60) return `${diffMin} м`;
    if (diffHr < 24) return `${diffHr} ч`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const loadUsersList = () => {
    fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setAllUsers(data);
      })
      .catch((err) => console.error('Failed to load users:', err));
  };

  useEffect(() => {
    if (!currentUser) return;
    loadUsersList();
    const interval = setInterval(loadUsersList, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    fetch(`/api/messages?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        setLoading(false);
        scrollToBottom();

        if (currentUser) {
          const unreadIds = data
            .filter((m: any) => m.userId !== currentUser.id && m.status !== 'read')
            .map((m: any) => m.id);
          if (unreadIds.length > 0) {
            fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageIds: unreadIds })
            }).catch(e => console.error("Failed to mark read on init:", e));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load initial messages:', err);
        setLoading(false);
      });

    setupEventSource();

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [currentUser]);

  const setupEventSource = () => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    if (!currentUser) return;

    const sse = new EventSource(`/api/stream?userId=${currentUser.id}`);
    sseRef.current = sse;

    sse.addEventListener('connected', (event: any) => {
      setSseConnected(true);
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.onlineCount === 'number') {
          setOnlineCount(data.onlineCount);
        }
        if (data && Array.isArray(data.onlineUsers)) {
          setOnlineUserIds(data.onlineUsers);
        }
      } catch (err) {
        console.error('Error parsing connected event:', err);
      }
    });

    sse.addEventListener('online_count', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.count === 'number') {
          setOnlineCount(data.count);
        }
        if (data && Array.isArray(data.onlineUsers)) {
          setOnlineUserIds(data.onlineUsers);
        }
      } catch (err) {
        console.error('Error parsing online_count event:', err);
      }
    });

    sse.addEventListener('users_updated', () => {
      loadUsersList();
    });

    sse.addEventListener('message', (event) => {
      try {
        const newMessage = JSON.parse(event.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        if (autoScroll) {
          setTimeout(scrollToBottom, 60);
        }

        const currentChatId = activeChatIdRef.current;
        const isCurrentGeneral = currentChatId === 'global' && !newMessage.recipientId;
        const isCurrentPrivate = currentChatId.startsWith('private_') && 
          newMessage.recipientId === currentUser.id && 
          newMessage.userId === currentChatId.replace('private_', '');

        if (currentUser && newMessage.userId !== currentUser.id && newMessage.status !== 'read' && (isCurrentGeneral || isCurrentPrivate)) {
          fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: [newMessage.id] })
          }).catch(e => console.error("Failed to mark incoming message read:", e));
        }
      } catch (err) {
        console.error('Error handling SSE message event:', err);
      }
    });

    sse.addEventListener('messages_read', (event: any) => {
      try {
        const { messageIds } = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: 'read' } : m))
        );
      } catch (err) {
        console.error('Error handling SSE messages_read event:', err);
      }
    });

    sse.addEventListener('reaction', (event) => {
      try {
        const { messageId, reactions } = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      } catch (err) {
        console.error('Error handling SSE reaction event:', err);
      }
    });

    sse.addEventListener('delete', (event) => {
      try {
        const { messageId } = JSON.parse(event.data);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (err) {
        console.error('Error handling SSE delete event:', err);
      }
    });

    sse.addEventListener('typing', (event) => {
      try {
        const activeTyping = JSON.parse(event.data);
        const othersTyping = activeTyping.filter(
          (t: any) => t.userId !== currentUser?.id
        );
        setTypingUsers(othersTyping);
      } catch (err) {
        console.error('Error handling SSE typing event:', err);
      }
    });

    sse.addEventListener('pin', (event) => {
      try {
        const { messageId, action } = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              return { ...m, pinned: action === 'pin' };
            }
            const mTarget = prev.find(p => p.id === messageId);
            if (mTarget && action === 'pin') {
              const isPrivate = !!mTarget.recipientId;
              if (isPrivate) {
                const isSameChat = 
                  m.recipientId && 
                  ((m.userId === mTarget.userId && m.recipientId === mTarget.recipientId) || 
                   (m.userId === mTarget.recipientId && m.recipientId === mTarget.userId));
                if (isSameChat) {
                  return { ...m, pinned: false };
                }
              } else {
                if (!m.recipientId) {
                  return { ...m, pinned: false };
                }
              }
            }
            return m;
          })
        );
      } catch (err) {
        console.error('Error handling SSE pin event:', err);
      }
    });

    sse.addEventListener('call_event', (event) => {
      try {
        const callData = JSON.parse(event.data);
        handleIncomingCallEvent(callData);
      } catch (err) {
        console.error('Error handling SSE call_event:', err);
      }
    });

    sse.addEventListener('call_signal', (event) => {
      try {
        const signalData = JSON.parse(event.data);
        handleIncomingSignalingMessage(signalData);
      } catch (err) {
        console.error('Error handling SSE call_signal:', err);
      }
    });

    sse.onerror = () => {
      setSseConnected(false);
      sse.close();
      setTimeout(setupEventSource, 4000);
    };
  };

  useEffect(() => {
    callAudioHelperRef.current = new CallAudioHelper();
    return () => {
      if (callAudioHelperRef.current) {
        callAudioHelperRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (activeCall && activeCall.status === 'active') {
      setCallDuration(0);
      callDurationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }
    }
    return () => {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
      }
    };
  }, [activeCall]);

  useEffect(() => {
    if (!activeCall) {
      if (callAudioHelperRef.current) {
        callAudioHelperRef.current.stop();
      }
      return;
    }

    const { status, role } = activeCall;
    if (status === 'ringing') {
      if (role === 'caller') {
        callAudioHelperRef.current?.playDialTone();
      } else {
        callAudioHelperRef.current?.playRingtone();
      }
    } else if (status === 'active') {
      callAudioHelperRef.current?.stop();
      callAudioHelperRef.current?.playBeep();
    } else if (status === 'rejected' || status === 'ended') {
      callAudioHelperRef.current?.playBusyTone();
      setTimeout(() => {
        setActiveCall(null);
      }, 2000);
    }
  }, [activeCall]);

  const handleIncomingCallEvent = async (callData: any) => {
    if (!currentUser) return;
    const { type, callId, callerId, receiverId } = callData;
    const currentCall = activeCallRef.current;

    if (type === 'incoming') {
      if (receiverId === currentUser.id) {
        setActiveCall({
          id: callId,
          callerId,
          receiverId,
          status: 'ringing',
          role: 'receiver'
        });
      }
    } else if (type === 'accepted') {
      if (currentCall && currentCall.id === callId) {
        setActiveCall((prev: any) => prev ? { ...prev, status: 'active' } : null);
        if (currentCall.role === 'caller') {
          initiatePeerConnection(callId);
        }
      }
    } else if (type === 'rejected') {
      if (currentCall && currentCall.id === callId) {
        setActiveCall((prev: any) => prev ? { ...prev, status: 'rejected' } : null);
        cleanupCallMedia();
      }
    } else if (type === 'ended') {
      if (currentCall && currentCall.id === callId) {
        setActiveCall((prev: any) => prev ? { ...prev, status: 'ended' } : null);
        cleanupCallMedia();
      }
    }
  };

  const initiatePeerConnection = async (callId: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        const currentCall = activeCallRef.current;
        if (event.candidate && currentUser && currentCall) {
          sendSignalingMessage({
            targetId: currentCall.role === 'caller' ? currentCall.receiverId : currentCall.callerId,
            senderId: currentUser.id,
            signal: { candidate: event.candidate }
          });
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        console.warn("Microphone access declined or unavailable - running calling in simulated high-audio mode", err);
        return null;
      });

      if (stream) {
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          const audio = document.createElement('audio');
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          (audio as any).play().catch((e: any) => console.error("Auto play remote call audio failed:", e));
        }
      };

      const currentCall = activeCallRef.current;
      if (currentCall && currentCall.role === 'caller') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessage({
          targetId: currentCall.receiverId,
          senderId: currentUser.id,
          signal: { sdp: offer }
        });
      }
    } catch (e) {
      console.warn("WebRTC startup failed, continuing with simulated connection", e);
    }
  };

  const handleIncomingSignalingMessage = async (signalData: any) => {
    const { senderId, targetId, signal } = signalData;
    if (!currentUser || targetId !== currentUser.id) return;
    const currentCall = activeCallRef.current;

    try {
      let pc = peerConnectionRef.current;
      if (!pc && currentCall) {
        await initiatePeerConnection(currentCall.id);
        pc = peerConnectionRef.current;
      }

      if (!pc) return;

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignalingMessage({
            targetId: senderId,
            senderId: currentUser.id,
            signal: { sdp: answer }
          });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (e) {
      console.warn("Signaling handling error:", e);
    }
  };

  const sendSignalingMessage = (payload: any) => {
    fetch('/api/calls/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error("Signaling transmission failed:", e));
  };

  const cleanupCallMedia = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    } catch (e) {
      console.warn("Cleanup media error:", e);
    }
  };

  const handleStartCall = async (receiverId: string) => {
    if (!currentUser) return;
    
    callAudioHelperRef.current?.playBeep();

    setActiveCall({
      id: 'pending',
      callerId: currentUser.id,
      receiverId,
      status: 'ringing',
      role: 'caller'
    });

    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId: currentUser.id, receiverId })
      });
      if (res.ok) {
        const call = await res.json();
        setActiveCall({
          id: call.id,
          callerId: currentUser.id,
          receiverId,
          status: 'ringing',
          role: 'caller'
        });
      } else {
        setActiveCall((prev: any) => prev ? { ...prev, status: 'rejected' } : null);
      }
    } catch (e) {
      console.error(e);
      setActiveCall((prev: any) => prev ? { ...prev, status: 'rejected' } : null);
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;
    callAudioHelperRef.current?.playBeep();
    try {
      await fetch(`/api/calls/${activeCall.id}/accept`, { method: 'POST' });
    } catch(e) {
      console.error("Accept call error:", e);
    }
  };

  const handleRejectCall = async () => {
    if (!activeCall) return;
    callAudioHelperRef.current?.playBeep();
    try {
      await fetch(`/api/calls/${activeCall.id}/reject`, { method: 'POST' });
    } catch(e) {
      console.error("Reject call error:", e);
    }
  };

  const handleHangupCall = async () => {
    if (!activeCall) return;
    callAudioHelperRef.current?.playBeep();
    try {
      await fetch(`/api/calls/${activeCall.id}/hangup`, { method: 'POST' });
    } catch(e) {
      console.error("Hangup call error:", e);
    }
  };

  const handleToggleMic = () => {
    const newMuted = !isMicMuted;
    setIsMicMuted(newMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleJoinChat = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tg_web_chat_user', JSON.stringify(user));
    try {
      const saved = localStorage.getItem(`tg_web_chat_joined_${user.id}`);
      setJoinedEntityIds(saved ? JSON.parse(saved) : []);
    } catch {
      setJoinedEntityIds([]);
    }
  };

  const handleLeaveChat = () => {
    if (window.confirm('Вы действительно хотите выйти из учетной записи?')) {
      if (sseRef.current) {
        sseRef.current.close();
      }
      localStorage.removeItem('tg_web_chat_user');
      setCurrentUser(null);
      setMessages([]);
      setJoinedEntityIds([]);
    }
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setActiveThemeId(themeId);
    localStorage.setItem('tg_web_chat_theme', themeId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!currentUser) return;

    if (!typingTimerRef.current) {
      fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      }).catch(err => console.error(err));

      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
      }, 3000);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Пожалуйста, выберите фото размером менее 8 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setSelectedPhoto(compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedPhoto) || !currentUser) return;

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      userAvatar: currentUser.avatarSymbol,
      text: inputText.trim(),
      photo: selectedPhoto || undefined,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            userName: replyTarget.userName,
            text: replyTarget.text,
          }
        : undefined,
      recipientId: activeChatId.startsWith('private_') 
        ? activeChatId.replace('private_', '') 
        : undefined
    };

    setInputText('');
    setSelectedPhoto(null);
    setReplyTarget(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Audio recording handlers
  const durationRef = useRef<number>(0);

  const stopTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          sendAudioMessage(base64Audio, durationRef.current);
        };
      };

      durationRef.current = 0;
      setRecordingDuration(0);
      setIsRecording(true);
      mediaRecorder.start();

      recordingTimerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);

    } catch (err) {
      console.error('Failed to start audio recording:', err);
      showToast('Не удалось получить доступ к микрофону. Убедитесь, что предоставили разрешения.');
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    stopTimer();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.onstop = () => {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };

    mediaRecorderRef.current.stop();
    stopTimer();
    setIsRecording(false);
    setRecordingDuration(0);
    durationRef.current = 0;
  };

  const sendAudioMessage = async (base64Audio: string, duration: number) => {
    if (!currentUser) return;
    
    const finalDuration = duration || 1;

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      userAvatar: currentUser.avatarSymbol,
      text: '[Голосовое сообщение]',
      audio: base64Audio,
      audioDuration: finalDuration,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            userName: replyTarget.userName,
            text: replyTarget.text,
          }
        : undefined,
      recipientId: activeChatId.startsWith('private_') 
        ? activeChatId.replace('private_', '') 
        : undefined
    };

    setReplyTarget(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to send audio message:', err);
    }
  };

  const formatAudioTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    setShowEmojiPickerForMessageId(null);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = { ...msg.reactions };
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = [];
        }

        const userIdx = currentReactions[emoji].indexOf(currentUser.id);
        if (userIdx > -1) {
          currentReactions[emoji] = currentReactions[emoji].filter(
            (id) => id !== currentUser.id
          );
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji].push(currentUser.id);
        }
        return { ...msg, reactions: currentReactions };
      })
    );

    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji }),
      });
    } catch (err) {
      console.error('Failed to post reaction:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    
    if (!window.confirm('Удалить это сообщение для всех участников?')) {
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/unpin`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to unpin message:', err);
    }
  };

  const handleForwardToSaved = async (msg: Message) => {
    if (!currentUser) return;

    let rawText = msg.text || '';
    let forwardText = `👉 [Переслано от ${msg.userName}]:\n${rawText}`;
    if (!rawText && msg.photo) {
      forwardText = `👉 [Переслано от ${msg.userName}]: Фотография`;
    } else if (!rawText && msg.audio) {
      forwardText = `👉 [Переслано от ${msg.userName}]: Голосовое сообщение`;
    }

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          userAvatar: currentUser.avatarSymbol,
          text: forwardText,
          photo: msg.photo || undefined,
          audio: msg.audio || undefined,
          audioDuration: msg.audioDuration || undefined,
          recipientId: currentUser.id // Recipient is SELF -> Private dialogue with oneself is Saved Messages!
        })
      });
      // Just visually alert briefly safely or let user know
    } catch (err) {
      console.error('Failed to forward message:', err);
    }
  };

  // Profile manager actions
  const openEditProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatarSymbol);
    setEditColor(currentUser.color);
    setEditBio(currentUser.bio || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editName.trim()) return;

    const updatedUser: User = {
      ...currentUser,
      name: editName.trim(),
      avatarSymbol: editAvatar,
      color: editColor,
      bio: editBio.trim()
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('tg_web_chat_user', JSON.stringify(updatedUser));
    setIsEditProfileOpen(false);

    try {
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          name: editName.trim(),
          avatarSymbol: editAvatar,
          color: editColor,
          bio: editBio.trim()
        })
      });
      showToast('Профиль успешно обновлен!');
    } catch (err) {
      console.error('Failed to update profile on backend:', err);
    }
  };

  const handleLogout = () => {
    if (sseRef.current) {
      sseRef.current.close();
    }
    try {
      signOut(auth).catch(console.error);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('tg_web_chat_user');
    setCurrentUser(null);
    setMessages([]);
    setJoinedEntityIds([]);
    setIsEditProfileOpen(false);
    showToast('Вы успешно вышли из профиля');
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEntityName.trim() || !isCreateEntityOpen) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createEntityName,
          type: isCreateEntityOpen,
          avatarSymbol: createEntityAvatar || (isCreateEntityOpen === 'group' ? '👥' : '📢'),
          creatorId: currentUser?.id
        })
      });
      if (res.ok) {
        const newEntity = await res.json();
        setJoinedEntityIds(prev => prev.includes(newEntity.id) ? prev : [...prev, newEntity.id]);
        setActiveChatId(`private_${newEntity.id}`);
        setIsCreateEntityOpen(null);
        setCreateEntityName('');
        setCreateEntityAvatar('');
        if (!isLandscape) setShowChatListMobile(false);
        loadUsersList();
        showToast(`${isCreateEntityOpen === 'group' ? 'Группа' : 'Канал'} успешно создан!`);
      } else {
        showToast('Ошибка при создании');
      }
    } catch (e) {
      console.error(e);
      showToast('Ошибка при создании');
    }
  };

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAutoScroll(isAtBottom);
  };

  if (!currentUser) {
    return <WelcomeScreen onJoin={handleJoinChat} />;
  }

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden font-sans relative transition-colors duration-350 ${
      activeThemeId === 'classic' ? 'bg-[#e7ebf0] text-gray-900' :
      activeThemeId === 'graphite' ? 'bg-[#181818] text-gray-100' :
      activeThemeId === 'midnight' ? 'bg-gradient-to-b from-[#0f0c1b] to-[#1a103c] text-violet-100' :
      'bg-[#f4efe1] text-stone-900'
    }`} id="app-root-layout">
      {/* Active Call Floating Card UI */}
      {activeCall && (() => {
        const isCaller = activeCall.role === 'caller';
        const partnerId = isCaller ? activeCall.receiverId : activeCall.callerId;
        const partnerUser = allUsers.find(u => u.id === partnerId);
        const partnerName = partnerUser?.name || `Пользователь #${partnerId?.slice(-4)}`;
        const partnerAvatar = partnerUser?.avatarSymbol || '👤';
        const partnerColor = partnerUser?.color || '#3b82f6';
        
        return (
          <div 
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm bg-slate-900 border border-slate-705/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-fade-in shadow-sky-500/10 text-white"
            id="active-call-overlay-banner"
            style={{ backgroundColor: 'rgb(15, 23, 42)' }}
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border border-white/20 shadow-md animate-pulse-subtle shrink-0"
                  style={{ backgroundColor: partnerColor }}
                >
                  {partnerAvatar}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm tracking-wide text-white truncate">
                    {partnerName}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {activeCall.status === 'ringing' && (isCaller ? 'Исходящий вызов...' : 'Вам звонит...')}
                    {activeCall.status === 'active' && `В сети • ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`}
                    {activeCall.status === 'rejected' && 'Вызов отклонен'}
                    {activeCall.status === 'ended' && 'Звонок завершен'}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {activeCall.status === 'ringing' && !isCaller && (
                  <>
                    <button
                      onClick={handleRejectCall}
                      className="p-3 bg-red-500 hover:bg-red-600 active:scale-95 transition-all rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:shadow-red-500/20"
                      title="Отклонить"
                    >
                      <Phone className="w-4 h-4 rotate-[135deg]" />
                    </button>
                    <button
                      onClick={handleAcceptCall}
                      className="p-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:shadow-emerald-500/20 animate-bounce-short"
                      title="Принять"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {activeCall.status === 'ringing' && isCaller && (
                  <button
                    onClick={handleHangupCall}
                    className="px-3.5 py-2 bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-xs font-semibold rounded-full flex items-center gap-1.5 text-white cursor-pointer shadow-lg hover:shadow-red-500/20"
                  >
                    <Phone className="w-4 h-4 rotate-[135deg]" />
                    <span>Отмена</span>
                  </button>
                )}

                {activeCall.status === 'active' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleMic}
                      className={`p-2 rounded-full cursor-pointer transition-all ${isMicMuted ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20' : 'bg-slate-700 hover:bg-slate-600'}`}
                      title={isMicMuted ? "Включить микрофон" : "Выключить микрофон"}
                    >
                      {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleToggleSpeaker}
                      className={`p-2 rounded-full cursor-pointer transition-all ${!isSpeakerOn ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                      title={isSpeakerOn ? "Без звука" : "Звук включен"}
                    >
                      {isSpeakerOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleHangupCall}
                      className="p-3 bg-red-500 hover:bg-red-600 active:scale-95 transition-all rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:shadow-red-500/20"
                      title="Завершить разговор"
                    >
                      <Phone className="w-4 h-4 rotate-[135deg]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex-1 flex overflow-hidden relative" id="chat-workspace-row">

        {((!isLandscape && showChatListMobile) || isLandscape) && (
          <div className={`${isLandscape ? 'w-80 border-r border-gray-200 dark:border-neutral-800' : 'w-full'} h-full flex flex-col bg-[#17212b] text-white shrink-0 relative z-20`} id="chat-sidebar">
            
            {activeSidebarTab === 'chats' ? (
              <>
                <div className="p-4 border-b border-[#24303f] flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-sky-400 select-none">Private Space</span>
                    <span className={`text-[10px] border px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${sseConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {sseConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>}
                      {!sseConnected && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1"></span>}
                      {sseConnected ? 'В сети' : 'Сбой'}
                    </span>
                  </div>

                  <div className="w-full">
                    <button
                      onClick={() => {
                        setNewPmSearchName('');
                        loadUsersList();
                        setIsSearchEntitiesOpen(true);
                      }}
                      className="w-full bg-white/10 hover:bg-white/15 active:scale-98 text-white text-xs font-semibold py-2.5 px-3 rounded-xl shadow transition-all flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
                      title="Поиск чатов, каналов и контактов"
                    >
                      <Search className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Поиск чатов</span>
                    </button>
                  </div>
                </div>

                {/* Chats list scrollable container */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5" id="sidebar-chats-scroller">
                  
                  {/* PINNED CHATS SECTION */}
                  {pinnedChats.length > 0 && (
                    <div className="pb-2 border-b border-[#24303f]/20">
                      <span className="text-[10px] px-3 font-bold text-sky-400 tracking-wider block mb-1.5 uppercase flex items-center gap-1.5 select-none">
                        <Pin className="w-3 h-3 text-sky-400 rotate-45 shrink-0" />
                        <span>Закрепленные ({pinnedChats.length})</span>
                      </span>
                      <div className="space-y-1">
                        {pinnedChats.map(chat => renderChatItem(chat))}
                      </div>
                    </div>
                  )}

                  {/* UNPINNED CHATS SECTION */}
                  <div className="pt-1.5">
                    <span className="text-[10px] px-3 font-semibold text-gray-400 tracking-wider block mb-1.5 uppercase select-none">
                      {pinnedChats.length > 0 ? 'Остальные беседы' : 'Личные беседы'} ({unpinnedChats.length})
                    </span>
                    
                    {unpinnedChats.length === 0 ? (
                      <p className="text-xs text-gray-500 p-4 italic text-center leading-normal text-slate-400 leading-normal">
                        Нет activeных бесед.<br />Используйте поиск выше, чтобы выбрать собеседника!
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {unpinnedChats.map(chat => renderChatItem(chat))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Floating Action Button */}
                <button
                  onClick={() => setIsCreateEntityOpen('group')}
                  className={`absolute bottom-[72px] right-4 z-30 bg-sky-500 hover:bg-sky-600 active:scale-95 shadow-lg shadow-sky-500/30 text-white rounded-full flex items-center justify-center cursor-pointer transition ${isLandscape ? 'p-3' : 'p-3 sm:p-4'}`}
                  title="Создать группу или канал"
                >
                  <Plus className="w-6 h-6 shrink-0" />
                </button>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-[#24303f] flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-sky-400 select-none">Настройки</span>
                    <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full font-bold">
                      Приложение
                    </span>
                  </div>
                </div>

                {/* Settings list scrollable container styled like chats list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5" id="sidebar-settings-scroller">
                  <div className="pt-1.5">
                    <span className="text-[10px] px-3 font-semibold text-gray-400 tracking-wider block mb-1.5 uppercase select-none">
                      Основные настройки
                    </span>

                    <button
                      onClick={() => setIsThemeSelectorOpen(true)}
                      className="w-full text-left p-3 rounded-xl transition flex items-center gap-3 cursor-pointer select-none hover:bg-[#121c25]"
                      id="btn-settings-choose-theme"
                      type="button"
                    >
                      <div className="w-11 h-11 rounded-full bg-sky-500 flex items-center justify-center text-xl shrink-0 font-bold text-white shadow border border-white/10">
                        🎨
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-sm truncate text-white">Выбор темы</span>
                          <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-sky-300 font-bold border border-slate-700/50 uppercase shrink-0">
                            Оформление
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          Настроить цветовую схему и дизайн интерфейса
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* New Navigation bottom panel replacing user profile in sidebar footer */}
            {(() => {
              const navBgClass = 
                activeThemeId === 'classic' ? 'bg-[#111a22] border-[#24303f]' :
                activeThemeId === 'graphite' ? 'bg-[#1c1c1c] border-[#2d2d2d]' :
                activeThemeId === 'midnight' ? 'bg-[#0f0724] border-[#23154e]' :
                'bg-[#ece6d5] border-[#dfd8c1]';

              const navActiveColorClass = 
                activeThemeId === 'classic' ? 'text-sky-400' :
                activeThemeId === 'graphite' ? 'text-white font-bold' :
                activeThemeId === 'midnight' ? 'text-violet-400 font-bold' :
                'text-emerald-700 font-bold';

              const navInactiveColorClass = 
                activeThemeId === 'classic' ? 'text-gray-400 hover:text-white' :
                activeThemeId === 'graphite' ? 'text-neutral-500 hover:text-neutral-300' :
                activeThemeId === 'midnight' ? 'text-violet-500 hover:text-violet-300' :
                'text-stone-500 hover:text-stone-850';

              return (
                <div className={`p-2 border-t font-sans flex items-center justify-around shrink-0 text-xs transition-colors duration-350 ${navBgClass}`} id="sidebar-nav-tabs">
                  {/* Chats tab */}
                  <button
                    onClick={() => {
                      setActiveSidebarTab('chats');
                      if (!isLandscape) {
                        setShowChatListMobile(true);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 py-1 px-3 flex-1 text-center font-medium transition duration-200 cursor-pointer ${
                      activeSidebarTab === 'chats' ? navActiveColorClass : navInactiveColorClass
                    }`}
                    id="nav-tab-chats"
                    type="button"
                  >
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] select-none">Чаты</span>
                  </button>

                  {/* Settings tab (opens settings sidebar view) */}
                  <button
                    onClick={() => {
                      setActiveSidebarTab('settings');
                      if (!isLandscape) {
                        setShowChatListMobile(true);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 py-1 px-3 flex-1 text-center font-medium transition duration-200 cursor-pointer ${
                      activeSidebarTab === 'settings' ? navActiveColorClass : navInactiveColorClass
                    }`}
                    id="nav-tab-settings"
                    type="button"
                  >
                    <Settings className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] select-none">Настройки</span>
                  </button>

                  {/* Profile tab (opens edit profile) */}
                  <button
                    onClick={openEditProfile}
                    className={`flex flex-col items-center gap-1 py-1 px-3 flex-1 text-center font-medium transition duration-200 cursor-pointer ${navInactiveColorClass}`}
                    id="nav-tab-profile"
                    type="button"
                  >
                    <LucideUser className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] select-none">Профиль</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {((!isLandscape && !showChatListMobile) || isLandscape) && (
          <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all ${activeTheme.backgroundClass}`} id="secret-chat-panel">
            <div className={`absolute inset-0 pointer-events-none opacity-25 ${activeTheme.wallpaperPattern || ''}`} />

            <div className={`relative z-10 shadow-sm flex items-center justify-between shrink-0 transition-all duration-350 ${
              isLandscape ? 'p-2 px-4 flex-row gap-4' : 'p-4 flex-row gap-3'
            } ${activeTheme.headerClass}`} id="chat-header">
              
              {!isLandscape && (
                <button
                  onClick={() => setShowChatListMobile(true)}
                  className="p-1 px-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white flex items-center gap-1 cursor-pointer shrink-0 mr-1 animate-fade-in"
                  title="Назад к диалогам"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase pr-0.5">Чаты</span>
                </button>
              )}

              {showSearch ? (
                <div className="flex-1 flex items-center gap-2 bg-black/15 dark:bg-black/30 rounded-xl px-3 py-1 border border-white/5 animate-fade-in">
                  <Search className="w-4 h-4 text-gray-300 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск сообщений..."
                    className="w-full bg-transparent text-white text-xs sm:text-sm border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="p-1 px-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer shrink-0"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div 
                      className="rounded-full flex items-center justify-center text-white shadow-inner shrink-0 font-bold transition-all border border-white/10 shadow relative animate-fade-in"
                      style={{
                        backgroundColor: activeChatId === 'global' ? '#2481cc' : activeChatId === `private_${currentUser?.id}` ? '#10b981' : (allUsers.find(u => u.id === activeChatId.replace('private_', ''))?.color || '#3b82f6'),
                        width: isLandscape ? '34px' : '42px',
                        height: isLandscape ? '34px' : '42px',
                        fontSize: isLandscape ? '16px' : '20px'
                      }}
                    >
                      {activeChatId === 'global' ? '💬' : activeChatId === `private_${currentUser?.id}` ? '🔖' : (allUsers.find(u => u.id === activeChatId.replace('private_', ''))?.avatarSymbol || '👤')}
                      {activeChatId !== 'global' && activeChatId !== `private_${currentUser?.id}` && onlineUserIds.includes(activeChatId.replace('private_', '')) && (
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#24303f]" />
                      )}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-semibold text-sm sm:text-base leading-tight truncate">
                          {activeChatId === 'global' ? 'Общий чат' : activeChatId === `private_${currentUser?.id}` ? 'Избранное' : (allUsers.find(u => u.id === activeChatId.replace('private_', ''))?.name || 'Личный чат')}
                        </h2>
                        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full select-none text-white font-medium shrink-0">
                          {activeChatId === 'global' ? 'Группа' : activeChatId === `private_${currentUser?.id}` ? 'Индивидуально' : 'Секретно'}
                        </span>
                      </div>
                      <span className="text-xs opacity-85 mt-0.5 leading-none">
                        {activeTypingUsersInThisChat.length > 0 ? (
                          <span className="font-bold text-amber-300 animate-pulse truncate block">
                            ✍️ {activeTypingUsersInThisChat.map(u => u.userName).join(', ')} пишет...
                          </span>
                        ) : (
                          <span className="truncate block opacity-85 text-[11px]">
                            {activeChatId === 'global' ? (
                              `${displayedMessages.length} соб. • ${onlineCount} в сети`
                            ) : activeChatId === `private_${currentUser?.id}` ? (
                              'Ваш личный блокнот сохранения'
                            ) : (() => {
                              const otherId = activeChatId.replace('private_', '');
                              const isOnline = onlineUserIds.includes(otherId);
                              return (
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                                  {isOnline ? 'в сети' : 'не в сети'} • Канал зашифрован
                                </span>
                              );
                            })()}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
 
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowSearch(prev => !prev)}
                  className={`p-2 hover:bg-white/10 rounded-xl transition cursor-pointer text-white flex items-center justify-center shrink-0 ${
                    showSearch ? 'bg-sky-500/20 text-sky-400' : ''
                  }`}
                  title="Поиск сообщений"
                >
                  <Search className="w-4 h-4" />
                </button>

                {(() => {
                  if (activeChatId === 'global' || activeChatId === `private_${currentUser?.id}`) return null;
                  const otherId = activeChatId.replace('private_', '');
                  const otherEntity = allUsers.find(u => u.id === otherId);
                  const isGroupOrChannel = otherEntity?.type === 'group' || otherEntity?.type === 'channel';
                  if (isGroupOrChannel) return null;

                  return (
                    <button
                      onClick={() => handleStartCall(otherId)}
                      className="p-2 hover:bg-[#10b981]/15 hover:text-emerald-400 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 bg-emerald-500/10 border border-emerald-500/25 active:scale-95 animate-fade-in"
                      title="Позвонить"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                    </button>
                  );
                })()}
              </div>
            </div>

            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto relative z-10 transition-all duration-350 ${
                isLandscape ? 'p-3 pb-5 space-y-2.5' : 'p-6 space-y-4'
              }`}
              id="chat-messages-viewport"
            >
              {loading ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 space-y-3 bg-[#111a22]/30 backdrop-blur-sm rounded-2xl p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
                  <span className="text-xs sm:text-sm">Синхронизация секретных хранилищ...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-black/5 dark:bg-black/20 rounded-2xl max-w-sm mx-auto my-auto relative z-10 select-none">
                  <span className="text-4xl mb-3">🔒</span>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    История чата пуста
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    {activeChatId === 'global' 
                      ? 'В этом чате пока нет сообщений. Будьте первым, кто напишет сюда!' 
                      : activeChatId === `private_${currentUser.id}`
                        ? 'Это Избранное. Сохраняйте сюда полезные записи, списки задач и важные файлы!'
                        : 'Это секретная личная переписка. Никакие третьи лица не могут ее просматривать.'}
                  </p>
                </div>
              ) : searchedMessages.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto my-auto relative z-10 select-none">
                  <span className="text-4xl mb-3">🔍</span>
                  <h4 className="text-sm font-bold text-gray-750 dark:text-gray-300 mb-1">
                    Ничего не найдено
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 leading-normal mb-3">
                    По запросу "{searchQuery}" совпадений не обнаружено.
                  </p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer "
                  >
                    Сбросить поиск
                  </button>
                </div>
              ) : (
                <>
                  {searchedMessages.map((msg) => {
                    const isSelf = msg.userId === currentUser.id;
                    const hasReactions = Object.keys(msg.reactions || {}).length > 0;

                    return (
                      <div 
                        key={msg.id} 
                        id={`message-row-${msg.id}`}
                        className={`flex flex-col group animate-fade-in ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="max-w-[85%] md:max-w-[70%] flex gap-2.5 items-end">
                          {!isSelf && (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm border border-white/5"
                              style={{ backgroundColor: msg.userColor }}
                              title={msg.userName}
                            >
                              <span>{msg.userAvatar}</span>
                            </div>
                          )}

                          <div className="flex flex-col">
                            {!isSelf && (
                              <span 
                                className="text-xs font-semibold mb-1 ml-1.5"
                                style={{ color: msg.userColor }}
                              >
                                {msg.userName}
                              </span>
                            )}

                            <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm border transition-all ${
                              msg.pinned 
                                ? 'border-amber-400 dark:border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md shadow-amber-500/5' 
                                : 'border-transparent'
                            } ${
                              isSelf ? activeTheme.bubbleSelfClass : activeTheme.bubbleOtherClass
                            }`}>
                              
                              {msg.replyTo && (
                                <div className="mb-2 pl-2 border-l-2 border-sky-500/70 bg-black/5 dark:bg-white/5 py-1 px-1.5 rounded text-xs text-left">
                                  <p className="font-semibold text-sky-600 dark:text-sky-400">
                                    {msg.replyTo.userName}
                                  </p>
                                  <p className={`truncate opacity-80 text-[11px] ${
                                    activeTheme.isDark ? 'text-gray-300' : 'text-gray-800'
                                  }`}>{msg.replyTo.text}</p>
                                  </div>
                              )}

                              {msg.photo && (
                                <div className="mb-2 max-w-full rounded-lg overflow-hidden shadow-sm hover:opacity-95 transition-all duration-200 cursor-pointer">
                                  <img 
                                    src={msg.photo} 
                                    alt="Прикрепленное фото" 
                                    className={`w-full object-cover rounded-lg transition-all ${
                                      isLandscape ? 'max-h-44 md:max-h-60' : 'max-h-72'
                                    }`}
                                    onClick={() => setZoomPhoto(msg.photo)}
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {msg.audio && (
                                <div className="my-1.5 min-w-[210px] sm:min-w-[250px]">
                                  <VoiceMessagePlayer 
                                    audioUrl={msg.audio} 
                                    duration={msg.audioDuration || 0} 
                                    isSelf={isSelf} 
                                  />
                                </div>
                              )}

                              {msg.text && !msg.audio && (
                                <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed text-left ${
                                  activeTheme.isDark ? 'text-gray-100' : 'text-gray-900 font-medium'
                                }`}>
                                  {(() => {
                                    if (!searchQuery.trim()) return msg.text;
                                    const parts = msg.text.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
                                    return parts.map((part, i) => 
                                      part.toLowerCase() === searchQuery.toLowerCase() 
                                        ? <mark key={i} className="bg-amber-200 text-black dark:bg-amber-500 rounded px-0.5 select-none">{part}</mark>
                                        : part
                                    );
                                  })()}
                                </p>
                              )}

                              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] select-none">
                                {msg.pinned && (
                                  <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500 rotate-45 shrink-0" />
                                )}
                                <span className="opacity-60">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isSelf && (
                                  msg.status === 'read' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 animate-fade-in" title="Прочитано" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" title="Доставлено" />
                                  )
                                )}
                              </div>

                              <div className="absolute right-0 top-0 transform translate-x-1/4 -translate-y-1/3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center shadow-md bg-white dark:bg-neutral-800 rounded-lg border border-gray-150 dark:border-neutral-700 px-1 py-0.5 z-20 gap-1">
                                <button
                                  onClick={() => setReplyTarget(msg)}
                                  className="p-1 text-gray-500 hover:text-sky-500 dark:text-gray-400 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded transition cursor-pointer"
                                  title="Ответить"
                                >
                                  <CornerUpLeft className="w-3.5 h-3.5" />
                                </button>

                                {/* Trigger reactions selection */}
                                <button
                                  onClick={() => setShowEmojiPickerForMessageId(
                                    showEmojiPickerForMessageId === msg.id ? null : msg.id
                                  )}
                                  className="p-1 text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded transition cursor-pointer"
                                  title="Реакция"
                                >
                                  <Heart className="w-3.5 h-3.5" />
                                </button>

                                {/* Pin toggle */}
                                <button
                                  onClick={() => msg.pinned ? handleUnpinMessage(msg.id) : handlePinMessage(msg.id)}
                                  className={`p-1 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded transition cursor-pointer ${
                                    msg.pinned ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400'
                                  }`}
                                  title={msg.pinned ? "Открепить сообщение" : "Закрепить сообщение"}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>

                                {/* Forward to Saved Messages */}
                                {activeChatId !== `private_${currentUser.id}` && (
                                  <button
                                    onClick={() => handleForwardToSaved(msg)}
                                    className="p-1 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded transition cursor-pointer"
                                    title="Сохранить в Избранное"
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete option (allowed for self, or bots for convenience) */}
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded transition cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Emoji picker menu dropdown */}
                              {showEmojiPickerForMessageId === msg.id && (
                                <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 bg-white dark:bg-neutral-800 border border-gray-150 dark:border-neutral-700 rounded-xl shadow-xl px-2 py-1.5 flex gap-1 z-30 animate-fade-in">
                                  {POPULAR_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReact(msg.id, emoji)}
                                      className="hover:scale-125 transition-transform p-1 text-lg cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                            </div>

                            {/* Cumulative Reactions Row */}
                            {hasReactions && (
                              <div className="flex flex-wrap gap-1 mt-1.5 ml-1 select-none">
                                {Object.entries(msg.reactions).map(([emoji, rawUids]) => {
                                  const uids = (rawUids || []) as string[];
                                  const hasReacted = uids.includes(currentUser.id);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReact(msg.id, emoji)}
                                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition cursor-pointer ${
                                        hasReacted
                                          ? 'bg-sky-100 dark:bg-sky-950/80 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                                          : 'bg-black/5 dark:bg-white/5 border-transparent text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'
                                      }`}
                                      title={uids.join(', ')}
                                    >
                                      <span>{emoji}</span>
                                      <span>{uids.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {activeTypingUsersInThisChat.length > 0 && (
              <div className="absolute bottom-20 left-6 bg-black/50 backdrop-blur text-white text-[11px] px-3 py-1.5 rounded-full z-20 shadow flex items-center gap-1.5 animate-bounce-short">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>{activeTypingUsersInThisChat.map(u => u.userName).join(', ')} печатает...</span>
              </div>
            )}

            <div className={`border-t border-gray-200/50 dark:border-neutral-800/50 bg-white/75 dark:bg-[#1a1a1a]/75 backdrop-blur-md relative z-10 shrink-0 transition-all duration-350 ${
              isLandscape ? 'p-2 px-3' : 'p-2 sm:p-4'
            }`}>
              
              {isChannelGuest ? (
                <div className="flex justify-center p-3 text-sm text-gray-500 font-semibold bg-gray-100/50 dark:bg-neutral-800/50 rounded-xl">
                  Только администраторы могут писать сообщения
                </div>
              ) : (
                <>
                  {replyTarget && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 p-2.5 rounded-xl border-l-4 border-sky-500 mb-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs min-w-0 font-medium">
                        <CornerUpLeft className="w-4 h-4 text-sky-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-750 dark:text-gray-200">
                            Ответ на письмо {replyTarget.userName}
                          </span>
                          <p className="text-gray-500 dark:text-neutral-400 truncate text-[11px]">
                            {replyTarget.text}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyTarget(null)}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {selectedPhoto && (
                    <div className={`flex items-center bg-gray-50 dark:bg-neutral-800 rounded-xl mb-2.5 animate-fade-in w-fit relative group transition-all duration-350 ${
                      isLandscape ? 'p-1.5 gap-2' : 'p-2.5 gap-3'
                    }`}>
                      <div className={`relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0 transition-all duration-350 ${
                        isLandscape ? 'w-10 h-10' : 'w-16 h-16'
                      }`}>
                        <img src={selectedPhoto} alt="Выбранное фото" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col text-left pr-6">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Фото готово к отправке</span>
                        <span className="text-[10px] text-gray-500">Нажмите «Отправить»</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition transform active:scale-90"
                        title="Удалить фото"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isRecording ? (
                    <div className="flex gap-2 items-center justify-between p-1 px-4 rounded-xl bg-rose-50/90 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-sm animate-fade-in w-full h-[52px]">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium text-xs">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                        <span>Запись {formatAudioTime(recordingDuration)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 dark:bg-neutral-800 dark:hover:bg-red-950/40 dark:text-neutral-300 dark:hover:text-red-400 text-xs font-semibold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Отмена</span>
                        </button>

                        <button
                          type="button"
                          onClick={stopAndSendRecording}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow transition transform active:scale-95 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span>Отправить</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center w-full">
                      <div className="relative flex shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="chat-photo-file-input"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('chat-photo-file-input')?.click()}
                          className={`text-gray-500 hover:text-sky-500 dark:text-gray-400 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer ${
                            isLandscape ? 'p-2' : 'p-2 sm:p-3'
                          }`}
                          title="Прикрепить фото"
                        >
                          <Paperclip className="w-5 h-5 animate-pulse-short" />
                        </button>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowQuickReactions(!showQuickReactions)}
                          className={`text-sky-500 hover:bg-sky-50 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer ${
                            isLandscape ? 'p-2' : 'p-2 sm:p-3'
                          }`}
                          title="Эмодзи"
                        >
                          <Smile className="w-5 h-5" />
                        </button>

                        {showQuickReactions && (
                          <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-3 grid grid-cols-4 gap-2 z-40 w-44 animate-fade-in">
                            {POPULAR_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  setShowQuickReactions(false);
                                }}
                                className="text-xl p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder="Напишите сообщение..."
                        className={`flex-1 min-w-0 ${activeTheme.inputBg} border rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                          activeTheme.isDark ? 'text-gray-100' : 'text-gray-900 font-medium'
                        } ${
                          isLandscape ? 'py-1.5 px-3 text-xs' : 'py-2 px-3 sm:py-3 sm:px-4 text-xs'
                        }`}
                      />

                      {!inputText.trim() && !selectedPhoto ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          id="btn-record-audio"
                          className={`shrink-0 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md cursor-pointer transition transform active:scale-95 animate-fade-in ${
                            isLandscape ? 'p-2' : 'p-2 sm:p-3'
                          }`}
                          title="Записать голосовое сообщение"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!inputText.trim() && !selectedPhoto}
                          id="btn-send-message"
                          className={`shrink-0 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-350 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md cursor-pointer transition transform active:scale-95 animate-fade-in ${
                            isLandscape ? 'p-2' : 'p-2 sm:p-3'
                          }`}
                        >
                          <Send className="w-5 h-5 animate-pulse-short" />
                        </button>
                      )}
                    </form>
                  )}
                </>
              )}
            </div>

          </div>
        )}

      </div>

      <ThemeSelector
        activeThemeId={activeThemeId}
        onSelectTheme={handleSelectTheme}
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
      />

      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" id="edit-profile-backdrop">
          <form 
            onSubmit={handleSaveProfile}
            className="w-full max-w-sm bg-[#17212b] text-white rounded-2xl shadow-2xl overflow-hidden border border-[#24303f]"
            id="edit-profile-form"
          >
            <div className="p-4 border-b border-[#24303f] flex items-center justify-between bg-[#1f2b38]">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" />
                Настройка профиля
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditProfileOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Имя и Фамилия</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={30}
                  className="w-full border border-[#2b394a] bg-[#24303f] text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Символ Аватара</label>
                <input
                  type="text"
                  required
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value.trim().slice(0, 4))}
                  className="w-full border border-[#2b394a] bg-[#24303f] text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-sky-500"
                  placeholder="Вставьте эмодзи / Смайл..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Цвет бренда</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full h-10 border border-[#2b394a] bg-[#24303f] rounded-lg cursor-pointer focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 font-sans">О себе / Описание</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.slice(0, 120))}
                  placeholder="Расскажите немного о себе..."
                  rows={2}
                  className="w-full border border-[#2b394a] bg-[#24303f] text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-sky-500 resize-none font-sans"
                />
              </div>
            </div>

            <div className="bg-[#121b25] px-5 py-3 flex justify-end gap-2 border-t border-[#24303f]">
              <button
                type="button"
                onClick={handleLogout}
                className="mr-auto px-3.5 py-2 bg-red-500/10 hover:bg-red-600 border border-red-500/25 hover:border-transparent text-red-400 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Выйти
              </button>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-4 py-2 bg-[#24303f] hover:bg-[#2b394a] text-gray-300 text-xs font-semibold rounded-lg transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {contextMenu.isOpen && (() => {
        const menuBgClass = 
          activeThemeId === 'classic' ? 'bg-white border-[#dfdfdf] text-gray-800 shadow-xl' :
          activeThemeId === 'graphite' ? 'bg-[#202020] border-[#333333] text-gray-200 shadow-2xl' :
          activeThemeId === 'midnight' ? 'bg-[#150d32]/95 border-[#2e1d70]/90 text-violet-200 shadow-2xl' :
          'bg-[#f4efe1]/95 border-[#dfd8c1] text-stone-850 shadow-xl';

        const hoverBgClass = 
          activeThemeId === 'classic' ? 'hover:bg-slate-100/80 hover:text-slate-900' :
          activeThemeId === 'graphite' ? 'hover:bg-neutral-800 hover:text-white' :
          activeThemeId === 'midnight' ? 'hover:bg-[#251556] hover:text-white' :
          'hover:bg-stone-200/50 hover:text-stone-900';

        return (
          <div 
            className={`fixed z-[9999] w-[184px] h-[82px] rounded-2xl flex flex-col justify-center overflow-hidden border p-1 animate-fade-in backdrop-blur-sm ${menuBgClass}`}
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 192)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 90)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
            id="chat-context-menu"
          >
            {/* Toggle Pin/Unpin */}
            <button
              onClick={() => {
                const isPinned = pinnedChatIds.includes(contextMenu.chatId);
                if (isPinned) {
                  setPinnedChatIds(prev => prev.filter(id => id !== contextMenu.chatId));
                  showToast(`Чат "${contextMenu.chatName}" откреплен`);
                } else {
                  setPinnedChatIds(prev => [...prev, contextMenu.chatId]);
                  showToast(`Чат "${contextMenu.chatName}" закреплен сверху`);
                }
                setContextMenu(prev => ({ ...prev, isOpen: false }));
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-1.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${hoverBgClass}`}
              id="btn-context-menu-pin"
            >
              <Pin className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${contextMenu.isPinned ? 'text-sky-450 rotate-45' : 'text-gray-400'}`} />
              <span>{contextMenu.isPinned ? 'Открепить' : 'Закрепить'}</span>
            </button>

            {/* Toggle Muted/Unmuted */}
            <button
              onClick={() => {
                const isMuted = mutedChatIds.includes(contextMenu.chatId);
                if (isMuted) {
                  setMutedChatIds(prev => prev.filter(id => id !== contextMenu.chatId));
                  showToast(`Уведомления от "${contextMenu.chatName}" включены`);
                } else {
                  setMutedChatIds(prev => [...prev, contextMenu.chatId]);
                  showToast(`Уведомления от "${contextMenu.chatName}" отключены`);
                }
                setContextMenu(prev => ({ ...prev, isOpen: false }));
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-1.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${hoverBgClass}`}
              id="btn-context-menu-mute"
            >
              {contextMenu.isMuted ? (
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 shrink-0 text-gray-400 animation-pulse" />
              )}
              <span>{contextMenu.isMuted ? 'Вкл. звук' : 'Без звука'}</span>
            </button>
          </div>
        );
      })()}

      {isSearchEntitiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" id="search-entities-backdrop">
          <div className="w-full max-w-sm bg-[#17212b] rounded-2xl shadow-2xl border border-[#24303f] overflow-hidden text-white" id="search-entities-layout">
            <div className="p-4 border-b border-[#24303f] flex items-center justify-between bg-[#1f2b38]">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Search className="w-4 h-4 shrink-0" />
                Поиск чатов, каналов и людей
              </h3>
              <button 
                onClick={() => setIsSearchEntitiesOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5 animate-pulse-short" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Поиск по названию или имени..."
                value={newPmSearchName}
                onChange={(e) => setNewPmSearchName(e.target.value)}
                className="w-full bg-[#24303f] border border-[#2b394a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1" id="entities-scroller-layout">
                {(() => {
                  const query = newPmSearchName.toLowerCase();
                  
                  const matchedGroups = allUsers
                    .filter(u => u.type === 'group' || u.type === 'channel')
                    .filter(u => !query || u.name.toLowerCase().includes(query));
                    
                  const matchedUsers = allUsers
                    .filter(u => u.type !== 'group' && u.type !== 'channel')
                    .filter(u => !query || u.name.toLowerCase().includes(query));

                  if (matchedGroups.length === 0 && matchedUsers.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-400 font-medium mb-1">Ничего не найдено</p>
                        <p className="text-[10px] text-gray-500">Попробуйте ввести другое имя для поиска в базе данных</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {matchedGroups.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-2 mb-1">
                            Группы и каналы ({matchedGroups.length})
                          </span>
                          {matchedGroups.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setJoinedEntityIds(prev => prev.includes(u.id) ? prev : [...prev, u.id]);
                                setActiveChatId(`private_${u.id}`);
                                setIsSearchEntitiesOpen(false);
                                setShowChatListMobile(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl transition hover:bg-[#24303f] flex items-center gap-3 border border-transparent hover:border-[#2b394a] cursor-pointer"
                            >
                              <div 
                                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner border border-white/5 relative"
                                style={{ backgroundColor: u.color }}
                              >
                                {u.avatarSymbol}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold truncate text-white">{u.name}</p>
                                  <span className="bg-sky-500/15 text-sky-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full select-none shrink-0 uppercase tracking-widest scale-95 origin-left">
                                    {u.type === 'group' ? 'Группа' : 'Канал'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                  Войти и добавить в список
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {matchedUsers.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#24303f]/50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-2 mb-1">
                            Люди и контакты ({matchedUsers.length})
                          </span>
                          {matchedUsers.map((u) => {
                            const isMe = u.id === currentUser?.id;
                            return (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setActiveChatId(`private_${u.id}`);
                                  setIsSearchEntitiesOpen(false);
                                  setShowChatListMobile(false);
                                }}
                                className="w-full text-left p-2.5 rounded-xl transition hover:bg-[#24303f] flex items-center gap-3 border border-transparent hover:border-[#2b394a] cursor-pointer"
                              >
                                <div 
                                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner border border-white/5 relative"
                                  style={{ backgroundColor: u.color }}
                                >
                                  {u.avatarSymbol}
                                  {onlineUserIds.includes(u.id) && !isMe && (
                                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#17212b] animate-pulse" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold truncate text-white">
                                      {u.name} {isMe && "(Вы)"}
                                    </p>
                                    {onlineUserIds.includes(u.id) && !isMe && (
                                      <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full select-none shrink-0 uppercase tracking-widest scale-95 origin-left">
                                        в сети
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1 mt-0.5">
                                    {isMe ? 'Перейти в личный блокнот (Избранное)' : 'Написать личное сообщение'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateEntityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleCreateEntity}
            className="w-full max-w-sm bg-[#17212b] text-white rounded-2xl shadow-2xl overflow-hidden border border-[#24303f]"
          >
            <div className="p-4 border-b border-[#24303f] flex items-center justify-between bg-[#1f2b38]">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Создать {isCreateEntityOpen === 'group' ? 'группу' : 'канал'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreateEntityOpen(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex bg-[#24303f] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setIsCreateEntityOpen('group')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${isCreateEntityOpen === 'group' ? 'bg-[#17212b] text-sky-400 shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Группа
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateEntityOpen('channel')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${isCreateEntityOpen === 'channel' ? 'bg-[#17212b] text-sky-400 shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Канал
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Название</label>
                <input
                  type="text"
                  required
                  value={createEntityName}
                  onChange={(e) => setCreateEntityName(e.target.value)}
                  maxLength={30}
                  className="w-full border border-[#2b394a] bg-[#24303f] text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Символ Аватара (эмодзи)</label>
                <input
                  type="text"
                  value={createEntityAvatar}
                  onChange={(e) => setCreateEntityAvatar(e.target.value.trim().slice(0, 4))}
                  className="w-full border border-[#2b394a] bg-[#24303f] text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-sky-500"
                  placeholder={isCreateEntityOpen === 'group' ? '👥' : '📢'}
                />
              </div>
            </div>

            <div className="bg-[#121b25] px-5 py-3 flex justify-end gap-2 border-t border-[#24303f]">
              <button
                type="button"
                onClick={() => setIsCreateEntityOpen(null)}
                className="px-4 py-2 bg-[#24303f] hover:bg-[#2b394a] text-gray-300 text-xs font-semibold rounded-lg transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      {zoomPhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setZoomPhoto(null)}
        >
          <button
            onClick={() => setZoomPhoto(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-[110]"
            title="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex items-center justify-center">
            <img 
              src={zoomPhoto} 
              alt="Увеличенное фото" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] shadow-xl pt-3 pb-3 px-6 rounded-full bg-neutral-900 text-white font-medium text-sm animate-fade-in flex items-center gap-3">
          <Info className="w-4 h-4 text-sky-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-1 opacity-70 hover:opacity-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
