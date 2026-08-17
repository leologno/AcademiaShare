import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FolderHeart, MessageSquare, HelpCircle, ShieldCheck, User, LogOut, Menu, X, LayoutDashboard, Users, Timer, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${
      isActive(path)
        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
        : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
    }`;

  return (
    <nav className="glass sticky top-0 z-40 border-b border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
              <img src={logo} alt="AcademiaShare Logo" className="h-16 w-auto object-contain" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/notes" className={navLinkClass('/notes')}>
                <BookOpen className="w-4 h-4" />
                Study Notes
              </Link>
              {user.role !== 'Admin' && user.role !== 'SubAdmin' && (
                <Link to="/storage" className={navLinkClass('/storage')}>
                  <FolderHeart className="w-4 h-4" />
                  Storage
                </Link>
              )}
              <Link to="/chat" className={navLinkClass('/chat')}>
                <MessageSquare className="w-4 h-4" />
                Chats
              </Link>
              <Link to="/qa" className={navLinkClass('/qa')}>
                <HelpCircle className="w-4 h-4" />
                Q&A
              </Link>
              <Link to="/classrooms" className={navLinkClass('/classrooms')}>
                <Users className="w-4 h-4" />
                Classrooms
              </Link>
              {user.role !== 'Admin' && user.role !== 'SubAdmin' && user.role !== 'Teacher' && (
                <Link to="/pomodoro" className={navLinkClass('/pomodoro')}>
                  <Timer className="w-4 h-4" />
                  Focus Space
                </Link>
              )}
              {(user.role === 'Admin' || user.role === 'SubAdmin') && (
                <Link to="/admin" className={navLinkClass('/admin')}>
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Actions (Bell, Profile/Logout) */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Link
                  to="/settings"
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition duration-150"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <div className="h-6 w-px bg-gray-800"></div>
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition animate-fade-in">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile Avatar"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/20">
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-200">{user.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-800 transition duration-150"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div className="md:hidden glass px-2 pt-2 pb-4 space-y-1 border-t border-gray-800/80">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            Dashboard
          </Link>
          <Link
            to="/notes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Study Notes
          </Link>
          {user.role !== 'Admin' && user.role !== 'SubAdmin' && (
            <Link
              to="/storage"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
            >
              <FolderHeart className="w-5 h-5 text-indigo-400" />
              Storage
            </Link>
          )}
          <Link
            to="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Chats
          </Link>
          <Link
            to="/qa"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Q&A
          </Link>
          <Link
            to="/classrooms"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
          >
            <Users className="w-5 h-5 text-indigo-400" />
            Classrooms
          </Link>
          {user.role !== 'Admin' && user.role !== 'SubAdmin' && user.role !== 'Teacher' && (
            <Link
              to="/pomodoro"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
            >
              <Timer className="w-5 h-5 text-indigo-400" />
              Focus Space
            </Link>
          )}
          {(user.role === 'Admin' || user.role === 'SubAdmin') && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-250 hover:bg-gray-800"
            >
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Admin Panel
            </Link>
          )}
          <div className="border-t border-gray-800 my-2 pt-2">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
            >
              <User className="w-5 h-5 text-indigo-400" />
              My Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-200 hover:bg-gray-800"
            >
              <Settings className="w-5 h-5 text-indigo-400" />
              Settings
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-red-400 hover:bg-gray-800"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
