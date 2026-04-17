"""Quick test of the Flask /api/predict endpoint."""
import requests
import os

test_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'test', 'A-')
test_img = os.path.join(test_dir, os.listdir(test_dir)[0])

print(f"Testing: {os.path.basename(test_img)} ({os.path.getsize(test_img)} bytes)")

with open(test_img, 'rb') as f:
    resp = requests.post(
        'http://127.0.0.1:5000/api/predict',
        files={'fingerprint': ('test.BMP', f, 'image/bmp')},
        timeout=30
    )

print(f"Status: {resp.status_code}")
data = resp.json()

if resp.status_code == 200:
    bg = data.get('predicted_blood_group', '?')
    conf = data.get('confidence', 0)
    print(f"Blood Group: {bg}")
    print(f"Confidence:  {conf}%")
    print("All Probabilities:")
    for k, v in data.get('all_probabilities', {}).items():
        print(f"  {k}: {v}%")
    print("\nSUCCESS - Flask ML API is working!")
else:
    err = data.get('error', 'Unknown error')
    print(f"Error: {err}")
    print("\nFAILED - Check Flask terminal for traceback.")
