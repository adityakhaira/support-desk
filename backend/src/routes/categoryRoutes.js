const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/', authenticate, listCategories);
router.post('/', authenticate, authorizeRoles('ADMIN'), createCategory);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), updateCategory);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteCategory);

module.exports = router;
