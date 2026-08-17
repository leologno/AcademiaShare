const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPendingNotes,
  approveNote,
  rejectNote,
  getAllUsers,
  getPendingUsers,
  approveUser,
  updateUserRole,
  deleteUser,
  getAllClassrooms,
} = require('../controllers/adminController');

// Protect all routes
router.use(protect);

// Routes accessible to both Admin and SubAdmin
router.get('/pending-notes', authorize('Admin', 'SubAdmin'), getPendingNotes);
router.put('/notes/:id/approve', authorize('Admin', 'SubAdmin'), approveNote);
router.delete('/notes/:id/reject', authorize('Admin', 'SubAdmin'), rejectNote);

router.get('/users', authorize('Admin', 'SubAdmin'), getAllUsers);
router.get('/pending-users', authorize('Admin', 'SubAdmin'), getPendingUsers);
router.put('/users/:id/approve', authorize('Admin', 'SubAdmin'), approveUser);
router.get('/classrooms', authorize('Admin', 'SubAdmin'), getAllClassrooms);

// Routes restricted strictly to Super Admin
router.put('/users/:id/role', authorize('Admin'), updateUserRole);
router.delete('/users/:id', authorize('Admin'), deleteUser);

module.exports = router;
