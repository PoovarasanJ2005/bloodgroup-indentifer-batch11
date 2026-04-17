import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { predictionService } from '../services/api';
import {
  HiOutlineFingerPrint, HiOutlineBeaker, HiOutlineChartBar,
  HiOutlineClock, HiOutlineArrowRight, HiOutlineSparkles
} from 'react-icons/hi';
import './Dashboard.css';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await predictionService.getStats();
        setStats(res.data.stats);
      } catch (err) {
        console.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="dashboard-greeting">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="dashboard-subtitle">Welcome to your BloodAI dashboard</p>
        </div>
        <Link to="/predict" className="btn btn-primary">
          <HiOutlineFingerPrint /> New Prediction
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid-4"
        variants={container}
        initial="hidden"
        animate="show"
        style={{ marginBottom: 32 }}
      >
        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
            <HiOutlineBeaker />
          </div>
          <div className="stat-content">
            <h3>Total Predictions</h3>
            <p className="stat-value">{stats?.totalPredictions || 0}</p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
            <HiOutlineChartBar />
          </div>
          <div className="stat-content">
            <h3>Blood Groups Found</h3>
            <p className="stat-value">{stats?.bloodGroupStats?.length || 0}</p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
            <HiOutlineSparkles />
          </div>
          <div className="stat-content">
            <h3>Avg Confidence</h3>
            <p className="stat-value">
              {stats?.bloodGroupStats?.length > 0
                ? `${Math.round(stats.bloodGroupStats.reduce((a, b) => a + b.avgConfidence, 0) / stats.bloodGroupStats.length)}%`
                : '—'}
            </p>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#f9a8d4' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-content">
            <h3>Member Since</h3>
            <p className="stat-value" style={{ fontSize: '1.1rem' }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="dashboard-grid">
        {/* Quick Action Card */}
        <motion.div
          className="glass-card predict-cta-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="cta-content">
            <div className="cta-icon-large">
              <HiOutlineFingerPrint />
            </div>
            <h2>Predict Your Blood Group</h2>
            <p>Upload a fingerprint image and our AI model will analyze it to predict your blood group with high accuracy.</p>
            <Link to="/predict" className="btn btn-primary" style={{ marginTop: 16 }}>
              Start Prediction <HiOutlineArrowRight />
            </Link>
          </div>
          <div className="cta-decoration">
            <div className="cta-ring ring-1" />
            <div className="cta-ring ring-2" />
            <div className="cta-ring ring-3" />
          </div>
        </motion.div>

        {/* Recent Predictions */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h3>Recent Predictions</h3>
            <Link to="/history" className="btn btn-ghost btn-sm">
              View All <HiOutlineArrowRight />
            </Link>
          </div>

          {stats?.recentPredictions?.length > 0 ? (
            <div className="recent-list">
              {stats.recentPredictions.map((pred, idx) => (
                <motion.div
                  key={pred._id || idx}
                  className="recent-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                >
                  <div className="recent-item-blood">
                    {pred.predictedBloodGroup}
                  </div>
                  <div className="recent-item-info">
                    <p className="recent-item-conf">{pred.confidence}% confidence</p>
                    <p className="recent-item-date">
                      {new Date(pred.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <HiOutlineFingerPrint className="empty-icon" />
              <p>No predictions yet</p>
              <Link to="/predict" className="btn btn-secondary btn-sm">Make your first prediction</Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
