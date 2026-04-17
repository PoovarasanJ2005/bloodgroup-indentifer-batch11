"""
Download real BMP images from GitHub LFS.
Reads each LFS pointer file, extracts the SHA256 OID,
and downloads the actual image from GitHub's LFS server.
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error

REPO         = "PoovarasanJ2005/bloodgroup-identifer"
LFS_API      = f"https://github.com/{REPO}.git/info/lfs/objects/batch"
SOURCE_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_blood_group")
BATCH_SIZE   = 50   # how many OIDs to request per LFS batch

# ── helpers ───────────────────────────────────────────────────────────────────

def read_pointer(path):
    """Return (oid, size) if file is a Git LFS pointer, else None."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read(200)
        if "git-lfs" not in text:
            return None
        m_oid  = re.search(r"oid sha256:([0-9a-f]{64})", text)
        m_size = re.search(r"size (\d+)", text)
        if m_oid and m_size:
            return m_oid.group(1), int(m_size.group(1))
    except Exception:
        pass
    return None


def batch_request(objects):
    """Ask GitHub LFS for download URLs for a list of {oid, size} dicts."""
    body = json.dumps({
        "operation": "download",
        "transfers": ["basic"],
        "objects": objects,
        "ref": {"name": "refs/heads/main"},
    }).encode()

    req = urllib.request.Request(
        LFS_API,
        data=body,
        headers={
            "Accept":       "application/vnd.git-lfs+json",
            "Content-Type": "application/vnd.git-lfs+json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [LFS API error] {e}")
        return None


def download_file(url, dest_path, size):
    """Download url → dest_path."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "git-lfs"})
        with urllib.request.urlopen(req, timeout=60) as r, \
             open(dest_path, "wb") as f:
            downloaded = 0
            while True:
                chunk = r.read(32768)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
        return True
    except Exception as e:
        print(f"    [download error] {e}")
        return False

# ── collect all pointer files ─────────────────────────────────────────────────

def collect_pointers():
    pointers = []   # list of (path, oid, size)
    for cls in sorted(os.listdir(SOURCE_DIR)):
        cls_dir = os.path.join(SOURCE_DIR, cls)
        if not os.path.isdir(cls_dir):
            continue
        for fname in sorted(os.listdir(cls_dir)):
            path = os.path.join(cls_dir, fname)
            info = read_pointer(path)
            if info:
                oid, size = info
                pointers.append((path, oid, size))
    return pointers

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  GITHUB LFS IMAGE DOWNLOADER")
    print(f"  Repo : {REPO}")
    print("=" * 60)

    pointers = collect_pointers()
    if not pointers:
        print("[INFO] No LFS pointer files found — images may already be real.")
        return

    # Check sample to see if already downloaded
    sample_path, sample_oid, sample_size = pointers[0]
    if os.path.getsize(sample_path) == sample_size:
        print("[INFO] Images appear to already be real files. Nothing to do.")
        return

    total     = len(pointers)
    success   = 0
    failed    = 0

    print(f"\n[INFO] Found {total} LFS pointer files to download.\n")

    # Process in batches
    for batch_start in range(0, total, BATCH_SIZE):
        batch       = pointers[batch_start : batch_start + BATCH_SIZE]
        batch_end   = batch_start + len(batch)
        print(f"  Batch {batch_start+1}–{batch_end} of {total}...")

        objects = [{"oid": oid, "size": size} for _, oid, size in batch]
        response = batch_request(objects)

        if not response or "objects" not in response:
            print("  [ERROR] LFS batch request failed.")
            failed += len(batch)
            continue

        # Build oid → download URL map
        url_map = {}
        for obj in response["objects"]:
            oid = obj.get("oid", "")
            dl  = obj.get("actions", {}).get("download", {})
            href = dl.get("href", "")
            if href:
                url_map[oid] = href

        # Download each file
        for path, oid, size in batch:
            url = url_map.get(oid, "")
            if not url:
                print(f"    [SKIP] No URL for {os.path.basename(path)}")
                failed += 1
                continue

            ok = download_file(url, path, size)
            if ok:
                success += 1
                if success % 100 == 0:
                    print(f"    Downloaded {success}/{total}...")
            else:
                failed += 1

    print("\n" + "=" * 60)
    print(f"  DONE — Downloaded: {success}  Failed: {failed}  Total: {total}")
    print("=" * 60)

    if success > 0:
        print("\n[NEXT] Now re-run the dataset split:")
        print("       python split_dataset.py")
        print("       Then train: cd ../ml-model && python train_model.py")


if __name__ == "__main__":
    main()
