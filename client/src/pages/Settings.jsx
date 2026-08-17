import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Volume2, VolumeX, User, Settings as SettingsIcon, HelpCircle } from 'lucide-react';

const Settings = () => {
  const { theme, setTheme, toggleTheme, soundEnabled, setSoundEnabled } = useTheme();
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in text-gray-200">
      
      <div className="flex items-center gap-3 border-b border-gray-800 pb-6 mb-8">
        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Configure your workspace preferences and account options.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle Column: Preferences configuration */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Theme card selection */}
          <div className="glass p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-indigo-400" />
              Appearance Theme
            </h3>
            <p className="text-xs text-gray-400">Select the display aesthetic of your workspace environment.</p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition duration-200 ${
                  theme === 'dark'
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-650/10'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/40'
                }`}
              >
                <Moon className="w-6 h-6" />
                <span className="text-sm font-semibold">Dark Mode</span>
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition duration-200 ${
                  theme === 'light'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-500 shadow-md'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/40'
                }`}
              >
                <Sun className="w-6 h-6" />
                <span className="text-sm font-semibold">Light Mode</span>
              </button>
            </div>
          </div>

          {/* Sound Preferences Card */}
          <div className="glass p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-indigo-400" />
              Auditory Alerts
            </h3>
            <p className="text-xs text-gray-400">Enable synthesized bell notifications at session intervals.</p>
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-300 font-medium">Focus Chime Alerts</span>
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

        {/* Right Column: Profile Summary */}
        <div className="space-y-6">
          
          <div className="glass p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Account Details
            </h3>

            {user && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Username</p>
                  <p className="text-sm text-white font-semibold">{user.username}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-sm text-white font-semibold">{user.email}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Authorization Role</p>
                  <span className="inline-block px-2.5 py-0.5 mt-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold uppercase text-[9px] tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default Settings;
