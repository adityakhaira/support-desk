import { useEffect, useState } from 'react';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useAuth } from '../context/AuthContext';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      const nextUsers = response.data.users || [];
      setUsers(nextUsers);
      setChanges(Object.fromEntries(nextUsers.map((entry) => [entry.id, {
        role: entry.role,
        isActive: Boolean(entry.is_active)
      }])));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const saveUser = async (userId) => {
    setSavingId(userId);
    setError('');
    setNotice('');
    try {
      await api.patch(`/api/admin/users/${userId}`, changes[userId]);
      setNotice('User updated.');
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update user.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading users..." />;

  return (
    <div className="container page-shell">
      <div className="page-header"><h1>Users</h1></div>
      {error && <ErrorState message={error} />}
      {notice && <div className="notice-box">{notice}</div>}
      <div className="table-box">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((entry) => {
              const row = changes[entry.id] || { role: entry.role, isActive: Boolean(entry.is_active) };
              const isSelf = entry.id === currentUser?.id;
              return (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>
                    <select value={row.role} disabled={isSelf} onChange={(event) => setChanges({
                      ...changes,
                      [entry.id]: { ...row, role: event.target.value }
                    })}>
                      <option value="CUSTOMER">Customer</option>
                      <option value="AGENT">Agent</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select value={row.isActive ? 'active' : 'inactive'} disabled={isSelf} onChange={(event) => setChanges({
                      ...changes,
                      [entry.id]: { ...row, isActive: event.target.value === 'active' }
                    })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="primary-btn"
                      disabled={savingId === entry.id}
                      onClick={() => saveUser(entry.id)}
                    >
                      {savingId === entry.id ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
