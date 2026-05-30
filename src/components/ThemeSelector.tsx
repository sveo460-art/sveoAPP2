import React from 'react';
import { ThemeId, ChatTheme } from '../types';
import { Sparkles, Palette, Monitor, Laptop, Sun, Moon } from 'lucide-react';

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'classic',
    name: 'Classic Blue',
    isDark: false,
    themeColor: '#2481cc',
    backgroundClass: 'bg-[#e7ebf0]',
    headerClass: 'bg-[#517da2] text-white',
    sidebarClass: 'bg-white border-r border-[#e3ebf3] text-gray-800',
    bubbleSelfClass: 'bg-[#effdde] text-gray-900 border-none shadow-[0_1px_1px_rgba(0,0,0,0.1)]',
    bubbleOtherClass: 'bg-white text-gray-900 border-none shadow-[0_1px_1px_rgba(0,0,0,0.1)]',
    activeAccentClass: 'bg-[#517da2] text-white',
    textColorSec: 'text-gray-500',
    cardClass: 'bg-white border border-[#e3ebf3]',
    inputBg: 'bg-white border-[#d2def0]',
    wallpaperPattern: 'classic-pattern'
  },
  {
    id: 'graphite',
    name: 'Dark Graphite',
    isDark: true,
    themeColor: '#4f5e71',
    backgroundClass: 'bg-[#181818] text-gray-100',
    headerClass: 'bg-[#212121] text-gray-100 border-b border-[#2d2d2d]',
    sidebarClass: 'bg-[#212121] border-r border-[#2d2d2d] text-gray-200',
    bubbleSelfClass: 'bg-[#2b5278] text-white border-none shadow-md',
    bubbleOtherClass: 'bg-[#272727] text-gray-200 border-none shadow-md',
    activeAccentClass: 'bg-[#2b5278] text-white',
    textColorSec: 'text-gray-400',
    cardClass: 'bg-[#212121] border border-[#2d2d2d]',
    inputBg: 'bg-[#2b2b2b] border-[#3a3a3a]',
    wallpaperPattern: 'graphite-pattern'
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    isDark: true,
    themeColor: '#8a2be2',
    backgroundClass: 'bg-gradient-to-b from-[#0f0c1b] to-[#1a103c] text-violet-100',
    headerClass: 'bg-[#130b2e]/90 text-violet-100 border-b border-[#2e1d6d] backdrop-blur',
    sidebarClass: 'bg-[#130b2e] border-r border-[#2e1d6d] text-violet-100',
    bubbleSelfClass: 'bg-gradient-to-r from-[#7a1fa2] to-[#512da8] text-white border-none shadow-lg',
    bubbleOtherClass: 'bg-[#1e1348] text-violet-200 border border-[#392383] shadow-md',
    activeAccentClass: 'bg-[#7a1fa2] text-white',
    textColorSec: 'text-violet-400',
    cardClass: 'bg-[#150a32] border border-[#2c1860]',
    inputBg: 'bg-[#1c0d45] border-[#3f1d82]',
    wallpaperPattern: 'midnight-pattern'
  },
  {
    id: 'organic',
    name: 'Organic Mint',
    isDark: false,
    themeColor: '#487a53',
    backgroundClass: 'bg-[#f4efe1]',
    headerClass: 'bg-[#487a53] text-white',
    sidebarClass: 'bg-[#fcfbf9] border-r border-[#e0dac6] text-stone-800',
    bubbleSelfClass: 'bg-[#e2f0d9] text-stone-900 border-none shadow-[0_1px_1px_rgba(0,0,0,0.1)]',
    bubbleOtherClass: 'bg-[#fbfaf6] text-stone-900 border border-[#e8e2cf] shadow-[0_1px_1px_rgba(0,0,0,0.05)]',
    activeAccentClass: 'bg-[#487a53] text-white',
    textColorSec: 'text-stone-500',
    cardClass: 'bg-[#fbfaf6] border border-[#e0dac6]',
    inputBg: 'bg-white border-[#dcd6c0]',
    wallpaperPattern: 'organic-pattern'
  }
];

interface ThemeSelectorProps {
  activeThemeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  activeThemeId,
  onSelectTheme,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="theme-selector-backdrop">
      <div 
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-gray-100 dark:border-neutral-800"
        id="theme-selector-modal"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Выберите оформление чата
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-3 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 transition"
          >
            Закрыть
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <p className="text-xs text-gray-500 dark:text-neutral-400 mb-5">
            Наш чат выглядит по-разному в зависимости от ваших предпочтений. Выберите один из четырех профессионально подготовленных дизайнов:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHAT_THEMES.map((theme) => {
              const isActive = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  id={`theme-btn-${theme.id}`}
                  className={`relative flex flex-col text-left rounded-xl overflow-hidden border-2 transition-all p-3 ${
                    isActive 
                      ? 'border-sky-500 ring-2 ring-sky-500/20' 
                      : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'
                  } bg-gray-50 dark:bg-neutral-900`}
                >
                  <div className="flex items-center justify-between mb-3 w-full">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      {theme.name}
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                      )}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">
                      {theme.isDark ? 'Dark 🔥' : 'Light ☀️'}
                    </span>
                  </div>

                  <div className={`w-full rounded-lg p-2.5 flex flex-col gap-1.5 ${theme.backgroundClass} min-h-[90px] overflow-hidden relative`}>
                    <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                      backgroundImage: `radial-gradient(${theme.themeColor} 1px, transparent 1px)`,
                      backgroundSize: '12px 12px'
                    }} />
                    
                    <div className={`text-[10px] rounded-lg p-1.5 max-w-[80%] self-start ${theme.bubbleOtherClass}`}>
                      👋 Привет! Как тебе чат?
                    </div>
                    <div className={`text-[10px] rounded-lg p-1.5 max-w-[80%] self-end ${theme.bubbleSelfClass}`}>
                      🚀 Супер! Дизайн классный!
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-lg bg-sky-50 dark:bg-slate-900/40 text-xs text-sky-700 dark:text-sky-300 flex gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Лайв-синк</strong>: Выбранное оформление мгновенно изменит интерфейс вашего рабочего пространства чата (шапку, фон, фоновый паттерн и облачка писем).
            </span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-neutral-900 px-6 py-4 flex justify-between items-center text-xs text-gray-500 dark:text-neutral-400 border-t border-gray-100 dark:border-neutral-800">
          <span>Разработано по современным гайдлайнам UX</span>
          <button
            onClick={onClose}
            className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-1.5 px-4 rounded-lg transition"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
