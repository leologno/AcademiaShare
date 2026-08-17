import React, { useEffect, useState, useRef } from 'react';
import { User, Mail, ShieldAlert, Calendar, BookMarked, FileText, BookmarkX, Edit2, Check, X, Camera, School, Award, AlertCircle, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [profession, setProfession] = useState('');
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  // Avatar states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setProfile(data);
      
      // Initialize form fields
      setUsername(data.username || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setDepartment(data.department || 'Computer Science');
      setProfession(data.profession || 'Student');
      setYear(data.year || '');
      setTitle(data.title || 'Student');
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRemoveBookmark = async (noteId) => {
    try {
      await api.post(`/notes/${noteId}/bookmark`);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    setUpdateError('');
    setUpdateSuccess('');

    const formData = new FormData();
    formData.append('avatarFile', file);

    try {
      const { data } = await api.post('/auth/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local profile state
      setProfile((prev) => ({ ...prev, profilePicture: data.profilePicture }));
      
      // Update global context state
      const updatedUser = { ...user, profilePicture: data.profilePicture };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setUpdateSuccess('Profile picture updated successfully!');
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    setUpdating(true);

    try {
      const updateData = {
        username,
        email,
        bio,
        department,
        profession,
        year: profile.role === 'Student' ? year : '',
        title, // designation
      };

      if (password.trim()) {
        updateData.password = password;
      }

      const { data } = await api.put('/auth/profile', updateData);

      setProfile((prev) => ({ ...prev, ...data }));
      
      // Update global context state
      const updatedUser = { ...user, ...data };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setPassword('');
      setIsEditing(false);
      setUpdateSuccess('Profile updated successfully!');
      fetchProfile();
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  // Get full avatar URL or default fallback
  const getAvatarUrl = (pic) => {
    if (!pic) return null;
    return pic.startsWith('http') ? pic : pic;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Profile</h1>
          <p className="text-gray-400 text-sm">Manage your details, picture, and bookmarked files</p>
        </div>

        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setUpdateError('');
            setUpdateSuccess('');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
            isEditing
              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15'
              : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/15'
          }`}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4" />
              Cancel Editing
            </>
          ) : (
            <>
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </>
          )}
        </button>
      </div>

      {/* Message Feedback */}
      {updateError && (
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs max-w-xl">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {updateSuccess && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs max-w-xl">
          <Check className="w-4.5 h-4.5 shrink-0" />
          <span>{updateSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Card / Photo */}
        <div className="glass rounded-2xl p-6 border border-gray-800 space-y-6 h-fit relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>

          {/* Profile Picture Upload Section */}
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              className="hidden"
              accept="image/*"
            />
            
            {uploadingAvatar ? (
              <div className="w-24 h-24 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-400"></span>
              </div>
            ) : getAvatarUrl(profile?.profilePicture) ? (
              <img
                src={getAvatarUrl(profile?.profilePicture)}
                alt="Profile Avatar"
                className="w-24 h-24 rounded-full object-cover border border-gray-850 ring-2 ring-indigo-550/20 group-hover:opacity-85 transition"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-indigo-650/20 group-hover:scale-95 transition">
                {profile?.username?.substring(0, 2).toUpperCase()}
              </div>
            )}

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-150">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">{profile?.username}</h2>
            <span className="inline-block px-3 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
              {profile?.role}
            </span>
            {profile?.title && <p className="text-xs text-purple-400 font-semibold">{profile?.title}</p>}
            {profile?.year && <p className="text-xs text-indigo-400 font-semibold">{profile?.year}</p>}
          </div>

          {profile?.bio && (
            <p className="text-center text-xs text-gray-400 italic bg-gray-900/30 p-3 rounded-xl border border-gray-900/50 w-full">
              "{profile.bio}"
            </p>
          )}

          {/* Details list */}
          <div className="border-t border-gray-900 pt-5 space-y-4 text-xs text-gray-400 w-full">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-550 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</p>
                <p className="text-gray-300 font-semibold">{profile?.email}</p>
              </div>
            </div>

            {profile?.department && (
              <div className="flex items-center gap-3">
                <School className="w-4 h-4 text-gray-550 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Department / School</p>
                  <p className="text-gray-300 font-semibold">{profile.department}</p>
                </div>
              </div>
            )}

            {profile?.profession && (
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-gray-550 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Profession</p>
                  <p className="text-gray-300 font-semibold">{profile.profession}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-gray-550 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Security Access Level</p>
                <p className="text-gray-300 font-semibold">{profile?.role} Authorization</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-550 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Account Created</p>
                <p className="text-gray-300 font-semibold">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Timer className="w-4 h-4 text-gray-550 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Focus Sessions Completed</p>
                <p className="text-gray-300 font-semibold">
                  {profile?.focusSessions || 0} sessions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Block: Edit Form OR Bookmarks Grid */}
        <div className="lg:col-span-2 space-y-4">
          {isEditing ? (
            /* Editing Profile Panel */
            <div className="glass rounded-2xl p-6 border border-gray-800 space-y-5">
              <h3 className="text-sm font-bold text-gray-200 border-b border-gray-900 pb-3">Edit Profile Details</h3>
              
              <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="Business Administration">Business Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Profession</label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      <option value="Student">Student</option>
                      <option value="Academic">Academic</option>
                      <option value="Staff">Staff</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Designation (Title)</label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      <option value="Student">Student</option>
                      <option value="Junior Lecturer">Junior Lecturer</option>
                      <option value="Senior Lecturer">Senior Lecturer</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Admin Coordinator">Admin Coordinator</option>
                      <option value="IT Staff">IT Staff</option>
                    </select>
                  </div>

                  {profile?.role === 'Student' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Academic Year</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                      >
                        <option value="">Select year...</option>
                        <option value="Freshman">Freshman</option>
                        <option value="Sophomore">Sophomore</option>
                        <option value="Junior">Junior</option>
                        <option value="Senior">Senior</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Bio (Short Description)</label>
                  <textarea
                    placeholder="Tell us about yourself..."
                    rows="3"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
                  ></textarea>
                </div>

                <div className="border-t border-gray-900 pt-4">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">
                    New Password (Leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full max-w-sm bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-205 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-gray-900">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-450 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex items-center gap-1 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                  >
                    {updating ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Bookmarks Catalog Grid */
            <>
              <h3 className="text-xs uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
                <BookMarked className="w-4.5 h-4.5 text-indigo-400" />
                Bookmarked Notes ({profile?.bookmarks?.length || 0})
              </h3>

              {profile?.bookmarks?.length === 0 ? (
                <div className="glass rounded-2xl p-16 text-center text-gray-500 border border-gray-900">
                  <BookMarked className="w-12 h-12 text-gray-800 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-400">No saved bookmarks</h3>
                  <p className="text-xs text-gray-600 mt-1">Explore study notes and save notes to bookmarks to view them here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.bookmarks.map((note) => (
                    <div
                      key={note._id}
                      className="glass rounded-xl p-4 border border-gray-850 hover:border-gray-750 flex items-center justify-between transition group"
                    >
                      <a
                        href={note.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <FileText className="w-6.5 h-6.5 text-emerald-450 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-200 group-hover:text-white truncate">{note.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{note.category}</p>
                        </div>
                      </a>

                      <button
                        onClick={() => handleRemoveBookmark(note._id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800/80 transition"
                        title="Remove from bookmarks"
                      >
                        <BookmarkX className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
