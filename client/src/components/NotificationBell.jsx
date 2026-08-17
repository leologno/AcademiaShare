import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, MessageSquare, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'note_uploaded':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'note_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'teacher_question':
      case 'teacher_answer':
        return <HelpCircle className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition duration-150 focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-gray-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-xl glass border border-gray-800 shadow-2xl py-2 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="font-semibold text-sm text-gray-200">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-500">
                You're all caught up!
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => markNotificationAsRead(notif._id)}
                  className={`px-4 py-3 hover:bg-gray-800/50 cursor-pointer flex gap-3 items-start border-b border-gray-900/40 transition ${
                    !notif.read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs text-gray-300 leading-snug ${!notif.read ? 'font-semibold text-white' : ''}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
