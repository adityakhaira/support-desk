import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return <div className="state-box">Please log in.</div>;

  return (
    <div className="container page-shell">
      <div className="page-header">
        <h1>Profile</h1>
      </div>
      <div className="card-box profile-box">
        <h3>{user.name}</h3>
        <ul className="detail-list">
          <li><strong>Email:</strong> {user.email}</li>
          <li><strong>Role:</strong> {user.role}</li>
          <li><strong>Status:</strong> {user.is_active ? 'Active' : 'Inactive'}</li>
        </ul>
      </div>
    </div>
  );
}
