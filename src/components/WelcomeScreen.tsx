import React, { useState } from 'react';
import { User } from '../types';
import { Sparkles, MessageSquare, ArrowRight, RefreshCw, Key, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

const AVATARS = [
  '🦊', '🐱', '🐶', '🦁', '🐻', '🐼', '🐨', '🐯', '🐰', '🐼', 
  '🦉', '🦅', '🦄', '🐝', '🐙', '🦖', '🚀', '🎸', '⚽', '🍕', 
  '💎', '🍀', '💡', '🎵', '🚗', '🥑', '👾', '🎩', '🎯', '🍦'
];

const COLORS = [
  '#2481cc',
  '#1d9740',
  '#df3f3f',
  '#ca7000',
  '#8a2be2',
  '#cc2485',
  '#008b8b',
  '#487a53',
];

const RANDOM_ADJECTIVES = [
  'Быстрый', 'Умный', 'Веселый', 'Мудрый', 'Смелый', 'Сонный', 
  'Добрый', 'Креативный', 'Стильный', 'Тихий', 'Дикий', 'Яркий'
];

const RANDOM_NICKNAMES = [
  'Админ', 'Кодер', 'Пользователь', 'Разработчик', 'Дизайнер', 
  'Лис', 'Кот', 'Осьминог', 'Марсоход', 'Астронавт', 'Бот', 'Гость'
];

interface WelcomeScreenProps {
  onJoin: (user: User) => void;
}

type AuthMode = 'login' | 'register';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onJoin }) => {
  const [activeTab, setActiveTab] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRandomize = () => {
    const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
    const nick = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    const number = Math.floor(Math.random() * 900) + 100;
    
    setUsername(`${adj}_${nick}_${number}`);
    setSelectedAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  };

  React.useEffect(() => {
    handleRandomize();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Пожалуйста, введите имя пользователя');
      return;
    }
    if (!password) {
      setError('Пожалуйста, введите пароль');
      return;
    }

    setLoading(true);
    setError(null);

    const url = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const bodyPayload = activeTab === 'login'
      ? { username: cleanUsername, password }
      : { username: cleanUsername, password, avatarSymbol: selectedAvatar, color: selectedColor };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (response.ok) {
        onJoin(data);
      } else {
        setError(data.error || 'Произошла непредвиденная ошибка');
      }
    } catch (err) {
      console.error('Authentication request failed:', err);
      setError('Сбой подключения к серверу. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#1d2a3a] to-[#0c131a] relative overflow-hidden" id="welcome-screen-bg">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div 
        className="w-full max-w-md rounded-2xl bg-[#17212b] border border-[#24303f] shadow-2xl p-6 sm:p-8 text-white relative z-10"
        id="welcome-card"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-3 animate-bounce-short">
            <MessageSquare className="w-8 h-8 text-white transform -scale-x-100" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Secret Web Chat
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xs">
            Личные шифрованные переписки и общий чат в одном приложении!
          </p>
        </div>

        <div className="flex border-b border-[#24303f] mb-6 gap-2" id="auth-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 text-center pb-2.5 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'text-sky-400 border-sky-400 font-bold'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Вход в аккаунт
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex-1 text-center pb-2.5 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'text-sky-400 border-sky-400 font-bold'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Регистрация
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/40 text-red-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="shrink-0 bg-red-500 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px]">!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {activeTab === 'register' && (
            <div className="flex flex-col items-center py-2 bg-[#121b25]/70 rounded-2xl border border-[#24303f] mb-2 animate-fade-in">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all duration-300 relative border-2 border-white/10"
                style={{ backgroundColor: selectedColor }}
              >
                <span>{selectedAvatar}</span>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#24303f] hover:bg-[#2b394a] border border-white/10 shadow text-sky-400 hover:text-sky-300 transition"
                  title="Случайные настройки"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-gray-400 mt-2">Вид Вашего аватара</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
              <label htmlFor="username" className="flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                Имя пользователя (Никнейм)
              </label>
              {activeTab === 'register' && (
                <button 
                  type="button"
                  onClick={handleRandomize} 
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-normal text-[11px]"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Случайное имя
                </button>
              )}
            </div>
            <input
              type="text"
              id="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите никнейм..."
              maxLength={32}
              className="w-full bg-[#24303f] border border-[#2b394a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-pwd-input" className="flex items-center gap-1 text-xs font-semibold text-gray-400">
              <Key className="w-3.5 h-3.5 text-gray-500" />
              Пароль
            </label>
            <input
              type="password"
              id="auth-pwd-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите секретный пароль..."
              className="w-full bg-[#24303f] border border-[#2b394a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {activeTab === 'register' && (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-400 block">Эмодзи для аватара</span>
                <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#121b25] rounded-xl border border-[#232f3c]" id="avatar-symbols-grid">
                  {AVATARS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`text-xl p-1 rounded-lg hover:bg-white/5 transition flex items-center justify-center ${
                        selectedAvatar === emoji ? 'bg-sky-500/20 ring-1 ring-sky-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-400 block">Цвет аватара</span>
                <div className="flex items-center gap-1.5 justify-between bg-[#121b25] p-2 px-3 rounded-xl border border-[#232f3c]">
                  {COLORS.map((hex, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColor(hex)}
                      className={`w-5.5 h-5.5 rounded-full transition-all flex items-center justify-center ${
                        selectedColor === hex ? 'scale-110 ring-2 ring-white/60' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98"
          >
            {loading ? (
              <span className="animate-pulse">Обработка...</span>
            ) : activeTab === 'login' ? (
              <>
                Войти в чат
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Создать аккаунт
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-[#24303f] flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Нажмите кнопку «Написать лично (ЛС)», чтобы протестировать личные диалоги!</span>
        </div>
      </div>
    </div>
  );
};
