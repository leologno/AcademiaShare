import React, { useState, useEffect } from 'react';
import { Search, Upload, BookMarked, MessageSquare, Star, Trash2, Calendar, FileText, Download, X, Bookmark, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Rating from '../components/Rating';

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState(['All', 'Mathematics', 'Science', 'Engineering', 'History', 'Literature', 'General']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Note details modal state
  const [selectedNote, setSelectedNote] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [commentError, setCommentError] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  // User bookmark state list
  const [userBookmarks, setUserBookmarks] = useState(user?.bookmarks || []);

  const fetchNotes = async () => {
    try {
      let url = '/notes';
      const params = {};
      if (activeCategory !== 'All') {
        params.category = activeCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const { data } = await api.get(url, { params });
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [activeCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotes();
  };

  // Open note details
  const openNoteDetails = async (note) => {
    try {
      const { data } = await api.get(`/notes/${note._id}`);
      setSelectedNote(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle bookmarking
  const handleBookmarkToggle = async (noteId) => {
    try {
      const { data } = await api.post(`/notes/${noteId}/bookmark`);
      setUserBookmarks(data.bookmarks);
      
      // Update local state if selectedNote details is open
      if (selectedNote && selectedNote._id === noteId) {
        setSelectedNote(prev => ({
          ...prev,
          bookmarksCount: data.bookmarksCount
        }));
      }

      // Refresh list
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  // Rate a note
  const handleRateNote = async (ratingValue) => {
    setRatingError('');
    try {
      const { data } = await api.post(`/notes/${selectedNote._id}/rate`, { rating: ratingValue });
      // Reload note details to show update
      openNoteDetails(selectedNote);
      fetchNotes();
    } catch (err) {
      setRatingError(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  // Comment on a note
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError('');
    if (!newComment.trim()) return;

    try {
      const { data } = await api.post(`/notes/${selectedNote._id}/comment`, { text: newComment });
      setSelectedNote(data);
      setNewComment('');
      fetchNotes();
    } catch (err) {
      setCommentError(err.response?.data?.message || 'Failed to post comment');
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;
    try {
      await api.delete(`/notes/${noteId}`);
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      alert('Error deleting note');
    }
  };

  // Upload file handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploading(true);

    if (!uploadTitle || !uploadFile) {
      setUploadError('Title and file are required!');
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('category', uploadCategory);
    formData.append('noteFile', uploadFile);

    try {
      await api.post('/notes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear states
      setUploadTitle('');
      setUploadDesc('');
      setUploadCategory('General');
      setUploadFile(null);
      setShowUploadModal(false);
      
      alert(user.role === 'Student' ? 'Note uploaded successfully! It is pending admin approval.' : 'Note uploaded and approved successfully!');
      fetchNotes();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload note');
    } finally {
      setUploading(false);
    }
  };

  const getAvgRating = (ratings = []) => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const isBookmarked = (noteId) => {
    if (!noteId || !userBookmarks) return false;
    const targetId = (noteId._id || noteId).toString();
    return userBookmarks.some((b) => (b._id || b).toString() === targetId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Study Notes</h1>
          <p className="text-gray-400 text-sm">Access peer-uploaded, teacher-reviewed study notes</p>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-650" />
          </form>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload Note
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-900 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-indigo-600/25 text-indigo-400 border border-indigo-500/30'
                : 'bg-gray-900 text-gray-450 hover:text-white border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid List */}
      {notes.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center text-gray-500">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400">No study notes found</h3>
          <p className="text-sm text-gray-600 mt-1">Be the first to upload a note in this category!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div
              key={note._id}
              onClick={() => openNoteDetails(note)}
              className="glass rounded-2xl p-5 border border-gray-800 hover:border-gray-700 cursor-pointer flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                    {note.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold bg-amber-500/5 px-2 py-0.5 rounded">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {getAvgRating(note.ratings)}
                  </div>
                </div>

                <h3 className="text-md font-bold text-gray-200 group-hover:text-white mb-2 transition-colors">
                  {note.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
                  {note.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-900 pt-3 text-[11px] text-gray-500">
                <span>By {note.uploader?.username || 'System'}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {note.comments?.length || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Bookmark className="w-3.5 h-3.5" />
                    {note.bookmarksCount || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Details Drawer/Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg glass h-full border-l border-gray-850 p-6 flex flex-col justify-between shadow-2xl relative">
            <button
              onClick={() => setSelectedNote(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto space-y-6 flex-1 pr-1 pb-4">
              {/* Top Meta info */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                  {selectedNote.category}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{selectedNote.title}</h2>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                  <span>Uploaded by {selectedNote.uploader?.username}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Description</h4>
                <p className="text-sm text-gray-300 leading-relaxed bg-gray-900/40 p-3.5 rounded-xl border border-gray-900/60">
                  {selectedNote.description || 'No description provided.'}
                </p>
              </div>

              {/* File details & Download */}
              <div className="flex items-center justify-between bg-indigo-600/5 border border-indigo-500/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-400" />
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Attachment File</p>
                    <p className="text-[10px] text-gray-500">
                      {(selectedNote.fileSize / (1024 * 1024)).toFixed(2)} MB • {selectedNote.fileType?.split('/')[1]?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <a
                  href={selectedNote.fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  View File
                </a>
              </div>

              {/* Rating Section */}
              <div className="border-t border-gray-900 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Rating Details</h4>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{getAvgRating(selectedNote.ratings)} / 5</span>
                    <span className="text-xs text-gray-500 font-medium">({selectedNote.ratings?.length || 0} reviews)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-900/30 p-3 rounded-xl border border-gray-900/40">
                  <span className="text-xs text-gray-400">Add your rating:</span>
                  <Rating
                    initialRating={selectedNote.ratings?.find(r => r.user === user._id || r.user?._id === user._id)?.rating || 0}
                    onRate={handleRateNote}
                  />
                </div>
                {ratingError && <p className="text-xs text-red-400 mt-1">{ratingError}</p>}
              </div>

              {/* Bookmark Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-900">
                <button
                  onClick={() => handleBookmarkToggle(selectedNote._id)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition w-full ${
                    isBookmarked(selectedNote._id)
                      ? 'bg-pink-600/10 text-pink-400 border-pink-500/30 hover:bg-pink-600/15'
                      : 'bg-gray-900 text-gray-400 border-gray-850 hover:border-gray-800 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked(selectedNote._id) ? 'fill-pink-500 text-pink-400' : ''}`} />
                  {isBookmarked(selectedNote._id) ? 'Saved to Bookmarks' : 'Save to Bookmarks'}
                </button>
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-900 pt-5 space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Comments Thread</h4>

                {/* Comment Form */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Post
                  </button>
                </form>
                {commentError && <p className="text-xs text-red-400 mt-1">{commentError}</p>}

                {/* Comment List */}
                <div className="space-y-3">
                  {selectedNote.comments?.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No comments yet. Write the first one!</p>
                  ) : (
                    selectedNote.comments.map((comm) => (
                      <div key={comm._id} className="bg-gray-900/30 border border-gray-900/50 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-gray-300">
                            {comm.username}{' '}
                            {comm.user?.role === 'Teacher' && <span className="text-purple-400 text-[9px] ml-1 bg-purple-500/10 px-1 py-0.5 rounded">Teacher</span>}
                          </span>
                          <span className="text-gray-600">{new Date(comm.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-normal">{comm.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Delete button for uploader, teacher or admin */}
            {(selectedNote.uploader?._id === user._id || user.role === 'Admin' || user.role === 'Teacher') && (
              <div className="pt-4 border-t border-gray-900">
                <button
                  onClick={() => handleDeleteNote(selectedNote._id)}
                  className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/5 text-xs font-semibold transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Study Note (Admin/Owner Action)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Note Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass border border-gray-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-5">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
              <PlusCircle className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Upload New Study Note</h3>
            </div>

            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-xs text-red-400">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calculus II - Exam Review Guide"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Brief summary of notes contents, keywords..."
                  rows="3"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  >
                    {categories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select File</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/10 file:text-indigo-400 hover:file:bg-indigo-600/20 file:transition cursor-pointer file:cursor-pointer mt-1"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-600 mt-1">
                Accepted: PDF, DOCX, JPG, PNG. Max: 10MB. {user.role === 'Student' && 'Students require moderation before files become public.'}
              </p>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-900">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <span className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-white"></span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
