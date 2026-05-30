import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isSelf: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration,
  isSelf
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Playback failed", err);
      });
      setIsPlaying(true);
      
      timerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const value = parseFloat(e.target.value);
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const speedToggle = () => {
    if (playbackRate === 1) setPlaybackRate(1.5);
    else if (playbackRate === 1.5) setPlaybackRate(2);
    else setPlaybackRate(1);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const seedWaveform = [25, 45, 65, 35, 85, 55, 45, 75, 95, 35, 55, 85, 25, 65, 45, 85, 35, 55];
  const totalBars = seedWaveform.length;

  return (
    <div className={`flex items-center gap-2.5 p-1 rounded-lg w-full max-w-[260px] select-none ${
      isSelf 
        ? 'text-white' 
        : 'text-gray-800 dark:text-gray-100'
    }`}>
      <button 
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isSelf 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-sky-500 hover:bg-sky-600 text-white'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current text-white border-none outline-none" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-[1px] text-white border-none outline-none" />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="relative h-6 flex items-center gap-[3px] w-full">
          <input 
            type="range"
            min={0}
            max={audioRef.current?.duration || duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {seedWaveform.map((heightPercent, idx) => {
            const barProgress = (idx / totalBars) * (audioRef.current?.duration || duration || 1);
            const isPlayed = currentTime >= barProgress;
            
            return (
              <div 
                key={idx}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: isPlayed 
                    ? (isSelf ? '#ffffff' : '#0ea5e9') 
                    : (isSelf ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)') 
                }}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-1 text-[10px] opacity-75 font-mono">
          <span>{formatTime(isPlaying ? currentTime : duration)}</span>
          <span className="flex items-center gap-0.5">
            <Volume2 className="w-3 h-3" /> {duration}s
          </span>
        </div>
      </div>

      <button 
        type="button"
        onClick={speedToggle}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition shrink-0 border ${
          isSelf 
            ? 'bg-white/10 border-white/20 hover:bg-white/25 text-white' 
            : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10 hover:bg-black/10 text-gray-700 dark:text-neutral-200'
        }`}
      >
        {playbackRate}x
      </button>
    </div>
  );
};
