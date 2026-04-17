import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight
} from 'react-icons/hi';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers(page, 20, search);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"? This will also delete all their predictions.`)) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers(pagination.page);
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>👥 User Management</h1>
        <p>Manage registered users</p>
      </motion.div>

      {/* Search */}
      <motion.form
        className="glass-card"
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: 12, marginBottom: 24, padding: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <HiOutlineSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: 40, width: '100%' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
      </motion.form>

      {/* Table */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Verified</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{(pagination.page - 1) * 20 + idx + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.age}</td>
                      <td>
                        <span className={`badge ${u.isVerified ? 'badge-green' : 'badge-amber'}`}>
                          {u.isVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(u._id, u.name)}
                        >
                          <HiOutlineTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>
                  <HiOutlineChevronLeft /> Prev
                </button>
                <span className="pagination-info">Page {pagination.page} of {pagination.pages} ({pagination.total} users)</span>
                <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)}>
                  Next <HiOutlineChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AdminUsers;
