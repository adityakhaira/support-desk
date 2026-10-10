import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function TicketNewPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ categoryId: '', title: '', description: '', priority: 'MEDIUM' });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/categories');
        setCategories(response.data.categories || []);
        if (response.data.categories?.length) {
          setForm((prev) => ({ ...prev, categoryId: response.data.categories[0].id }));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load categories.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/tickets', form);
      navigate(`/tickets/${response.data.ticket.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create ticket.');
    }
  };

  if (loading) return <LoadingState message="Loading ticket form..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>New ticket</h1>
      </div>

      <form onSubmit={handleSubmit} className="form-grid card-box">
        <label>
          Category
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label>
          Description
          <textarea rows="6" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </label>
        <button type="submit" className="primary-btn">Create ticket</button>
      </form>
    </div>
  );
}
