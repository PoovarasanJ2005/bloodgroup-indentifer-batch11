import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { predictionService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineFingerPrint, HiOutlineUpload, HiOutlineX,
  HiOutlineCheckCircle, HiOutlineExclamation
} from 'react-icons/hi';
import './Predict.css';

const Predict = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setDuplicateWarning(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handlePredict = async () => {
    if (!file) return toast.error('Please upload a fingerprint image first.');

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('fingerprint', file);

      const res = await predictionService.predict(formData);
      setResult(res.data.prediction);
      setDuplicateWarning(res.data.duplicateWarning);
      toast.success('Prediction complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Prediction failed. Is the ML server running?');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setDuplicateWarning(null);
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 90) return '#22c55e';
    if (conf >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>🩸 Blood Group Prediction</h1>
        <p>Upload a fingerprint image to predict the blood group using our AI model</p>
      </motion.div>

      <div className="predict-layout">
        {/* Upload Section */}
        <motion.div
          className="glass-card predict-upload-section"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-title">
            <HiOutlineUpload /> Upload Fingerprint
          </h3>

          {!preview ? (
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">🖐️</div>
              <h3>Drop fingerprint image here</h3>
              <p>or click to browse • JPEG, PNG, BMP • Max 5MB</p>
            </div>
          ) : (
            <div className="preview-container">
              <div className="preview-image-wrapper">
                <img src={preview} alt="Fingerprint preview" className="preview-image" />
                <button className="preview-remove" onClick={resetForm}>
                  <HiOutlineX />
                </button>
              </div>
              <div className="preview-info">
                <p className="preview-filename">{file?.name}</p>
                <p className="preview-size">
                  {(file?.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          <motion.button
            className="btn btn-primary predict-btn"
            onClick={handlePredict}
            disabled={!file || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Analyzing...
              </>
            ) : (
              <>
                <HiOutlineFingerPrint /> Predict Blood Group
              </>
            )}
          </motion.button>

          {/* Security info */}
          <div className="security-note">
            <p>🔒 Your fingerprint is encrypted with AES-256 before storage. Raw images are never stored.</p>
          </div>
        </motion.div>

        {/* Result Section */}
        <motion.div
          className="glass-card predict-result-section"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="section-title">
            <HiOutlineCheckCircle /> Prediction Result
          </h3>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="result-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="analysis-animation">
                  <div className="scan-ring" />
                  <HiOutlineFingerPrint className="scan-icon" />
                </div>
                <p>Analyzing fingerprint patterns...</p>
                <p className="text-muted">Processing through CNN model</p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="result-content"
              >
                {/* Duplicate warning */}
                {duplicateWarning && (
                  <div className="duplicate-warning">
                    <HiOutlineExclamation />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                {/* Blood group display */}
                <div className="result-blood-group">
                  <div className="blood-group-display">{result.predictedBloodGroup}</div>
                  <p className="result-label">Predicted Blood Group</p>
                </div>

                {/* Confidence */}
                <div className="result-confidence">
                  <div className="confidence-header">
                    <span>Confidence Score</span>
                    <span style={{ color: getConfidenceColor(result.confidence), fontWeight: 700 }}>
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="confidence-bar">
                    <motion.div
                      className="confidence-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{
                        background: `linear-gradient(90deg, ${getConfidenceColor(result.confidence)}, ${getConfidenceColor(result.confidence)}88)`
                      }}
                    />
                  </div>
                </div>

                {/* All Probabilities */}
                <div className="result-probabilities">
                  <h4>All Probabilities</h4>
                  <div className="prob-list">
                    {result.allProbabilities && Object.entries(result.allProbabilities).map(([group, prob]) => (
                      <div key={group} className="prob-item">
                        <span className="prob-group">{group}</span>
                        <div className="prob-bar-container">
                          <motion.div
                            className="prob-bar"
                            initial={{ width: 0 }}
                            animate={{ width: `${prob}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                        <span className="prob-value">{prob}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prediction ID */}
                <div className="result-meta">
                  <p>Prediction ID: <span>{result.predictionId}</span></p>
                  <p>Date: <span>{new Date(result.createdAt).toLocaleString()}</span></p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="result-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="empty-fingerprint">
                  <HiOutlineFingerPrint />
                </div>
                <h3>No Prediction Yet</h3>
                <p>Upload a fingerprint image and click <strong>Predict</strong> to see results</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Predict;
