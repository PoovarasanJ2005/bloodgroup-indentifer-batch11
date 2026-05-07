import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import { authService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineUser, HiOutlineMail, HiOutlineCalendar,
  HiOutlinePhone, HiOutlineShieldCheck, HiOutlinePencil
} from 'react-icons/hi';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await authService.updateProfile(formData);
      updateUser(res.data.user);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>👤 My Profile</h1>
        <p>Manage your account details</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        {/* Profile Card */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 700, color: 'white',
              margin: '0 auto 12px', boxShadow: 'var(--shadow-neon)'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              {user?.name}
            </h2>
            <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-green'}`} style={{ marginTop: 8 }}>
              {user?.role === 'admin' ? '🛡️ Admin' : '👤 User'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HiOutlineMail style={{ color: 'var(--purple-400)', fontSize: '1.2rem' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HiOutlineCalendar style={{ color: 'var(--purple-400)', fontSize: '1.2rem' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Age</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.age} years old</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HiOutlineShieldCheck style={{ color: user?.isVerified ? '#22c55e' : '#f59e0b', fontSize: '1.2rem' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verification</p>
                <span className={`badge ${user?.isVerified ? 'badge-green' : 'badge-amber'}`}>
                  {user?.isVerified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit Card */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Edit Profile</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>
              <HiOutlinePencil /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                className="input-field"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!editing}
                placeholder="Not provided"
              />
            </div>

            <div className="input-group">
              <label>Email (cannot be changed)</label>
              <input type="email" className="input-field" value={user?.email || ''} disabled />
            </div>

            {editing && (
              <motion.button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
