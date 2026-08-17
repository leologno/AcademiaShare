import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Check, Volume2, VolumeX, SkipForward } from 'lucide-react';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const Pomodoro = () => {
  // Timer Settings (in minutes)
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortMinutes, setShortMinutes] = useState(5);
  const [longMinutes, setLongMinutes] = useState(15);
  
  // Timer State
  const [mode, setMode] = useState('work'); // 'work', 'short', 'long'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const { soundEnabled, setSoundEnabled } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Sync timer when intervals are modified in settings
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'work') {
        setTimeLeft(workMinutes * 60);
        setTotalDuration(workMinutes * 60);
      } else if (mode === 'short') {
        setTimeLeft(shortMinutes * 60);
        setTotalDuration(shortMinutes * 60);
      } else {
        setTimeLeft(longMinutes * 60);
        setTotalDuration(longMinutes * 60);
      }
    }
  }, [workMinutes, shortMinutes, longMinutes, mode, isRunning]);

  // Main countdown ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playNotificationSound();
            handleModeCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, mode]);

  // Mode completion switcher
  const handleModeCompletion = async () => {
    if (mode === 'work') {
      try {
        await api.post('/auth/profile/focus');
      } catch (err) {
        console.error('Error saving focus session:', err);
      }
      alert("Study session completed! Take a break.");
      switchMode('short');
    } else {
      alert("Break completed! Time to get back to work.");
      switchMode('work');
    }
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    let minutes = 25;
    if (newMode === 'work') minutes = workMinutes;
    else if (newMode === 'short') minutes = shortMinutes;
    else if (newMode === 'long') minutes = longMinutes;
    
    setTimeLeft(minutes * 60);
    setTotalDuration(minutes * 60);
  };

  // Natively synthesise a focus complete bell chime using Web Audio API
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Harmonic bell sequence: C5 -> G5 -> C6
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); 
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.4); 

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    } catch (e) {
      console.error('Audio synthesizer failed:', e);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    let minutes = 25;
    if (mode === 'work') minutes = workMinutes;
    else if (mode === 'short') minutes = shortMinutes;
    else if (mode === 'long') minutes = longMinutes;
    
    setTimeLeft(minutes * 60);
    setTotalDuration(minutes * 60);
  };

  // Format seconds to MM:SS string
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circular progress math (radius 120)
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = totalDuration > 0 ? (timeLeft / totalDuration) : 1;
  const strokeDashoffset = circumference - progressPercent * circumference;

  // Determine accent color class based on state mode
  const getAccentColor = () => {
    if (mode === 'work') return 'text-indigo-400 border-indigo-500';
    if (mode === 'short') return 'text-emerald-400 border-emerald-500';
    return 'text-cyan-400 border-cyan-500';
  };

  const getSvgStrokeColor = () => {
    if (mode === 'work') return '#6366f1'; // Indigo
    if (mode === 'short') return '#10b981'; // Emerald
    return '#06b6d4'; // Cyan
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in text-gray-200">
      
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Focus Space</h1>
        <p className="text-sm text-gray-400">Boost your productivity using customizable intervals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Timer Control Card */}
        <div className="md:col-span-2 glass p-8 rounded-2xl border border-gray-800 shadow-2xl flex flex-col items-center justify-center space-y-8">
          
          {/* Mode tab selectors */}
          <div className="flex bg-gray-900/60 p-1.5 rounded-full border border-gray-800 gap-1">
            <button 
              onClick={() => switchMode('work')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                mode === 'work' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pomodoro
            </button>
            <button 
              onClick={() => switchMode('short')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                mode === 'short' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Short Break
            </button>
            <button 
              onClick={() => switchMode('long')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                mode === 'long' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Long Break
            </button>
          </div>

          {/* Svg Radial countdown timer */}
          <div className="relative w-72 h-72 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="144" 
                cy="144" 
                r={radius} 
                className="fill-none stroke-gray-900/40" 
                strokeWidth="6" 
              />
              <circle 
                cx="144" 
                cy="144" 
                r={radius} 
                className="fill-none transition-all duration-100 ease-linear" 
                strokeWidth="8"
                stroke={getSvgStrokeColor()}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-bold font-mono text-white tracking-tight">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-2">
                {mode === 'work' ? 'Stay Focused' : 'Take a break'}
              </span>
            </div>
          </div>

          {/* Timer Controls Row */}
          <div className="flex items-center gap-6">
            <button 
              onClick={resetTimer}
              className="p-3 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full border border-gray-800 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button 
              onClick={toggleTimer}
              style={{ backgroundColor: getSvgStrokeColor() }}
              className="p-5 text-white rounded-full hover:scale-105 transition shadow-lg"
              title={isRunning ? 'Pause' : 'Start'}
            >
              {isRunning ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </button>

            <button 
              onClick={() => handleModeCompletion()}
              className="p-3 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full border border-gray-800 transition"
              title="Skip Session"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Right Column: Adjustable Timer Settings & Preferences */}
        <div className="space-y-6">
          
          {/* Settings Box */}
          <div className="glass p-6 rounded-2xl border border-gray-800 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Interval Settings (Min)
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Work Interval</span>
                <input 
                  type="number" 
                  min="1" 
                  max="120"
                  value={workMinutes}
                  onChange={(e) => setWorkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Short Break</span>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={shortMinutes}
                  onChange={(e) => setShortMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Long Break</span>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={longMinutes}
                  onChange={(e) => setLongMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sound Preferences Box */}
          <div className="glass p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Preferences</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300 font-medium">Synth Audio Bells</span>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2.5 rounded-lg border transition ${
                  soundEnabled 
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' 
                    : 'bg-gray-900 border-gray-800 text-gray-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Pomodoro;
