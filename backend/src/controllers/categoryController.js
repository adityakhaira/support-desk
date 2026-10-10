const pool = require('../config/db');
const { categorySchema } = require('../validators');
const { successResponse, errorResponse } = require('../utils/response');

async function listCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC');
    return successResponse(res, 200, { categories: rows });
  } catch (error) {
    console.error('Category list query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch categories.');
  }
}

async function createCategory(req, res) {
  try {
    const parsed = categorySchema.parse(req.body);
    const [existing] = await pool.query('SELECT id FROM categories WHERE name = ? AND is_active = 1', [parsed.name.trim()]);
    if (existing.length) {
      return errorResponse(res, 409, 'Category name already exists.');
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
      [parsed.name.trim(), parsed.description || '']
    );

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return successResponse(res, 201, { message: 'Category created.', category: rows[0] });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Category name already exists.');
    }
    console.error('Category creation failed:', error);
    return errorResponse(res, 500, 'Unable to create category.');
  }
}

async function updateCategory(req, res) {
  try {
    const parsed = categorySchema.parse(req.body);
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!existing.length) {
      return errorResponse(res, 404, 'Category not found.');
    }

    await pool.query(
      'UPDATE categories SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [parsed.name.trim(), parsed.description || '', req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    return successResponse(res, 200, { message: 'Category updated.', category: rows[0] });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, 409, 'Category name already exists.');
    }
    console.error('Category update failed:', error);
    return errorResponse(res, 500, 'Unable to update category.');
  }
}

async function deleteCategory(req, res) {
  try {
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!existing.length) {
      return errorResponse(res, 404, 'Category not found.');
    }

    await pool.query('UPDATE categories SET is_active = 0, updated_at = NOW() WHERE id = ?', [req.params.id]);
    return successResponse(res, 200, { message: 'Category deleted.' });
  } catch (error) {
    console.error('Category deletion failed:', error);
    return errorResponse(res, 500, 'Unable to delete category.');
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
