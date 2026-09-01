import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Search, ArrowLeft, Paperclip, FileText, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Chat = () => {
  const { user, socket, fetchNotifications } = useAuth();
  const [partners, setPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Attachment states
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch initial partners and all platform users
  const fetchData = async () => {
    try {
      const partnersRes = await api.get('/chat/partners');
      setPartners(partnersRes.data);

      const usersRes = await api.get('/auth/users');
      // Exclude self from potential chat partners
      const filtered = usersRes.data.filter((u) => u._id !== user._id);
      setAllUsers(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Fetch message history when selectedPartner changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedPartner) return;
      try {
        const { data } = await api.get(`/chat/${selectedPartner._id}`);
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, [selectedPartner]);

  // Clear chat notifications when selected partner or message list changes
  useEffect(() => {
    const clearChatNotifications = async () => {
      if (!selectedPartner) return;
      try {
        await api.put(`/notifications/mark-chat-read/${selectedPartner._id}`);
        fetchNotifications();
      } catch (err) {
        console.error('Error clearing chat notifications:', err);
      }
    };
    clearChatNotifications();
  }, [selectedPartner, messages, fetchNotifications]);

  // Listen for incoming messages, deletions, and reactions via Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:receive', (message) => {
      // Append if message relates to current conversation
      if (
        selectedPartner &&
        (message.sender._id === selectedPartner._id ||
          message.recipient._id === selectedPartner._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }

      // Refresh partner list to sort recent chats
      fetchData();
    });

    socket.on('chat:deleted', (data) => {
      setMessages((prev) => 
        prev.map(m => m._id === data.messageId ? { 
          ...m, 
          isDeleted: true, 
          message: 'This message was deleted.', 
          attachmentUrl: '', 
          attachmentName: '', 
          attachmentType: '' 
        } : m)
      );
    });

    socket.on('chat:reacted', (data) => {
      setMessages((prev) =>
        prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
    });

    return () => {
      socket.off('chat:receive');
      socket.off('chat:deleted');
      socket.off('chat:reacted');
    };
  }, [socket, selectedPartner]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle clicking outside user dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() && !selectedFile) return;
    if (!selectedPartner || !socket) return;

    setSending(true);

    try {
      let attachmentUrl = '';
      let attachmentType = '';
      let attachmentName = '';
      let cloudinaryId = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('chatFile', selectedFile);

        const { data } = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        attachmentUrl = data.fileUrl;
        attachmentType = data.fileType;
        attachmentName = data.fileName;
        cloudinaryId = data.cloudinaryId || null;
      }

      // Emit chat message event to Socket.IO server
      socket.emit('chat:send', {
        sender: user._id,
        recipient: selectedPartner._id,
        message: typedMessage,
        attachmentUrl,
        attachmentType,
        attachmentName,
        cloudinaryId,
      });

      setTypedMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to send chat attachment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    if (!socket || !selectedPartner) return;

    try {
      await api.delete(`/chat/messages/${messageId}`);

      // Update local state
      setMessages((prev) =>
        prev.map(m => m._id === messageId ? { 
          ...m, 
          isDeleted: true, 
          message: 'This message was deleted.', 
          attachmentUrl: '', 
          attachmentName: '', 
          attachmentType: '' 
        } : m)
      );

      // Emit to Socket
      socket.emit('chat:delete', {
        messageId,
        recipientId: selectedPartner._id,
        senderId: user._id
      });
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    if (!socket || !selectedPartner) return;

    try {
      const { data } = await api.post(`/chat/messages/${messageId}/react`, { emoji });

      // Update local state
      setMessages((prev) =>
        prev.map(m => m._id === messageId ? { ...m, reactions: data.reactions } : m)
      );

      // Emit to Socket
      socket.emit('chat:react', {
        messageId,
        recipientId: selectedPartner._id,
        senderId: user._id,
        reactions: data.reactions
      });
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  };

  const handleStartChat = (partner) => {
    setSelectedPartner(partner);
    // Add to partner list if not already present
    if (!partners.some((p) => p._id === partner._id)) {
      setPartners((prev) => [partner, ...prev]);
    }
    setShowUserDropdown(false);
    setUserSearchTerm('');
  };

  // Strip @ prefix to support searching both @username or only username
  const cleanedSearchTerm = userSearchTerm.startsWith('@') ? userSearchTerm.slice(1) : userSearchTerm;
  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(cleanedSearchTerm.toLowerCase())
  );

  const renderMessages = () => {
    let lastDateStr = '';

    return messages.map((msg, index) => {
      const isSelf = msg.sender === user._id || msg.sender?._id === user._id;
      const msgDate = new Date(msg.createdAt);
      const dateStr = msgDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      let showDateDivider = false;
      if (dateStr !== lastDateStr) {
        showDateDivider = true;
        lastDateStr = dateStr;
      }

      const isImage = msg.attachmentType && msg.attachmentType.startsWith('image/');

      return (
        <div key={msg._id || index} className="space-y-3">
          {showDateDivider && (
            <div className="flex justify-center my-6">
              <span className="bg-gray-900 border border-gray-850 text-gray-450 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                {dateStr}
              </span>
            </div>
          )}
          
          <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} group items-center gap-3`}>
            {/* Toolbar options visible on hover (Only if not deleted) */}
            {!msg.isDeleted && (
              <div className={`opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition duration-150 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full shadow-lg shrink-0 ${isSelf ? 'order-1' : 'order-2'}`}>
                {/* Emoji Picker */}
                {['👍', '❤️', '😂', '🎉', '😮'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReactToMessage(msg._id, emoji)}
                    className="hover:scale-125 transition text-xs"
                  >
                    {emoji}
                  </button>
                ))}
                {/* Trash option for own messages */}
                {isSelf && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="text-gray-500 hover:text-red-400 p-0.5 rounded transition ml-1"
                    title="Delete Message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div
              className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed space-y-1.5 ${isSelf ? 'order-2' : 'order-1'} ${
                isSelf
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-gray-900 border border-gray-850 text-gray-300 rounded-tl-none'
              }`}
            >
              {msg.attachmentUrl && (
                <div className="rounded-lg overflow-hidden mt-1">
                  {isImage ? (
                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={msg.attachmentUrl}
                        alt="Chat Attachment"
                        className="max-w-xs max-h-48 object-cover rounded-lg border border-white/10 hover:opacity-90 transition"
                      />
                    </a>
                  ) : (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition ${
                        isSelf 
                          ? 'bg-indigo-700/50 border-indigo-500/20 hover:bg-indigo-700/80 text-white' 
                          : 'bg-gray-950 border-gray-800 hover:bg-gray-900/50 text-indigo-400'
                      }`}
                    >
                      <FileText className="w-6 h-6 shrink-0 text-emerald-450" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-semibold truncate ${isSelf ? 'text-white' : 'text-gray-205'}`}>
                          {msg.attachmentName || 'Document'}
                        </p>
                        <p className={`text-[9px] uppercase mt-0.5 ${isSelf ? 'text-indigo-200' : 'text-gray-500'}`}>
                          View / Download
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {msg.message && <p className={msg.isDeleted ? 'italic text-gray-500' : ''}>{msg.message}</p>}

              {/* Render Reactions badges */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(
                    msg.reactions.reduce((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactToMessage(msg._id, emoji)}
                      className={`flex items-center gap-1 border rounded px-1.5 py-0.5 text-[10px] transition ${
                        isSelf 
                          ? 'bg-indigo-700/60 border-indigo-500/25 text-indigo-200 hover:bg-indigo-700' 
                          : 'bg-gray-950/80 border-gray-800 text-gray-300 hover:bg-gray-900'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-semibold text-[8px] opacity-80">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              <span className={`text-[9px] mt-1 block text-right ${isSelf ? 'text-indigo-200' : 'text-gray-500'}`}>
                {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[80vh] animate-fade-in">
      <div className="glass rounded-2xl border border-gray-800 shadow-2xl h-full flex overflow-hidden">
        {/* Left Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-900 flex flex-col justify-between bg-gray-900/10 shrink-0 ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-900 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Conversations
            </h2>

            {/* Start Chat Selector */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="New chat by name or @username..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-600" />
              </div>

              {showUserDropdown && userSearchTerm && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl glass border border-gray-800 shadow-2xl py-2 z-50 max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-500 text-center">No users found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleStartChat(u)}
                        className="px-4 py-2 hover:bg-gray-850 cursor-pointer flex justify-between items-center transition"
                      >
                        <span className="text-xs font-semibold text-gray-200">@{u.username}</span>
                        <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">
                          {u.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Partners List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {partners.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">
                No active conversations.<br />Search above to start chatting.
              </div>
            ) : (
              partners.map((partner) => {
                const isSelected = selectedPartner?._id === partner._id;
                return (
                  <div
                    key={partner._id}
                    onClick={() => setSelectedPartner(partner)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-600/15 border border-indigo-500/25'
                        : 'border border-transparent hover:bg-gray-850/60'
                    }`}
                  >
                    {partner.profilePicture ? (
                      <img
                        src={partner.profilePicture}
                        alt="Partner Avatar"
                        className="w-9 h-9 rounded-full object-cover border border-indigo-500/10"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/10">
                        {partner.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-white font-bold' : 'text-gray-300'}`}>
                          {partner.username}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
                          {partner.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">Click to message</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Pane */}
        <div className={`flex-1 flex flex-col justify-between bg-gray-955/10 ${!selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-900 flex items-center justify-between glass">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {selectedPartner.profilePicture ? (
                    <img
                      src={selectedPartner.profilePicture}
                      alt="Partner Avatar"
                      className="w-10 h-10 rounded-full object-cover shadow-md shadow-indigo-500/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/10">
                      {selectedPartner.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{selectedPartner.username}</h3>
                    <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider mt-0.5">{selectedPartner.role}</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-xs text-gray-500">
                    <span>Send a message or attach a file to begin your conversation.</span>
                  </div>
                ) : (
                  renderMessages()
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Box */}
              {selectedFile && (
                <div className="px-6 py-3 border-t border-gray-900 flex items-center gap-3 bg-gray-900/40 animate-fade-in">
                  <div className="relative shrink-0">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-gray-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-950 border border-gray-850 flex items-center justify-center text-indigo-400">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-gray-200 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-900 flex gap-3 glass items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx,.xls,.txt,.pptx,.ppt"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition shrink-0 disabled:opacity-50"
                  title="Attach file"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>
                
                <input
                  type="text"
                  placeholder={sending ? "Uploading attachment..." : "Type a message..."}
                  disabled={sending}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-850 rounded-xl px-4 py-2.5 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
                />
                
                <button
                  type="submit"
                  disabled={sending || (!typedMessage.trim() && !selectedFile)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition shrink-0 disabled:opacity-50"
                >
                  {sending ? (
                    <span className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-white inline-block"></span>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-gray-850 mb-3" />
              <h3 className="text-md font-bold text-gray-400">No conversation selected</h3>
              <p className="text-xs text-gray-650 mt-1 max-w-xs">
                Select an active contact on the sidebar, or search for a classmate or teacher to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
