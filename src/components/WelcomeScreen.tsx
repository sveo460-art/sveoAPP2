import React, { useState } from 'react';
import { User } from '../types';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { 
  Sparkles, MessageSquare, ArrowRight, RefreshCw, Key, 
  User as UserIcon, LogIn, UserPlus, AlignLeft, Chrome, Mail, AtSign
} from 'lucide-react';

const AVATARS = [
  '🦊', '🐱', '🐶', '🦁', '🐻', '🐼', '🐨', '🐯', '🐰', '🐼', 
  '🦉', '🦅', '🦄', '🐝', '🐙', '🦖', '🚀', '🎸', '⚽', '🍕', 
  '💎', '🍀', '💡', '🎵', '🚗', '🥑', '👾', '🎩', '🎯', '🍦'
];

const COLORS = [
  '#8a2be2', // Darker violet is perfect for purple theme first
  '#cc2485',
  '#2481cc',
  '#1d9740',
  '#df3f3f',
  '#ca7000',
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [bio, setBio] = useState('');
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
    
    // Check for Email Link Login
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setLoading(true);
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Для подтверждения, пожалуйста, введите ваш email:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await handleFirebaseToken(result.user);
          })
          .catch((error) => {
            console.error(error);
            setError('Ошибка входа по ссылке: ' + error.message);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, []);

  const handleFirebaseToken = async (firebaseUser: any) => {
    try {
      const response = await apiFetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) localStorage.setItem('tg_web_chat_token', data.token);
        onJoin(data.user || data);
      } else {
        setError(data.error || 'Ошибка входа через Firebase');
      }
    } catch (err: any) {
      console.error(err);
      setError('Ошибка соединения с сервером');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleFirebaseToken(result.user);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Не удалось войти через Google: Убедитесь, что провайдер включен в Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.includes('@')) {
      setError('Для входа по ссылке введите корректный Email вместо никнейма');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const actionCodeSettings: ActionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, username, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', username);
      setError('Ссылка для входа отправлена на ваш Email! Проверьте почту.');
    } catch (err: any) {
      console.error(err);
      setError('Ошибка при отправке ссылки. Провайдер Email Link включен?');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleFirebaseToken(userCredential.user);
    } catch (err: any) {
      console.error(err);
      setError('Ошибка входа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await handleFirebaseToken(userCredential.user);
      setError('Аккаунт создан! Пожалуйста, подтвердите ваш Email.');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError('Ошибка регистрации: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          localStorage.setItem('tg_web_chat_token', data.token);
        }
        onJoin(data.user || data);
      } else {
        setError(data.error || 'Неверное имя пользователя или пароль');
      }
    } catch (err: any) {
      console.error('Login request failed:', err);
      setError('Сбой подключения к серверу. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#100926] to-[#05030d] relative overflow-hidden font-sans" id="welcome-screen-bg">
      {/* Decorative Blur Spheres perfect for Google & Purple Theme */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8a2be2]/12 rounded-full blur-[110px] pointer-events-none" />

      <div 
        className="w-full max-w-md rounded-2xl bg-[#140c31] border border-[#2b1860] shadow-2xl p-6 sm:p-8 text-white relative z-10"
        id="welcome-card"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#8a2be2] flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 animate-bounce-short">
            <MessageSquare className="w-8 h-8 text-white transform -scale-x-100" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Secret Web Chat
          </h2>
          <p className="text-xs sm:text-sm text-purple-300/80 max-w-xs">
            Защищенные переписки и общий чат. Тема Purple по умолчанию!
          </p>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-[#2d1860] mb-6 gap-2" id="auth-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 text-center pb-2.5 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'text-purple-400 border-purple-400 font-bold font-sans'
                : 'text-gray-400 border-transparent hover:text-gray-200 font-sans font-medium'
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
                ? 'text-purple-400 border-purple-400 font-bold font-sans'
                : 'text-gray-400 border-transparent hover:text-gray-200 font-sans font-medium'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Регистрация
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/40 text-red-200 text-xs rounded-xl flex items-center gap-2 animate-fade-in font-sans">
            <span className="shrink-0 bg-red-500 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px]">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-login" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <AtSign className="w-3.5 h-3.5 text-purple-400" />
                Email
              </label>
              <input
                type="email"
                id="email-login"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите ваш email..."
                className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all font-medium font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-pwd-login" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                Пароль
              </label>
              <input
                type="password"
                id="auth-pwd-login"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите секретный пароль..."
                className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all font-sans"
              />
            </div>

            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={loading || !email.trim() || !password}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98 font-sans cursor-pointer mt-4"
            >
              {loading ? (
                <span className="animate-pulse">Обработка...</span>
              ) : (
                <>
                  Войти по паролю
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="flex items-center gap-2 my-4">
              <div className="h-px bg-[#2b1860] flex-1"></div>
              <span className="text-xs text-purple-300">или</span>
              <div className="h-px bg-[#2b1860] flex-1"></div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-[#140c31] font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 font-sans cursor-pointer"
              >
                <Chrome className="w-4 h-4 text-orange-500" />
                Войти через Google
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER MODE */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            <div className="flex flex-col items-center py-2 bg-[#1b0f44]/40 rounded-2xl border border-[#371d82] mb-2 animate-fade-in">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all duration-300 relative border-2 border-white/10"
                style={{ backgroundColor: selectedColor }}
              >
                <span>{selectedAvatar}</span>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#30167c] hover:bg-[#3d1a9b] border border-white/10 shadow text-purple-300 hover:text-white transition cursor-pointer"
                  title="Случайные настройки"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-purple-300/80 mt-2 font-sans">Ваш аватар</span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email-reg" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <AtSign className="w-3.5 h-3.5 text-purple-400" />
                Email
              </label>
              <input
                type="email"
                id="email-reg"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all font-medium font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-pwd-reg" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                Пароль
              </label>
              <input
                type="password"
                id="auth-pwd-reg"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Придумайте безопасный пароль..."
                className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all font-sans"
              />
            </div>

            {/* DESCRIPTION / BIO FIELD */}
            <div className="space-y-1.5">
              <label htmlFor="auth-bio-reg" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
                О себе / Описание (необязательно)
              </label>
              <textarea
                id="auth-bio-reg"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 120))}
                placeholder="Расскажите о себе (статус, контакты или кредо)..."
                rows={2}
                className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all resize-none font-sans"
              />
              <div className="flex justify-end text-[10px] text-purple-300/60 font-sans">
                {bio.length}/120
              </div>
            </div>

            <div className="space-y-3 pt-1 animate-fade-in">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-purple-300 block font-sans">Сменить эмодзи-значок</span>
                <div className="grid grid-cols-6 gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#120831] rounded-xl border border-[#2b1662]" id="avatar-symbols-grid">
                  {AVATARS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`text-xl p-1 rounded-lg hover:bg-white/5 transition flex items-center justify-center cursor-pointer ${
                        selectedAvatar === emoji ? 'bg-purple-600/30 ring-1 ring-purple-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-purple-300 block font-sans">Цвет фона аватара</span>
                <div className="flex items-center gap-1.5 justify-between bg-[#120831] p-2 px-3 rounded-xl border border-[#2b1662]">
                  {COLORS.map((hex, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColor(hex)}
                      className={`w-5.5 h-5.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                        selectedColor === hex ? 'scale-110 ring-2 ring-white/60' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98 font-sans cursor-pointer mt-4"
            >
              {loading ? (
                <span className="animate-pulse">Создание...</span>
              ) : (
                <>
                  Завершить регистрацию
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-[#2d1860] flex items-center justify-center gap-1.5 text-[11px] text-purple-300/60 font-sans">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Ваш профиль хранится на сервере</span>
        </div>
      </div>
    </div>
  );
};
