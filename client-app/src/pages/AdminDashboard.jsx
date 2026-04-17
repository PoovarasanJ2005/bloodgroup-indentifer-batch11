import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  HiOutlineUsers, HiOutlineFingerPrint, HiOutlineChartBar,
  HiOutlineShieldCheck, HiOutlineSparkles
} from 'react-icons/hi';
import './Admin.css';

const COLORS = ['#7c3aed', '#a855f7', '#6366f1', '#8b5cf6', '#c084fc', '#818cf8', '#a78bfa', '#e879f9'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminService.getDashboard();
        setDashboard(res.data.dashboard);
      } catch (err) {
        console.error('Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  const bloodGroupData = dashboard?.bloodGroupDist?.map(bg => ({
    name: bg._id,
    count: bg.count,
    avgConfidence: Math.round(bg.avgConfidence * 100) / 100,
  })) || [];

  const dailyData = dashboard?.dailyPredictions?.map(d => ({
    date: d._id?.slice(5),
    count: d.count,
  })) || [];

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>📊 Admin Dashboard</h1>
        <p>System overview and analytics</p>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid-4" variants={container} initial="hidden" animate="show" style={{ marginBottom: 32 }}>
        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
            <HiOutlineUsers />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{dashboard?.totalUsers || 0}</p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
            <HiOutlineFingerPrint />
          </div>
          <div className="stat-content">
            <h3>Total Predictions</h3>
            <p className="stat-value">{dashboard?.totalPredictions || 0}</p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
            <HiOutlineSparkles />
          </div>
          <div className="stat-content">
            <h3>Avg Confidence</h3>
            <p className="stat-value">{dashboard?.avgConfidence || 0}%</p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#f9a8d4' }}>
            <HiOutlineShieldCheck />
          </div>
          <div className="stat-content">
            <h3>Verified Users</h3>
            <p className="stat-value">{dashboard?.verifiedUsers || 0}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="admin-charts-grid">
        {/* Blood Group Distribution */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="chart-title">Blood Group Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bloodGroupData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                <XAxis dataKey="name" stroke="#6b6b80" fontSize={12} />
                <YAxis stroke="#6b6b80" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Predictions" radius={[6, 6, 0, 0]}>
                  {bloodGroupData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="chart-title">Prediction Share</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bloodGroupData}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {bloodGroupData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Daily Predictions */}
        <motion.div
          className="glass-card"
          style={{ gridColumn: '1 / -1' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="chart-title">Predictions Over Time (Last 30 Days)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                <XAxis dataKey="date" stroke="#6b6b80" fontSize={11} />
                <YAxis stroke="#6b6b80" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Predictions" stroke="#7c3aed" strokeWidth={2} fill="url(#colorPred)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Predictions Table */}
      <motion.div
        className="glass-card"
        style={{ marginTop: 24 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="chart-title">Recent Predictions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Blood Group</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.recentPredictions?.map((pred, idx) => (
                <tr key={pred._id || idx}>
                  <td>
                    <div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {pred.user?.name || 'Unknown'}
                      </span>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {pred.user?.email || ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      color: 'var(--purple-400)', background: 'rgba(124,58,237,0.1)',
                      padding: '4px 12px', borderRadius: '6px'
                    }}>
                      {pred.predictedBloodGroup}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${pred.confidence >= 90 ? 'badge-green' : pred.confidence >= 70 ? 'badge-amber' : 'badge-red'}`}>
                      {pred.confidence}%
                    </span>
                  </td>
                  <td><span className="badge badge-green">{pred.status}</span></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(pred.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
