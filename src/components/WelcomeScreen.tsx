import React, { useState } from 'react';
import { User } from '../types';
import { 
  Sparkles, MessageSquare, ArrowRight, RefreshCw, Key, 
  User as UserIcon, LogIn, UserPlus, Mail, Chrome, ArrowLeft, 
  Check, ShieldAlert, AlignLeft 
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // States for step-by-step registration flow and verification simulation
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'google'>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [isGoogleVerifying, setIsGoogleVerifying] = useState(false);
  const [googleVerifiedUser, setGoogleVerifiedUser] = useState<string | null>(null);
  const [googleVerifiedUid, setGoogleVerifiedUid] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

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

  const handleSendEmailCode = async () => {
    if (!emailAddress.trim()) {
      setError('Пожалуйста, введите адрес электронной почты');
      return;
    }
    setError(null);
    setSendingCode(true);

    try {
      // 1. Register with Firebase Authentication directly using email & password
      const userCredential = await createUserWithEmailAndPassword(auth, emailAddress, password);
      const user = userCredential.user;

      setLoading(true);
      const cleanUsername = username.trim();

      // 2. Register profile in backend
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.uid,
          email: emailAddress,
          username: cleanUsername,
          password,
          avatarSymbol: selectedAvatar,
          color: selectedColor,
          bio: bio.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onJoin(data);
      } else {
        setError(data.error || 'Произошла непредвиденная ошибка при создании аккаунта на сервере');
      }
    } catch (err: any) {
      console.error('Firebase Email registration failed:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Этот адрес электронной почты уже зарегистрирован. Пожалуйста, со страницы входа выберите быстрый вход Google или укажите Email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некорректный адрес электронной почты.');
      } else if (err.code === 'auth/weak-password') {
        setError('Пароль должен состоять минимум из 6 символов.');
      } else {
        setError(err.message || 'Ошибка регистрации в Firebase Auth');
      }
    } finally {
      setSendingCode(false);
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationMethod === 'google') {
      if (!googleVerifiedUid || !googleVerifiedUser) {
        setError('Пожалуйста, сначала верифицируйте Google аккаунт');
        return;
      }
    }

    // Attempt actual registration
    setLoading(true);
    const cleanUsername = username.trim();
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: googleVerifiedUid || undefined,
          email: googleVerifiedUser || undefined,
          username: cleanUsername,
          password: password || undefined,
          avatarSymbol: selectedAvatar,
          color: selectedColor,
          bio: bio.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onJoin(data);
      } else {
        setError(data.error || 'Произошла непредвиденная ошибка при создании аккаунта');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Сбой подключения к серверу. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMockVerify = async () => {
    setError(null);
    setIsGoogleVerifying(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      setGoogleVerifiedUser(user.email);
      setGoogleVerifiedUid(user.uid);
      if (user.displayName) {
        setUsername(user.displayName);
      } else if (user.email) {
        setUsername(user.email.split('@')[0]);
      }
    } catch (err: any) {
      console.error('Google verification failed:', err);
      setError(err?.message || 'Не удалось выполнить входящую верификацию через Google.');
    } finally {
      setIsGoogleVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleSigningIn(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: firebaseUser.uid }),
      });

      const data = await response.json();

      if (response.ok) {
        onJoin(data);
      } else {
        // If user logged in using google provider but does not have a server profile yet,
        // let's auto create details and join on the fly!
        const responseReg = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Пользователь',
            avatarSymbol: '🦊',
            color: '#8a2be2',
            bio: 'Профиль создан через Google быстрый вход',
            email: firebaseUser.email || undefined
          }),
        });
        const dataReg = await responseReg.json();
        if (responseReg.ok) {
          onJoin(dataReg);
        } else {
          setError(data.error || 'Ошибка входа через Google. Пожалуйста, пройдите простую регистрацию.');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In login failed:', err);
      setError(err?.message || 'Не удалось авторизоваться через Google.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleProceedToVerification = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Пожалуйста, введите имя пользователя');
      return;
    }
    if (cleanUsername.length < 2) {
      setError('Имя пользователя должно содержать не менее 2 символов');
      return;
    }
    if (!password) {
      setError('Пожалуйста, введите пароль');
      return;
    }
    if (password.length < 6) {
      setError('Пароль для почтовой регистрации в Firebase должен содержать не менее 6 символов');
      return;
    }

    setError(null);
    setRegistrationStep(2);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Пожалуйста, введите имя пользователя или ваш Email');
      return;
    }
    if (!password) {
      setError('Пожалуйста, введите пароль');
      return;
    }

    setLoading(true);
    setError(null);
    const isEmailInput = cleanUsername.includes('@');

    try {
      if (isEmailInput) {
        // Firebase Auth login
        const result = await signInWithEmailAndPassword(auth, cleanUsername, password);
        const firebaseUser = result.user;

        const response = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: firebaseUser.uid }),
        });

        const data = await response.json();

        if (response.ok) {
          onJoin(data);
        } else {
          // Profile exists in Firebase but not locally on disk (e.g. wiped Railway container), restore!
          const responseReg = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Пользователь',
              password,
              avatarSymbol: '🦊',
              color: '#8a2be2',
              bio: 'Профиль восстановлен при переносе',
              email: firebaseUser.email || undefined
            }),
          });
          const dataReg = await responseReg.json();
          if (responseReg.ok) {
            onJoin(dataReg);
          } else {
            setError('Профиль не найден на сервере. Пожалуйста, пройдите регистрацию.');
          }
        }
      } else {
        // Standard Username Login on server
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password }),
        });

        const data = await response.json();

        if (response.ok) {
          onJoin(data);
        } else {
          setError(data.error || 'Неверное имя пользователя или пароль');
        }
      }
    } catch (err: any) {
      console.error('Login request failed:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Неверный Email или пароль.');
      } else {
        setError(err.message || 'Сбой подключения к серверу. Попробуйте еще раз.');
      }
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

        {/* Tab Header - only show if at Step 1 */}
        {registrationStep === 1 && (
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
        )}

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
              <label htmlFor="username-login" className="flex items-center gap-1 text-xs font-semibold text-purple-300 font-sans">
                <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                Имя пользователя (Никнейм)
              </label>
              <input
                type="text"
                id="username-login"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите никнейм..."
                maxLength={32}
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
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98 font-sans cursor-pointer"
            >
              {loading ? (
                <span className="animate-pulse">Обработка...</span>
              ) : (
                <>
                  Войти в чат
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative flex py-3 items-center" id="login-or-divider">
              <div className="flex-grow border-t border-purple-900/30"></div>
              <span className="flex-shrink mx-4 text-[10px] text-purple-300/40 uppercase tracking-wider font-semibold font-sans">или</span>
              <div className="flex-grow border-t border-purple-900/30"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSigningIn}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-[#3e1d82] rounded-xl text-purple-200 font-semibold text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGoogleSigningIn ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-purple-200 border-t-transparent rounded-full animate-spin"></div>
                  Вход через Google...
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.491-5.514c1.4.004 2.673.535 3.639 1.411l3.076-3.076A10 10 0 1 0 12 21.993c5.158 0 9.76-3.763 9.76-9.714a9.1 9.1 0 0 0-.256-2.285H12.24z"/>
                  </svg>
                  Быстрый вход через Google
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. REGISTER MODE: STEP 1 (PROFILE CONFIGURATION) */}
        {activeTab === 'register' && registrationStep === 1 && (
          <form onSubmit={handleProceedToVerification} className="space-y-4">
            
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
              <div className="flex justify-between items-center text-xs font-semibold text-purple-300">
                <label htmlFor="username-reg" className="flex items-center gap-1 font-sans">
                  <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                  Имя пользователя / Никнейм
                </label>
                <button 
                  type="button"
                  onClick={handleRandomize} 
                  className="text-purple-300 hover:text-white flex items-center gap-1 font-normal text-[11px] font-sans cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Случайное имя
                </button>
              </div>
              <input
                type="text"
                id="username-reg"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Например, Super_Coder_7"
                maxLength={32}
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
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-98 font-sans cursor-pointer"
            >
              Подтвердить & Продолжить
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. REGISTER MODE: STEP 2 (VERIFICATION VIA EMAIL / GOOGLE) */}
        {activeTab === 'register' && registrationStep === 2 && (
          <div className="space-y-4 animate-fade-in font-sans">
            <button
              onClick={() => {
                setRegistrationStep(1);
                setIsCodeSent(false);
                setGeneratedCode('');
                setEnteredCode('');
                setGoogleVerifiedUser(null);
              }}
              className="text-purple-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer select-none transition-colors mb-2"
              type="button"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Вернуться к настройкам профиля
            </button>

            <div className="p-3 bg-[#1b0f44]/50 border border-[#361e80] rounded-xl flex items-center gap-2 text-xs">
              <span className="text-xl">🛡️</span>
              <div className="text-left font-sans text-purple-200">
                <p className="font-semibold text-xs text-white">Верификация профиля</p>
                <p className="text-[10px] text-purple-300/80">Пожалуйста, верифицируйте никнейм перед активацией чата.</p>
              </div>
            </div>

            {/* Select Verification Method Tabs */}
            {!googleVerifiedUser && (
              <div className="grid grid-cols-2 gap-2 bg-[#120831] p-1 rounded-xl border border-[#2b1662]">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('email');
                    setError(null);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    verificationMethod === 'email' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Код на почту
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('google');
                    setError(null);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    verificationMethod === 'google' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Chrome className="w-3.5 h-3.5" />
                  Войти с Google
                </button>
              </div>
            )}

            {/* A. EMAIL METHOD WRAPPER */}
            {verificationMethod === 'email' && !googleVerifiedUser && (
              <div className="space-y-4 pt-1 animate-fade-in" id="verification-email-block">
                
                {/* Email input */}
                <div className="space-y-1.5">
                  <label htmlFor="verification-email-input" className="text-xs font-semibold text-purple-300 block text-left">
                    Адрес электронной почты (E-mail)
                  </label>
                  <input
                    type="email"
                    id="verification-email-input"
                    disabled={sendingCode || loading}
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] disabled:bg-purple-950/20 disabled:text-gray-400 rounded-xl px-4 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all font-sans"
                  />
                  <p className="text-[10px] text-purple-300/60 leading-relaxed text-left">
                    Этот адрес почты и ваш пароль будут сохранены в безопасной облачной базе Firebase Authentication. При последующих входах вы сможете использовать ваш e-mail.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendEmailCode}
                  disabled={sendingCode || loading || !emailAddress.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:opacity-40 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition duration-200 flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
                >
                  {sendingCode || loading ? (
                    <span className="animate-pulse">Регистрация в Firebase...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Зарегистрироваться через Firebase
                    </>
                  )}
                </button>

              </div>
            )}

            {/* B. GOOGLE METHOD WRAPPER */}
            {(verificationMethod === 'google' || googleVerifiedUser) && (
              <div className="space-y-4 pt-1 animate-fade-in" id="verification-google-block">
                
                {!googleVerifiedUser ? (
                  <div className="space-y-4 text-center">
                    <p className="text-xs text-purple-200">
                      Используйте безопасный шлюз Google Account для автоматической моментальной верификации. Пароль не разглашается.
                    </p>

                    <button
                      type="button"
                      onClick={handleGoogleMockVerify}
                      disabled={isGoogleVerifying}
                      className="w-full py-4 px-4 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 font-semibold text-sm transition-all shadow hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden active:scale-98"
                    >
                      {isGoogleVerifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#1a0c30] border-t-transparent rounded-full animate-spin mr-1"></div>
                          Подключение к Google...
                        </>
                      ) : (
                        <>
                          {/* Colored Clean Google Icon Logo */}
                          <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.491-5.514c1.4.004 2.673.535 3.639 1.411l3.076-3.076A10 10 0 1 0 12 21.993c5.158 0 9.76-3.763 9.76-9.714a9.1 9.1 0 0 0-.256-2.285H12.24z"/>
                          </svg>
                          Войти с помощью аккаунта Google
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Success state after google check */
                  <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl text-center space-y-4 animate-fade-in">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <Check className="w-7 h-7 text-white" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Успешно верифицировано!</h4>
                      <p className="text-xs text-emerald-300">Google аккаунт подтвержден:</p>
                      <p className="text-xs text-white bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800 font-mono inline-block mt-1">
                        {googleVerifiedUser}
                      </p>
                    </div>

                    <form onSubmit={handleVerifyAndRegister} className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition cursor-pointer flex items-center justify-center gap-2 transform active:scale-98"
                      >
                        {loading ? 'Создание...' : 'Завершить регистрацию →'}
                      </button>
                    </form>
                  </div>
                )}
                
              </div>
            )}

          </div>
        )}

        <div className="mt-5 pt-3 border-t border-[#2d1860] flex items-center justify-center gap-1.5 text-[11px] text-purple-300/60 font-sans">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Нажмите кнопку «Написать лично (ЛС)» для тестирования писем.</span>
        </div>
      </div>
    </div>
  );
};
