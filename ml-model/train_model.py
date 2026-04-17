"""
Blood Group Prediction CNN Model Training Script
Trains a Convolutional Neural Network on fingerprint images to predict blood groups.
Dataset: 8 classes (A+, A-, AB+, AB-, B+, B-, O+, O-)
Split: 80% training (dataset/train/) / 20% testing (dataset/test/)
       Run  dataset/split_dataset.py  first to create those folders.
"""

import os
import sys
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

# --- Configuration ---
DATASET_BASE = os.path.join(os.path.dirname(__file__), '..', 'dataset')
TRAIN_DIR    = os.path.join(DATASET_BASE, 'train')
TEST_DIR     = os.path.join(DATASET_BASE, 'test')
MODEL_DIR    = os.path.join(os.path.dirname(__file__), 'saved_model')

IMG_SIZE     = 96
BATCH_SIZE   = 32
EPOCHS       = 50
SEED         = 42

os.makedirs(MODEL_DIR, exist_ok=True)

# --- Sanity check ---
print("=" * 60)
print("BLOOD GROUP PREDICTION - CNN MODEL TRAINING")
print("=" * 60)

if not os.path.isdir(TRAIN_DIR):
    print(f"[ERROR] Training folder not found: {TRAIN_DIR}")
    print("        Run  python dataset/split_dataset.py  first!")
    sys.exit(1)

if not os.path.isdir(TEST_DIR):
    print(f"[ERROR] Test folder not found: {TEST_DIR}")
    print("        Run  python dataset/split_dataset.py  first!")
    sys.exit(1)

# --- Data Loading ---
# Training data generator WITH augmentation
train_datagen = ImageDataGenerator(
    rescale=1.0 / 255.0,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest'
)

# Test / validation generator — NO augmentation, only rescale
test_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

print(f"\n[INFO] Train folder : {TRAIN_DIR}")
print(f"[INFO] Test  folder : {TEST_DIR}")
print(f"[INFO] Image size   : {IMG_SIZE}x{IMG_SIZE} (grayscale)")
print(f"[INFO] Batch size   : {BATCH_SIZE}")
print(f"[INFO] Epochs       : {EPOCHS}")

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    color_mode='grayscale',
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    seed=SEED,
    shuffle=True
)

test_generator = test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    color_mode='grayscale',
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    seed=SEED,
    shuffle=False
)

class_names = list(train_generator.class_indices.keys())
num_classes = len(class_names)

print(f"\n[INFO] Classes ({num_classes}): {class_names}")
print(f"[INFO] Training samples : {train_generator.samples}")
print(f"[INFO] Test samples     : {test_generator.samples}")

# Save class mapping
class_mapping = {v: k for k, v in train_generator.class_indices.items()}
with open(os.path.join(MODEL_DIR, 'class_mapping.json'), 'w') as f:
    json.dump(class_mapping, f, indent=2)

# --- CNN Model Architecture ---
print("\n[BUILD] Building CNN Model...")

model = models.Sequential([
    # Block 1
    layers.Conv2D(32, (3, 3), activation='relu', padding='same',
                  input_shape=(IMG_SIZE, IMG_SIZE, 1)),
    layers.BatchNormalization(),
    layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),

    # Block 2
    layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),

    # Block 3
    layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),

    # Block 4
    layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),

    # Dense layers
    layers.Flatten(),
    layers.Dense(512, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.5),
    layers.Dense(256, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.5),
    layers.Dense(num_classes, activation='softmax')
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# --- Callbacks ---
early_stop = callbacks.EarlyStopping(
    monitor='val_accuracy',
    patience=10,
    restore_best_weights=True,
    verbose=1
)

reduce_lr = callbacks.ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,
    patience=5,
    min_lr=1e-6,
    verbose=1
)

checkpoint = callbacks.ModelCheckpoint(
    os.path.join(MODEL_DIR, 'best_model.h5'),
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

# --- Training ---
print("\n[TRAIN] Starting training...")

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=test_generator,
    callbacks=[early_stop, reduce_lr, checkpoint],
    verbose=1
)

# --- Save Final Model ---
model.save(os.path.join(MODEL_DIR, 'blood_group_model.h5'))
print(f"\n[OK] Model saved to {MODEL_DIR}")

# --- Evaluation on Test Set ---
print("\n[EVAL] Evaluating model on test set...")
test_generator.reset()
loss, accuracy = model.evaluate(test_generator, verbose=0)
print(f"   Test Loss     : {loss:.4f}")
print(f"   Test Accuracy : {accuracy:.4f} ({accuracy*100:.2f}%)")

# Classification report
test_generator.reset()
y_pred_probs = model.predict(test_generator, verbose=0)
y_pred  = np.argmax(y_pred_probs, axis=1)
y_true  = test_generator.classes

report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
print("\n[REPORT] Classification Report:")
print(classification_report(y_true, y_pred, target_names=class_names))

# Save metrics
metrics = {
    'accuracy':      float(accuracy),
    'loss':          float(loss),
    'class_report':  report,
    'class_names':   class_names,
    'epochs_trained': len(history.history['accuracy']),
    'img_size':      IMG_SIZE,
    'train_samples': train_generator.samples,
    'test_samples':  test_generator.samples,
}
with open(os.path.join(MODEL_DIR, 'metrics.json'), 'w') as f:
    json.dump(metrics, f, indent=2)

# --- Plots ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].plot(history.history['accuracy'],     label='Train Accuracy')
axes[0].plot(history.history['val_accuracy'], label='Test Accuracy')
axes[0].set_title('Model Accuracy')
axes[0].set_xlabel('Epoch')
axes[0].set_ylabel('Accuracy')
axes[0].legend()
axes[0].grid(True, alpha=0.3)

axes[1].plot(history.history['loss'],     label='Train Loss')
axes[1].plot(history.history['val_loss'], label='Test Loss')
axes[1].set_title('Model Loss')
axes[1].set_xlabel('Epoch')
axes[1].set_ylabel('Loss')
axes[1].legend()
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(MODEL_DIR, 'training_plots.png'), dpi=150)
print("[PLOT] Training plots saved.")

# Confusion Matrix
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Purples',
            xticklabels=class_names, yticklabels=class_names)
plt.title('Confusion Matrix — Test Set')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.savefig(os.path.join(MODEL_DIR, 'confusion_matrix.png'), dpi=150)
print("[PLOT] Confusion matrix saved.")

print("\n" + "=" * 60)
print("TRAINING COMPLETE!")
print(f"   Final Test Accuracy : {accuracy*100:.2f}%")
print(f"   Model               : {MODEL_DIR}/blood_group_model.h5")
print("=" * 60)
