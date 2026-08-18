const Folder = require('../models/Folder');
const Note = require('../models/Note');

const createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    let parentFolderId = parentFolder || null;
    if (parentFolderId === 'dept-root') {
      parentFolderId = null;
    }

    const folder = await Folder.create({
      name,
      owner: req.user._id,
      parentFolder: parentFolderId,
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFolders = async (req, res) => {
  try {
    let parentId = req.query.parentFolder || null;
    if (parentId === 'dept-root') {
      parentId = null;
    }
    
    // Find subfolders under parent
    const folders = await Folder.find({
      owner: req.user._id,
      parentFolder: parentId,
    });

    // Find notes directly in parent folder
    let notes = [];
    if (parentId) {
      const currentFolder = await Folder.findById(parentId).populate('notes');
      if (currentFolder) {
        notes = currentFolder.notes;
      }
    }

    res.json({ folders, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFolderContents = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('notes');

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const subfolders = await Folder.find({
      owner: req.user._id,
      parentFolder: folder._id,
    });

    res.json({ folder, subfolders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addNoteToFolder = async (req, res) => {
  try {
    const { noteId } = req.body;
    const folderId = req.params.id;

    const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Add note if not already present
    if (!folder.notes.some(n => n.toString() === noteId)) {
      folder.notes.push(noteId);
      await folder.save();
    }

    res.json({ message: 'Note added to folder successfully', folder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.id;
    const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Recursively delete subfolders
    const deleteSubfolders = async (id) => {
      const subs = await Folder.find({ parentFolder: id });
      for (let sub of subs) {
        await deleteSubfolders(sub._id);
        await Folder.findByIdAndDelete(sub._id);
      }
    };

    await deleteSubfolders(folderId);
    await Folder.findByIdAndDelete(folderId);

    res.json({ message: 'Folder and subfolders deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createFolder,
  getFolders,
  getFolderContents,
  addNoteToFolder,
  deleteFolder,
};
