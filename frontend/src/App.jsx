import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketNewPage from './pages/TicketNewPage';
import TicketDetailPage from './pages/TicketDetailPage';
import MyTicketsPage from './pages/MyTicketsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/new" element={<ProtectedRoute><RoleRoute allowedRoles={['CUSTOMER', 'ADMIN']}><TicketNewPage /></RoleRoute></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
        <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AdminPage /></RoleRoute></ProtectedRoute>} />
        <Route path="/admin/tickets" element={<ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AdminTicketsPage /></RoleRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AdminUsersPage /></RoleRoute></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AdminCategoriesPage /></RoleRoute></ProtectedRoute>} />
      </Routes>
    </>
  );
}
