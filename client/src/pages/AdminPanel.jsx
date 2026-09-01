import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileCheck, Users, CheckCircle, Trash2, 
  XCircle, FileText, Mail, Calendar, AlertCircle, UserCheck, BookOpen 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notes'); // 'notes', 'users', 'pendingUsers', or 'classrooms'
  const [pendingNotes, setPendingNotes] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [classroomsList, setClassroomsList] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPendingNotes = async () => {
    try {
      const { data } = await api.get('/admin/pending-notes');
      setPendingNotes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const { data } = await api.get('/admin/pending-users');
      setPendingUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassroomsList = async () => {
    try {
      const { data } = await api.get('/admin/classrooms');
      setClassroomsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'notes') {
      fetchPendingNotes();
    } else if (activeTab === 'users') {
      fetchUsersList();
    } else if (activeTab === 'pendingUsers') {
      fetchPendingUsers();
    } else if (activeTab === 'classrooms') {
      fetchClassroomsList();
    }
  }, [activeTab]);

  const handleApproveNote = async (id) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/notes/${id}/approve`);
      setSuccess('Study note approved successfully!');
      fetchPendingNotes();
    } catch (err) {
      setError('Failed to approve study note.');
    }
  };

  const handleRejectNote = async (id) => {
    if (!window.confirm('Are you sure you want to reject and delete this study note?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/notes/${id}/reject`);
      setSuccess('Study note rejected and deleted.');
      fetchPendingNotes();
    } catch (err) {
      setError('Failed to reject study note.');
    }
  };

  const handleApproveUser = async (id, username) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/users/${id}/approve`);
      setSuccess(`User account "${username}" approved successfully!`);
      fetchPendingUsers();
    } catch (err) {
      setError('Failed to approve user account.');
    }
  };

  const handleRejectUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to reject/delete registration request for "${username}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/users/${id}`);
      setSuccess(`Registration request for "${username}" rejected.`);
      fetchPendingUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject user request.');
    }
  };

  const handleUpdateUserRole = async (userId, newRole, username) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setSuccess(`Role for "${username}" updated to ${newRole} successfully.`);
      fetchUsersList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleBanUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to ban/delete user "${username}"? All their files will be deleted.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/users/${id}`);
      setSuccess(`User "${username}" banned successfully.`);
      fetchUsersList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to ban user.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-gray-200">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-8 h-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">Admin Panel</h1>
          <p className="text-gray-400 text-sm">System moderation and user management panel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-900 pb-2">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'notes'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-gray-450 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Pending Notes ({pendingNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('pendingUsers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'pendingUsers'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-gray-450 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pending Approvals ({pendingUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-gray-450 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('classrooms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'classrooms'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-gray-450 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Classrooms ({classroomsList.length})
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs max-w-xl">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs max-w-xl">
          <CheckCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Tab Panels */}
      <div>
        {activeTab === 'notes' && (
          pendingNotes.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center text-gray-500 border border-gray-900">
              <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-400">All caught up!</h3>
              <p className="text-xs text-gray-600 mt-1">There are no study notes pending moderation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingNotes.map((note) => (
                <div
                  key={note._id}
                  className="glass rounded-2xl p-5 border border-gray-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
                        {note.category}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Uploaded by <span className="font-semibold text-gray-400">{note.uploader?.username}</span> ({note.uploader?.role})
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate">{note.title}</h3>
                    <p className="text-xs text-gray-400 leading-normal max-w-2xl">{note.description || 'No description provided.'}</p>
                    
                    <a
                      href={note.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Uploaded Attachment
                    </a>
                  </div>

                  <div className="flex gap-2 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => handleRejectNote(note._id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/5 text-xs font-semibold transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveNote(note._id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'pendingUsers' && (
          pendingUsers.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center text-gray-500 border border-gray-900">
              <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-400">No pending approvals</h3>
              <p className="text-xs text-gray-600 mt-1">There are no user registration requests awaiting approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingUsers.map((usr) => (
                <div
                  key={usr._id}
                  className="glass rounded-xl p-5 border border-gray-850 flex flex-col justify-between hover:border-gray-800 transition shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center font-bold text-xs text-yellow-500 uppercase">
                        {usr.username.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{usr.username}</h4>
                        <span className="inline-block text-[9px] uppercase tracking-wider font-bold mt-0.5 text-yellow-500">
                          Pending {usr.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px] text-gray-500 border-t border-gray-900 pt-3">
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-650" />
                        <span className="truncate">{usr.email}</span>
                      </p>
                      {usr.department && (
                        <p className="text-gray-450 font-medium">
                          Dept: <span className="text-gray-300">{usr.department}</span>
                        </p>
                      )}
                      {usr.title && (
                        <p className="text-gray-450 font-medium">
                          Desig: <span className="text-gray-300">{usr.title}</span>
                        </p>
                      )}
                      {usr.profession && (
                        <p className="text-gray-450 font-medium">
                          Prof: <span className="text-gray-300">{usr.profession}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2 pt-1 border-t border-gray-900/30">
                        <Calendar className="w-3.5 h-3.5 text-gray-650" />
                        <span>Registered {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {(currentUser?.role === 'Admin' || currentUser?.role === 'SubAdmin') && (
                    <div className="flex gap-2 border-t border-gray-900 mt-4 pt-3">
                      <button
                        onClick={() => handleRejectUser(usr._id, usr.username)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 text-[11px] font-semibold transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveUser(usr._id, usr.username)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usersList.map((usr) => (
              <div
                key={usr._id}
                className="glass rounded-xl p-5 border border-gray-850 flex flex-col justify-between hover:border-gray-800 transition shadow-sm relative overflow-hidden"
              >
                {/* Glow role border */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  usr.role === 'Admin' ? 'bg-red-500' : usr.role === 'SubAdmin' ? 'bg-amber-500' : usr.role === 'Teacher' ? 'bg-purple-500' : 'bg-indigo-500'
                }`}></div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase">
                        {usr.username.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{usr.username}</h4>
                        <span className={`inline-block text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                          usr.role === 'Admin' ? 'text-red-400' : usr.role === 'SubAdmin' ? 'text-amber-400' : usr.role === 'Teacher' ? 'text-purple-400' : 'text-indigo-400'
                        }`}>
                          {usr.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] text-gray-500 border-t border-gray-900 pt-3">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-650" />
                      <span className="truncate">{usr.email}</span>
                    </p>
                    {usr.department && (
                      <p className="text-gray-450 font-medium">
                        Dept: <span className="text-gray-300">{usr.department}</span>
                      </p>
                    )}
                    {usr.title && (
                      <p className="text-gray-450 font-medium">
                        Desig: <span className="text-gray-300">{usr.title}</span>
                      </p>
                    )}
                    {usr.profession && (
                      <p className="text-gray-450 font-medium">
                        Prof: <span className="text-gray-300">{usr.profession}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 pt-1 border-t border-gray-900/30">
                      <Calendar className="w-3.5 h-3.5 text-gray-650" />
                      <span>Joined {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </p>
                  </div>
                </div>

                {currentUser?.role === 'Admin' && usr._id !== currentUser._id && (
                  <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-550 font-bold uppercase shrink-0">Role Promotion:</span>
                      <select
                        value={usr.role}
                        onChange={(e) => handleUpdateUserRole(usr._id, e.target.value, usr.username)}
                        className="bg-gray-900 border border-gray-850 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none flex-1"
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                        <option value="SubAdmin">SubAdmin</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    {usr.role !== 'Admin' && (
                      <button
                        onClick={() => handleBanUser(usr._id, usr.username)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-1 rounded-lg border border-red-500/10 text-red-500/80 hover:bg-red-500/5 text-[10px] font-semibold transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        Ban & Delete User Account
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'classrooms' && (
          <div className="space-y-8 animate-fade-in">
            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-xl p-5 border border-gray-850">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Classrooms</p>
                <p className="text-2xl font-extrabold text-white mt-1">{classroomsList.length}</p>
              </div>
              <div className="glass rounded-xl p-5 border border-gray-850">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Instructors</p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {new Set(classroomsList.map(c => c.teacher?._id)).size}
                </p>
              </div>
              <div className="glass rounded-xl p-5 border border-gray-850">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Student Enrollments</p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {classroomsList.reduce((acc, c) => acc + (c.students?.length || 0), 0)}
                </p>
              </div>
            </div>

            {/* Split layout: Left column = teacher list with class counts, Right column = classrooms list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Teacher workload */}
              <div className="glass rounded-xl p-6 border border-gray-850 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-900 pb-3">
                  Instructor Workloads
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(
                    classroomsList.reduce((acc, c) => {
                      if (c.teacher) {
                        acc[c.teacher.username] = (acc[c.teacher.username] || 0) + 1;
                      }
                      return acc;
                    }, {})
                  ).map(([teacherName, classCount]) => (
                    <div key={teacherName} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-900/30 border border-gray-850 text-xs">
                      <span className="font-semibold text-gray-300">@{teacherName}</span>
                      <span className="bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
                        {classCount} {classCount === 1 ? 'Class' : 'Classes'}
                      </span>
                    </div>
                  ))}
                  {classroomsList.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No classrooms set up.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Classrooms grid */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Classroom Roster Registry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classroomsList.map(room => (
                    <div key={room._id} className="glass rounded-xl p-5 border border-gray-855 hover:border-gray-800 transition flex flex-col justify-between h-44 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-white truncate max-w-[70%]">{room.name}</h4>
                          <span className="text-[9px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded shrink-0">
                            Code: {room.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">Instructor: <span className="font-semibold text-gray-400">{room.teacher?.username}</span></p>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-900 pt-3 mt-3">
                        <div className="flex gap-3 text-[10px] text-gray-400">
                          <span>👥 {room.students?.length || 0} Students</span>
                          <span>📚 {room.sharedNotes?.length || 0} Materials</span>
                          <span>📢 {room.announcements?.length || 0} Notices</span>
                        </div>
                        <button
                          onClick={() => navigate('/classrooms')}
                          className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-indigo-400 hover:text-white rounded text-[10px] font-semibold transition"
                        >
                          Visit Workspace
                        </button>
                      </div>
                    </div>
                  ))}
                  {classroomsList.length === 0 && (
                    <div className="md:col-span-2 text-center py-16 text-xs text-gray-500 italic">No classrooms registered.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
