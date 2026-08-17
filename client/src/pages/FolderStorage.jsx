import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, FileText, ChevronRight, ArrowLeft, Trash2, PlusCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const FolderStorage = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // Array of { id, name }

  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [userBookmarks, setUserBookmarks] = useState([]);
  const [selectedNoteToMove, setSelectedNoteToMove] = useState('');

  // Fetch current folder contents
  const fetchContents = async () => {
    if (!currentFolderId && user && user.department) {
      setFolders([{
        _id: 'dept-root',
        name: `${user.department} Department`,
        isDeptFolder: true,
      }]);
      setNotes([]);
      return;
    }

    try {
      const url = currentFolderId ? `/folders?parentFolder=${currentFolderId}` : '/folders';
      const { data } = await api.get(url);
      setFolders(data.folders);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching storage contents:', err);
    }
  };

  // Fetch user bookmarks when add-note modal opens
  const fetchBookmarks = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setUserBookmarks(data.bookmarks || []);
      if (data.bookmarks?.length > 0) {
        setSelectedNoteToMove(data.bookmarks[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [currentFolderId]);

  useEffect(() => {
    if (showAddNoteModal) {
      fetchBookmarks();
    }
  }, [showAddNoteModal]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.post('/folders', {
        name: newFolderName,
        parentFolder: currentFolderId,
      });
      setNewFolderName('');
      setShowFolderModal(false);
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (id, e) => {
    e.stopPropagation(); // Avoid entering folder on click
    if (!window.confirm('Are you sure you want to delete this folder and all subfolders?')) return;

    try {
      await api.delete(`/folders/${id}`);
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNoteToFolder = async (e) => {
    e.preventDefault();
    if (!selectedNoteToMove || !currentFolderId) return;

    try {
      await api.post(`/folders/${currentFolderId}/notes`, { noteId: selectedNoteToMove });
      setShowAddNoteModal(false);
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnterFolder = (folder) => {
    setFolderPath((prev) => [...prev, { id: folder._id, name: folder.name }]);
    setCurrentFolderId(folder._id);
  };

  const handleNavigateBack = () => {
    if (folderPath.length === 0) return;
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolderId(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Personal Storage</h1>
          <p className="text-gray-400 text-sm">Organize your saved or bookmarked study notes in folders</p>
        </div>

        <div className="flex gap-3">
          {currentFolderId && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs font-semibold text-gray-300 hover:text-white transition"
            >
              <FolderPlus className="w-4.5 h-4.5 text-indigo-400" />
              New Folder
            </button>
          )}

          {currentFolderId && currentFolderId !== 'dept-root' && (
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              Add Note Here
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 bg-gray-900/35 border border-gray-900/60 p-3 rounded-xl">
        <button
          onClick={() => handleBreadcrumbClick(-1)}
          className="hover:text-white font-medium transition"
        >
          My Storage
        </button>

        {folderPath.map((pathItem, idx) => (
          <React.Fragment key={pathItem.id}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className={`hover:text-white font-medium transition ${
                idx === folderPath.length - 1 ? 'text-indigo-400 font-semibold' : ''
              }`}
            >
              {pathItem.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Folders & Files Layout */}
      <div className="space-y-6">
        {/* Navigation Back (if inside subfolder) */}
        {currentFolderId && (
          <button
            onClick={handleNavigateBack}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to previous folder
          </button>
        )}

        {/* Folders List Grid */}
        {folders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-gray-500">Folders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder._id}
                  onClick={() => handleEnterFolder(folder)}
                  className="glass rounded-xl p-4 border border-gray-850 hover:border-gray-750 flex items-center justify-between cursor-pointer transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder className="w-6 h-6 text-indigo-400 shrink-0 fill-indigo-400/10" />
                    <span className="text-xs font-bold text-gray-200 truncate">{folder.name}</span>
                  </div>
                  {!folder.isDeptFolder && (
                    <button
                      onClick={(e) => handleDeleteFolder(folder._id, e)}
                      className="p-1 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition"
                      title="Delete folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes (Files) List Grid */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-gray-500">Notes / Documents</h3>
          {notes.length === 0 ? (
            folders.length === 0 ? (
              <div className="glass rounded-2xl p-16 text-center text-gray-500 border border-gray-900">
                <Folder className="w-12 h-12 text-gray-800 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-400">Folder is empty</h3>
                <p className="text-xs text-gray-600 mt-1">Create subfolders or add bookmarked study notes here!</p>
              </div>
            ) : null
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note) => (
                <a
                  key={note._id}
                  href={note.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-xl p-4 border border-gray-850 hover:border-indigo-500/25 flex items-center justify-between transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-200 truncate">{note.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{note.category}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {note.fileType?.split('/')[1] || 'PDF'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xs w-full glass border border-gray-800 rounded-2xl p-5 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowFolderModal(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white">Create New Folder</h3>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full glass border border-gray-800 rounded-2xl p-5 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowAddNoteModal(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white">Add Note to Folder</h3>

            {userBookmarks.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No bookmarked notes found.<br />Go bookmark some study notes first!
              </div>
            ) : (
              <form onSubmit={handleAddNoteToFolder} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">
                    Select note from Bookmarks
                  </label>
                  <select
                    value={selectedNoteToMove}
                    onChange={(e) => setSelectedNoteToMove(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  >
                    {userBookmarks.map((bk) => (
                      <option key={bk._id} value={bk._id}>
                        {bk.title} ({bk.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNoteModal(false)}
                    className="px-3 py-1.5 text-gray-400 hover:text-white"
                  >
                    Cancel
                </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                  >
                    Add File
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderStorage;
