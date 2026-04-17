import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { predictionService } from '../services/api';
import { HiOutlineClock, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import './History.css';

const History = () => {
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await predictionService.getHistory(page, 10);
      setPredictions(res.data.predictions);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const getConfidenceBadge = (conf) => {
    if (conf >= 90) return 'badge-green';
    if (conf >= 70) return 'badge-amber';
    return 'badge-red';
  };

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>📋 Prediction History</h1>
        <p>View all your past blood group predictions</p>
      </motion.div>

      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="loading-screen" style={{ minHeight: '300px' }}>
            <div className="spinner" />
            <p>Loading history...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="empty-state">
            <HiOutlineClock className="empty-icon" />
            <p>No predictions found. Make your first prediction!</p>
          </div>
        ) : (
          <>
            <div className="history-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Blood Group</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, idx) => (
                    <motion.tr
                      key={pred._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <td style={{ color: 'var(--text-muted)' }}>
                        {(pagination.page - 1) * 10 + idx + 1}
                      </td>
                      <td>
                        <span className="history-blood-group">{pred.predictedBloodGroup}</span>
                      </td>
                      <td>
                        <span className={`badge ${getConfidenceBadge(pred.confidence)}`}>
                          {pred.confidence}%
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-green">{pred.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(pred.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedPrediction(
                            selectedPrediction?._id === pred._id ? null : pred
                          )}
                        >
                          {selectedPrediction?._id === pred._id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Detail */}
            {selectedPrediction && (
              <motion.div
                className="history-detail"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Prediction ID</span>
                    <span className="detail-value">{selectedPrediction.predictionId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Blood Group</span>
                    <span className="detail-value blood-group-display" style={{ fontSize: '2rem', padding: '8px' }}>
                      {selectedPrediction.predictedBloodGroup}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Confidence</span>
                    <span className="detail-value">{selectedPrediction.confidence}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Fingerprint Hash</span>
                    <span className="detail-value hash-text">{selectedPrediction.fingerprintHash}</span>
                  </div>
                </div>

                {/* All probabilities */}
                {selectedPrediction.allProbabilities && (
                  <div className="detail-probs">
                    <h4>Probability Distribution</h4>
                    <div className="prob-list">
                      {Object.entries(
                        selectedPrediction.allProbabilities instanceof Map
                          ? Object.fromEntries(selectedPrediction.allProbabilities)
                          : selectedPrediction.allProbabilities
                      ).sort(([,a], [,b]) => b - a).map(([group, prob]) => (
                        <div key={group} className="prob-item">
                          <span className="prob-group">{group}</span>
                          <div className="prob-bar-container">
                            <div className="prob-bar" style={{ width: `${prob}%` }} />
                          </div>
                          <span className="prob-value">{prob}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchHistory(pagination.page - 1)}
                >
                  <HiOutlineChevronLeft /> Prev
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchHistory(pagination.page + 1)}
                >
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

export default History;
