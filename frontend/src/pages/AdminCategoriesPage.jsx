import { useEffect, useState } from 'react';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const emptyForm = { name: '', description: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data.categories || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/api/categories/${editingId}`, form);
      } else {
        await api.post('/api/categories', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save category.');
    }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description || '' });
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Deactivate category "${category.name}"?`)) return;
    try {
      await api.delete(`/api/categories/${category.id}`);
      await fetchCategories();
      if (editingId === category.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to deactivate category.');
    }
  };

  if (loading) return <LoadingState message="Loading categories..." />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>Categories</h1>
      </div>
      {error && <ErrorState message={error} />}

      <form onSubmit={handleSubmit} className="form-grid card-box admin-form">
        <h2>{editingId ? 'Edit category' : 'Add category'}</h2>
        <label>
          Category name
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>
          Description
          <textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="button-row">
          <button className="primary-btn" type="submit">{editingId ? 'Save changes' : 'Add category'}</button>
          {editingId && <button className="secondary-btn" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
        </div>
      </form>

      <div className="table-box">
        <table>
          <thead>
            <tr><th>Name</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.description}</td>
                <td className="button-row">
                  <button className="secondary-btn" onClick={() => startEdit(category)}>Edit</button>
                  <button className="danger-btn" onClick={() => deleteCategory(category)}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!categories.length && <p className="empty-table">No active categories.</p>}
      </div>
    </div>
  );
}
