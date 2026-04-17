"""
Dataset Splitter — Blood Group Fingerprint Images
Splits dataset/dataset_blood_group/<class>/ into:
  dataset/train/<class>/   (80%)
  dataset/test/<class>/    (20%)

Usage:  python split_dataset.py
"""

import os
import sys
import shutil
import random

# ── Config ────────────────────────────────────────────────────────────────────
SEED          = 42
TRAIN_RATIO   = 0.80

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR    = os.path.join(BASE_DIR, 'dataset_blood_group')
TRAIN_DIR     = os.path.join(BASE_DIR, 'train')
TEST_DIR      = os.path.join(BASE_DIR, 'test')

# ── Helpers ───────────────────────────────────────────────────────────────────
def copy_files(file_list, src_class_dir, dest_class_dir):
    os.makedirs(dest_class_dir, exist_ok=True)
    for fname in file_list:
        shutil.copy2(
            os.path.join(src_class_dir, fname),
            os.path.join(dest_class_dir, fname)
        )

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not os.path.isdir(SOURCE_DIR):
        print(f"[ERROR] Source directory not found: {SOURCE_DIR}")
        sys.exit(1)

    classes = sorted([
        d for d in os.listdir(SOURCE_DIR)
        if os.path.isdir(os.path.join(SOURCE_DIR, d))
    ])

    if not classes:
        print("[ERROR] No class folders found in dataset_blood_group/")
        sys.exit(1)

    random.seed(SEED)

    total_train = 0
    total_test  = 0

    print("=" * 60)
    print("  DATASET SPLIT — 80% TRAIN / 20% TEST")
    print("=" * 60)
    print(f"  Source : {SOURCE_DIR}")
    print(f"  Train  : {TRAIN_DIR}")
    print(f"  Test   : {TEST_DIR}")
    print(f"  Seed   : {SEED}")
    print("=" * 60)

    for cls in classes:
        src_cls_dir = os.path.join(SOURCE_DIR, cls)
        files = sorted([
            f for f in os.listdir(src_cls_dir)
            if os.path.isfile(os.path.join(src_cls_dir, f))
        ])

        if not files:
            print(f"  [{cls}] — No files found, skipping.")
            continue

        random.shuffle(files)

        n_train = int(len(files) * TRAIN_RATIO)
        n_test  = len(files) - n_train

        train_files = files[:n_train]
        test_files  = files[n_train:]

        copy_files(train_files, src_cls_dir, os.path.join(TRAIN_DIR, cls))
        copy_files(test_files,  src_cls_dir, os.path.join(TEST_DIR,  cls))

        total_train += n_train
        total_test  += n_test

        print(f"  [{cls:6s}]  total={len(files):4d}  "
              f"train={n_train:4d}  test={n_test:3d}")

    print("=" * 60)
    print(f"  TOTAL   train={total_train}   test={total_test}   "
          f"grand={total_train + total_test}")
    print("=" * 60)
    print("\n[OK] Dataset split complete!")
    print(f"     Train folder : {TRAIN_DIR}")
    print(f"     Test  folder : {TEST_DIR}")


if __name__ == '__main__':
    main()
