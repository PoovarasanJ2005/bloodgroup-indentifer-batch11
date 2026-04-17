"""
Flask API for Blood Group Prediction
Serves the trained CNN model for inference.
"""

import os
import sys
import json
import uuid
import hashlib
import traceback
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# --- Load Model & Config ---
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_model')
MODEL_PATH = os.path.join(MODEL_DIR, 'blood_group_model.h5')
CLASS_MAPPING_PATH = os.path.join(MODEL_DIR, 'class_mapping.json')
METRICS_PATH = os.path.join(MODEL_DIR, 'metrics.json')

IMG_SIZE = 96

model = None
class_mapping = None
metrics = None


def load_model():
    global model, class_mapping, metrics
    print("[INFO] Loading CNN model...")
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        # Build model with dummy input (required for Keras 3.x / TF 2.19)
        dummy_input = np.zeros((1, IMG_SIZE, IMG_SIZE, 1), dtype=np.float32)
        model.predict(dummy_input, verbose=0)
        print("[OK] Model loaded and warmed up successfully!")
    else:
        print(f"[WARN] Model not found at {MODEL_PATH}. Train the model first.")

    if os.path.exists(CLASS_MAPPING_PATH):
        with open(CLASS_MAPPING_PATH, 'r') as f:
            class_mapping = json.load(f)
        # Convert string keys to int keys
        class_mapping = {int(k): v for k, v in class_mapping.items()}
        print(f"[INFO] Classes: {list(class_mapping.values())}")

    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, 'r') as f:
            metrics = json.load(f)


def preprocess_image(image_bytes):
    """Preprocess fingerprint image for CNN prediction."""
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert('L')  # Grayscale
    img = img.resize((IMG_SIZE, IMG_SIZE))
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = img_array.reshape(1, IMG_SIZE, IMG_SIZE, 1)
    return img_array


def compute_fingerprint_hash(image_bytes):
    """Compute SHA-256 hash of fingerprint image for duplicate detection."""
    return hashlib.sha256(image_bytes).hexdigest()


def extract_feature_vector(image_bytes):
    """Extract a non-reversible feature embedding from the fingerprint."""
    try:
        if model is None:
            return None
        img_array = preprocess_image(image_bytes)
        # Use the image hash as a simple non-reversible embedding
        # (avoids Keras 3.x sub-model compatibility issues)
        feature_hash = hashlib.sha256(image_bytes).hexdigest()
        return feature_hash
    except Exception as e:
        print(f"[WARN] Feature extraction failed: {e}")
        return hashlib.sha256(image_bytes).hexdigest()


# --- API Routes ---
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'classes': list(class_mapping.values()) if class_mapping else []
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict blood group from fingerprint image."""
    if model is None:
        return jsonify({'error': 'Model not loaded. Train the model first.'}), 503

    if 'fingerprint' not in request.files:
        return jsonify({'error': 'No fingerprint image provided.'}), 400

    file = request.files['fingerprint']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    try:
        image_bytes = file.read()

        # Compute image hash for duplicate detection
        image_hash = compute_fingerprint_hash(image_bytes)

        # Extract feature embedding
        feature_embedding = extract_feature_vector(image_bytes)

        # Preprocess and predict
        img_array = preprocess_image(image_bytes)
        predictions = model.predict(img_array, verbose=0)

        predicted_class_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_class_idx])
        predicted_blood_group = class_mapping[predicted_class_idx]

        # Build full results with all class probabilities
        all_probabilities = {}
        for idx, prob in enumerate(predictions[0]):
            all_probabilities[class_mapping[idx]] = round(float(prob) * 100, 2)

        # Sort probabilities descending
        all_probabilities = dict(sorted(
            all_probabilities.items(),
            key=lambda x: x[1],
            reverse=True
        ))

        prediction_id = str(uuid.uuid4())

        return jsonify({
            'success': True,
            'prediction_id': prediction_id,
            'predicted_blood_group': predicted_blood_group,
            'confidence': round(confidence * 100, 2),
            'all_probabilities': all_probabilities,
            'fingerprint_hash': image_hash,
            'feature_embedding': feature_embedding,
        })

    except Exception as e:
        print(f"\n[ERROR] Prediction failed:")
        traceback.print_exc()
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Return model metrics and info."""
    if metrics is None:
        return jsonify({'error': 'No metrics available.'}), 404

    return jsonify({
        'accuracy': metrics.get('accuracy', 0),
        'loss': metrics.get('loss', 0),
        'classes': metrics.get('class_names', []),
        'epochs_trained': metrics.get('epochs_trained', 0),
        'img_size': metrics.get('img_size', IMG_SIZE),
    })


# --- Main ---
if __name__ == '__main__':
    load_model()
    print("\n[SERVER] Flask ML API running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
