import React, { useState } from 'react';
import { User } from '../types';
import { 
  Sparkles, MessageSquare, ArrowRight, RefreshCw, Key, 
  User as UserIcon, LogIn, UserPlus, Mail, Chrome, ArrowLeft, 
  Check, ShieldAlert, AlignLeft 
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

  const handleSendEmailCode = () => {
    if (!emailAddress.trim()) {
      setError('Пожалуйста, введите адрес электронной почты');
      return;
    }
    setError(null);
    setSendingCode(true);

    setTimeout(() => {
      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setSendingCode(false);
      setIsCodeSent(true);
    }, 1000);
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationMethod === 'email') {
      if (!enteredCode.trim()) {
        setError('Пожалуйста, введите проверочный код');
        return;
      }
      if (enteredCode.trim() !== generatedCode) {
        setError('Неверный код верификации. Пожалуйста, проверьте и попробуйте еще раз.');
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
        setError(data.error || 'Произошла непредвиденная ошибка при создании аккаунта');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Сбой подключения к серверу. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMockVerify = () => {
    setError(null);
    setIsGoogleVerifying(true);

    setTimeout(() => {
      // Simulate Google authentication callback
      setGoogleVerifiedUser(username.toLowerCase().replace(/[^a-z0-9_]/g, '') + '@gmail.com');
      setIsGoogleVerifying(false);
    }, 1500);
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
    if (password.length < 4) {
      setError('Пароль должен содержать не менее 4 символов');
      return;
    }

    setError(null);
    setRegistrationStep(2);
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
    } catch (err) {
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
                
                {/* Email input (hidden if code already sent) */}
                <div className="space-y-1.5">
                  <label htmlFor="verification-email-input" className="text-xs font-semibold text-purple-300 block text-left">
                    Адрес электронной почты (E-mail)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="verification-email-input"
                      disabled={isCodeSent || sendingCode}
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="alex@example.com"
                      className="flex-1 bg-[#1b0e45]/80 border border-[#3e1d82] disabled:bg-purple-950/20 disabled:text-gray-400 rounded-xl px-4 py-2 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all font-sans"
                    />
                    {!isCodeSent && (
                      <button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={sendingCode || !emailAddress.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:opacity-40 text-white font-medium text-xs px-3 rounded-xl transition cursor-pointer"
                      >
                        {sendingCode ? 'Получение...' : 'Отправить код'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated inbox message to satisfy code delivery in sandbox */}
                {isCodeSent && (
                  <div className="p-3 bg-[#150a31] border-2 border-indigo-500/40 rounded-xl text-left text-xs space-y-1.5 my-3 animate-fade-in relative overflow-hidden shadow-lg shadow-indigo-500/10" id="simulated-email-inbox">
                    <div className="absolute top-0 right-0 bg-indigo-500/20 text-[#60a5fa] px-2 py-0.5 text-[8px] rounded-bl font-mono uppercase tracking-wider font-bold">Оповещение</div>
                    <div className="flex items-center gap-1">
                      <span className="animate-ping rounded-full bg-indigo-400 w-1.5 h-1.5 shrink-0 mr-1" />
                      <span className="font-bold text-gray-100">✉️ Проверочное письмо:</span>
                    </div>
                    <p className="text-gray-300 text-[11px] font-light">Вам пришел секретный 6-значный код верификации:</p>
                    <div className="bg-[#1b0f55] border border-indigo-400/25 p-2 rounded-lg text-center my-1 select-all hover:bg-indigo-950 transition duration-150">
                      <strong className="text-yellow-400 text-lg font-mono tracking-widest">{generatedCode}</strong>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">Скопируйте или введите этот код в поле ниже для создания профиля.</p>
                  </div>
                )}

                {/* Verification Code input form */}
                {isCodeSent && (
                  <form onSubmit={handleVerifyAndRegister} className="space-y-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <label htmlFor="vcode-input" className="text-xs font-semibold text-purple-300 block text-left">
                        Введите проверочный код
                      </label>
                      <input
                        type="text"
                        id="vcode-input"
                        required
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-[#1b0e45]/80 border border-[#3e1d82] rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-purple-300/20 focus:outline-none focus:border-purple-400 transition-all"
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-purple-300/80">
                      <span>Верифицировано по email: <strong>{emailAddress}</strong></span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsCodeSent(false);
                          setEmailAddress('');
                          setEnteredCode('');
                          setGeneratedCode('');
                        }}
                        className="text-purple-400 hover:underline cursor-pointer"
                      >
                        Сменить Email
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || enteredCode.length < 6}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:opacity-40 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition duration-200 flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
                    >
                      {loading ? (
                        <span className="animate-pulse">Обработка...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Активировать аккаунт
                        </>
                      )}
                    </button>
                  </form>
                )}

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
