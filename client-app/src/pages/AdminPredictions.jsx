import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminService } from '../services/api';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import './Admin.css';

const AdminPredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminService.getPredictions(page, 20);
      setPredictions(res.data.predictions);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPredictions(); }, []);

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>🔍 Prediction Logs</h1>
        <p>Monitor all system predictions</p>
      </motion.div>

      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
                    <th>User</th>
                    <th>Blood Group</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Fingerprint Hash</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, idx) => (
                    <tr key={pred._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{(pagination.page - 1) * 20 + idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {pred.user?.name || 'Unknown'}
                        </span>
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
                      <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pred.fingerprintHash}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(pred.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchPredictions(pagination.page - 1)}>
                  <HiOutlineChevronLeft /> Prev
                </button>
                <span className="pagination-info">Page {pagination.page} of {pagination.pages} ({pagination.total} logs)</span>
                <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchPredictions(pagination.page + 1)}>
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

export default AdminPredictions;
