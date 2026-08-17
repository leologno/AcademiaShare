import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderOpen, MessageSquare, HelpCircle, Bell, Shield, ArrowRight, BookMarked, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import HoverEffect from '../components/ui/HoverEffect';

const Dashboard = () => {
  const { user, notifications } = useAuth();
  const [stats, setStats] = useState({
    approvedNotesCount: 0,
    bookmarksCount: user?.bookmarks?.length || 0,
    questionsCount: 0,
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch approved notes
        const notesRes = await api.get('/notes');
        const qRes = await api.get('/interaction');
        
        setStats({
          approvedNotesCount: notesRes.data.length,
          bookmarksCount: user?.bookmarks?.length || 0,
          questionsCount: qRes.data.length,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const cards = [
    {
      title: 'Notes Explorer',
      description: 'Search, download, rate, and bookmark lecture notes uploaded by others.',
      icon: <BookOpen className="w-8 h-8 text-indigo-400" />,
      link: '/notes',
      btnText: 'Explore Notes',
      color: 'from-indigo-600/10 to-indigo-500/5',
    },
    {
      title: 'Personal Storage',
      description: 'Organize study files into custom folders and keep track of documents.',
      icon: <FolderOpen className="w-8 h-8 text-emerald-400" />,
      link: '/storage',
      btnText: 'View Files',
      color: 'from-emerald-600/10 to-emerald-500/5',
    },
    {
      title: 'Real-Time Chats',
      description: 'Initiate messaging sessions with other classmates and study partners.',
      icon: <MessageSquare className="w-8 h-8 text-amber-400" />,
      link: '/chat',
      btnText: 'Open Chats',
      color: 'from-amber-600/10 to-amber-500/5',
    },
    {
      title: 'Student-Teacher Q&A',
      description: 'Ask questions directly to designated teachers and view answers.',
      icon: <HelpCircle className="w-8 h-8 text-purple-400" />,
      link: '/qa',
      btnText: 'Q&A System',
      color: 'from-purple-600/10 to-purple-500/5',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl glass p-8 border border-gray-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Authenticated as {user?.role}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-indigo-400">{user?.username}</span>!
          </h1>
          <p className="text-gray-400 max-w-xl">
            Collaborate on lecture notes, coordinate with peers, and get direct assistance from teachers in real-time.
          </p>
        </div>

        {user?.role === 'Admin' && (
          <Link
            to="/admin"
            className="relative flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-sm font-semibold text-white transition shadow-lg shadow-red-900/20"
          >
            <Shield className="w-4 h-4" />
            Open Admin Mod Panel
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">{stats.approvedNotesCount}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Approved Study Notes</span>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-pink-500/10 text-pink-400">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">{stats.bookmarksCount}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bookmarks Saved</span>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">{stats.questionsCount}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Q&A Queries</span>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Cards */}
        <div className="lg:col-span-2">
          <HoverEffect items={cards} />
        </div>

        {/* Notifications Sidebar */}
        <div className="glass rounded-2xl border border-gray-800 p-6 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-800/60 mb-4">
              <h3 className="text-md font-bold text-gray-200 flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-indigo-400" />
                Live Notification Log
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">
                {notifications.filter(n => !n.read).length} Unread
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  No notifications recorded yet.
                </div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed transition ${
                      !notif.read
                        ? 'bg-indigo-500/5 border-indigo-500/20 text-gray-200 font-medium'
                        : 'bg-gray-900/40 border-gray-850 text-gray-400'
                    }`}
                  >
                    <div>{notif.message}</div>
                    <div className="text-[10px] text-gray-650 mt-1.5">
                      {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/profile"
            className="mt-6 flex items-center justify-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Manage notifications & bookmarks in Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
