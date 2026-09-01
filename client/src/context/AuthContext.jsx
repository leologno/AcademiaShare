import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Setup Socket connection when user exists
  useEffect(() => {
    let newSocket = null;
    if (user) {
      // Connect socket
      const socketUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
        : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
      newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
      });
      
      // Auto-rejoin user room on connection/reconnection
      newSocket.on('connect', () => {
        newSocket.emit('join', user._id);
        console.log('Socket connected, joined user room:', user._id);
      });
      
      setSocket(newSocket);

      // Listen for notifications
      newSocket.on('notification:receive', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      });

      // Load initial notifications
      fetchNotifications();
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [user]);

  // Load user profile on mount if token exists
  useEffect(() => {
    const checkUser = async () => {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          // Set basic user info first to quicken render
          setUser(parsed);
          
          // Verify with server and fetch latest user details
          const { data } = await api.get('/auth/profile');
          setUser({ ...parsed, ...data });
        } catch (err) {
          console.error('Failed to restore user session:', err);
          localStorage.removeItem('userInfo');
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('userInfo', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (username, email, password, role) => {
    const { data } = await api.post('/auth/register', { username, email, password, role });
    localStorage.setItem('userInfo', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  const markNotificationAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === id ? { ...notif, read: true } : notif))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        socket,
        notifications,
        setNotifications,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
