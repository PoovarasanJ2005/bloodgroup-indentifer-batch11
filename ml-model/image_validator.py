"""
Image Validation Module — Strict Fingerprint-Only Filter
=========================================================
Philosophy: BLOCK everything that doesn't look EXACTLY like a fingerprint.
Uses 7 gates — image must pass ALL to proceed to prediction.
"""

import numpy as np
import cv2
from PIL import Image
import io


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 1: COLOR — Any color at all = not a fingerprint
# ═══════════════════════════════════════════════════════════════════════════════

def _check_color(bgr):
    """Reject any image with even slight color. Fingerprints are pure grayscale."""
    if bgr is None:
        return False, 0.0

    # YCrCb is more robust than HSV for detecting color in dark images
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    cr = ycrcb[:, :, 1].astype(np.float64)
    cb = ycrcb[:, :, 2].astype(np.float64)

    # Pure gray: Cr≈128, Cb≈128. Any deviation = color present
    cr_dev = float(np.std(cr)) + abs(float(np.mean(cr)) - 128)
    cb_dev = float(np.std(cb)) + abs(float(np.mean(cb)) - 128)
    chroma_score = cr_dev + cb_dev

    # Also check HSV saturation
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mean_sat = float(np.mean(hsv[:, :, 1]))

    # Very strict: fingerprint scanners produce nearly zero chroma
    is_color = chroma_score > 15 or mean_sat > 12
    return is_color, round(chroma_score, 2)


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 2: FACE / PERSON DETECTION — Multiple cascades + skin detection
# ═══════════════════════════════════════════════════════════════════════════════

def _check_person(gray, bgr):
    """Detect human presence using cascades + skin color + smooth gradient areas."""
    try:
        cascades = [
            'haarcascade_frontalface_default.xml',
            'haarcascade_profileface.xml',
            'haarcascade_frontalface_alt2.xml',
            'haarcascade_upperbody.xml',
            'haarcascade_eye.xml',
        ]
        for cascade_name in cascades:
            try:
                cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + cascade_name
                )
                detections = cascade.detectMultiScale(
                    gray, scaleFactor=1.05, minNeighbors=3, minSize=(20, 20)
                )
                if len(detections) > 0:
                    return True, f"Detected via {cascade_name}"
            except Exception:
                continue

        # Skin-tone detection (works even in B&W-ish photos with slight color)
        if bgr is not None:
            ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
            # Skin tone range in YCrCb
            skin_mask = cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127))
            skin_ratio = float(np.sum(skin_mask > 0) / skin_mask.size)
            if skin_ratio > 0.15:
                return True, "Significant skin-tone regions detected"

        # Large smooth gradient detection — person photos have smooth skin/clothing
        # Fingerprints NEVER have large smooth gradients
        block = 32
        h, w = gray.shape
        smooth_blocks = 0
        total_blocks = 0
        for y in range(0, h - block, block):
            for x in range(0, w - block, block):
                patch = gray[y:y+block, x:x+block].astype(np.float64)
                local_var = np.var(patch)
                total_blocks += 1
                if local_var < 100:  # Very smooth patch
                    smooth_blocks += 1

        smooth_ratio = smooth_blocks / max(total_blocks, 1)
        if smooth_ratio > 0.35:
            return True, "Large smooth/gradient areas (not fingerprint texture)"

    except Exception:
        pass
    return False, ""


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 3: EDGE DISTRIBUTION — Fingerprint edges must be EVERYWHERE
# ═══════════════════════════════════════════════════════════════════════════════

def _check_edge_distribution(gray):
    """
    Fingerprints have fine edges distributed uniformly across the entire image.
    Ornaments/borders have edges only in some areas. Posters have edges in text areas.
    """
    edges = cv2.Canny(gray, 50, 150)
    h, w = edges.shape

    # Divide into 4x4 grid and check edge density in each cell
    grid = 4
    cell_h, cell_w = h // grid, w // grid
    densities = []
    for gy in range(grid):
        for gx in range(grid):
            cell = edges[gy*cell_h:(gy+1)*cell_h, gx*cell_w:(gx+1)*cell_w]
            density = float(np.sum(cell > 0)) / cell.size
            densities.append(density)

    overall_density = float(np.sum(edges > 0)) / edges.size
    active_cells = sum(1 for d in densities if d > 0.02)
    density_std = float(np.std(densities))
    density_mean = float(np.mean(densities))
    uniformity = 1.0 - (density_std / (density_mean + 1e-10))

    # Fingerprints: edges in nearly all cells, moderate overall density
    # Border ornament: edges in 2-4 cells only, rest empty
    # Person photo: edges scattered but not fine/dense
    passed = (
        active_cells >= 10 and          # At least 10/16 cells have edges
        0.03 < overall_density < 0.45 and  # Moderate edge density
        uniformity > 0.15               # Reasonably uniform distribution
    )
    return passed, active_cells, round(overall_density, 4), round(uniformity, 3)


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 4: STRAIGHT LINE REJECTION — Fingerprints have NO straight lines
# ═══════════════════════════════════════════════════════════════════════════════

def _check_straight_lines(gray):
    """Detect genuinely long straight lines (poster borders, text underlines).
    Fingerprint ridges produce many SHORT approximately-straight segments — that's
    normal. Only flag images with many LONG continuous straight lines."""
    edges = cv2.Canny(gray, 50, 150)
    h, w = gray.shape
    # Only detect lines longer than 1/3 of image — these are truly straight
    min_len = min(h, w) // 3
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=80,
                            minLineLength=min_len, maxLineGap=5)
    num_lines = 0 if lines is None else len(lines)
    # Need many long straight lines to reject (fingerprints might have 1-3 edge artifacts)
    return num_lines > 15, num_lines


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 5: RIDGE PATTERN VERIFICATION — The core fingerprint check
# ═══════════════════════════════════════════════════════════════════════════════

def _verify_ridge_pattern(gray):
    """
    Verify fingerprint-specific ridge patterns using:
    1. Gabor filter directional response
    2. FFT ridge frequency in specific band
    3. Orientation field smoothness
    4. Ridge spacing consistency
    Returns (is_fingerprint, score, details)
    """
    scores = {}

    # --- Gabor directionality ---
    gabor_responses = []
    for theta_deg in range(0, 180, 15):
        theta = np.deg2rad(theta_deg)
        kernel = cv2.getGaborKernel((21, 21), sigma=4.0, theta=theta,
                                     lambd=10.0, gamma=0.5, psi=0)
        filtered = cv2.filter2D(gray, cv2.CV_64F, kernel)
        gabor_responses.append(float(np.mean(np.abs(filtered))))

    gabor_std = float(np.std(gabor_responses))
    gabor_mean = float(np.mean(gabor_responses))
    directionality = gabor_std / (gabor_mean + 1e-10)
    scores['directionality'] = directionality

    # --- Ridge density (orientation coherence) ---
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gxx = cv2.GaussianBlur(gx*gx, (15, 15), 3)
    gyy = cv2.GaussianBlur(gy*gy, (15, 15), 3)
    gxy = cv2.GaussianBlur(gx*gy, (15, 15), 3)
    coherence = np.sqrt((gxx-gyy)**2 + 4*gxy**2) / (gxx+gyy+1e-10)
    ridge_density = float(np.mean(coherence))
    scores['ridge_density'] = ridge_density

    # --- FFT frequency band check ---
    f = np.fft.fft2(gray.astype(np.float64))
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)
    h, w = magnitude.shape
    cy, cx = h//2, w//2
    magnitude[cy-3:cy+3, cx-3:cx+3] = 0

    # Fingerprint ridges produce a specific annular peak in FFT
    max_r = min(cx, cy)
    Y, X = np.ogrid[:h, :w]
    R = np.sqrt((X-cx)**2 + (Y-cy)**2).astype(int)
    radial = np.zeros(max_r)
    for r in range(max_r):
        mask = R == r
        if np.any(mask):
            radial[r] = np.mean(magnitude[mask])

    # Fingerprints peak in mid-frequency range (1/6 to 1/2 of max radius)
    low = max_r // 8
    mid_start = max_r // 6
    mid_end = max_r // 2
    high_start = int(max_r * 0.6)

    mid_energy = np.sum(radial[mid_start:mid_end])
    total_energy = np.sum(radial) + 1e-10
    low_energy = np.sum(radial[1:low])
    high_energy = np.sum(radial[high_start:])

    freq_ratio = float(mid_energy / total_energy)
    scores['freq_ratio'] = freq_ratio

    # Check for clear annular peak (fingerprint signature)
    if mid_end > mid_start:
        peak_val = float(np.max(radial[mid_start:mid_end]))
        mean_val = float(np.mean(radial[1:])) + 1e-10
        peak_prominence = peak_val / mean_val
    else:
        peak_prominence = 0
    scores['peak_prominence'] = peak_prominence

    # --- Orientation field smoothness ---
    block_sz = 16
    h, w = gray.shape
    orientations = np.full((h//block_sz, w//block_sz), np.nan)
    for by in range(h // block_sz):
        for bx in range(w // block_sz):
            blk = gray[by*block_sz:(by+1)*block_sz, bx*block_sz:(bx+1)*block_sz]
            bx_ = cv2.Sobel(blk, cv2.CV_64F, 1, 0, ksize=3)
            by_ = cv2.Sobel(blk, cv2.CV_64F, 0, 1, ksize=3)
            angle = 0.5 * np.arctan2(2*np.sum(bx_*by_), np.sum(bx_*bx_ - by_*by_))
            coh = np.sqrt(np.sum(bx_*bx_ - by_*by_)**2 + 4*np.sum(bx_*by_)**2)
            coh /= (np.sum(bx_*bx_) + np.sum(by_*by_) + 1e-10)
            if coh > 0.25:
                orientations[by, bx] = angle

    # Compute orientation smoothness (neighbors should have similar angles)
    valid = ~np.isnan(orientations)
    if np.sum(valid) > 8:
        diffs = []
        rows, cols = orientations.shape
        for r in range(rows-1):
            for c in range(cols-1):
                if valid[r,c] and valid[r,c+1]:
                    d = abs(orientations[r,c] - orientations[r,c+1])
                    d = min(d, np.pi - d)
                    diffs.append(d)
                if valid[r,c] and valid[r+1,c]:
                    d = abs(orientations[r,c] - orientations[r+1,c])
                    d = min(d, np.pi - d)
                    diffs.append(d)
        if diffs:
            orient_smoothness = 1.0 - float(np.mean(diffs)) / (np.pi/2)
        else:
            orient_smoothness = 0.0
    else:
        orient_smoothness = 0.0
    scores['orient_smoothness'] = orient_smoothness

    valid_ratio = float(np.sum(valid) / valid.size)
    scores['orient_coverage'] = valid_ratio

    # --- SCORING (balanced: strict on non-fingerprints, fair on real ones) ---
    fp_score = 0.0

    if directionality > 0.15:
        fp_score += 0.18
    elif directionality > 0.08:
        fp_score += 0.09
    if ridge_density > 0.30:
        fp_score += 0.18
    elif ridge_density > 0.20:
        fp_score += 0.09
    if 0.25 < freq_ratio < 0.70:
        fp_score += 0.16
    elif 0.18 < freq_ratio < 0.75:
        fp_score += 0.08
    if peak_prominence > 1.5:
        fp_score += 0.14
    elif peak_prominence > 1.2:
        fp_score += 0.07
    if orient_smoothness > 0.4:
        fp_score += 0.18
    elif orient_smoothness > 0.25:
        fp_score += 0.09
    if valid_ratio > 0.3:
        fp_score += 0.16
    elif valid_ratio > 0.2:
        fp_score += 0.08

    return fp_score >= 0.55, round(fp_score * 100, 1), scores


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 6: AI-GENERATED FINGERPRINT DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def detect_ai_generated(image_bytes):
    """Detect synthetic/AI-generated fingerprints."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        gray = np.array(img.resize((256, 256)), dtype=np.uint8)

        ai_score = 0.0

        # Noise analysis — AI images are too clean
        blurred = cv2.GaussianBlur(gray.astype(np.float64), (5, 5), 1.5)
        noise = gray.astype(np.float64) - blurred
        noise_std = float(np.std(noise))
        if noise_std < 2.0:
            ai_score += 0.3

        # Ridge uniformity — AI fingerprints have unnaturally uniform spacing
        block_sz = 32
        spacings = []
        h, w = gray.shape
        for y in range(0, h-block_sz, block_sz):
            for x in range(0, w-block_sz, block_sz):
                blk = gray[y:y+block_sz, x:x+block_sz]
                f = np.fft.fft2(blk.astype(np.float64))
                mag = np.abs(np.fft.fftshift(f))
                mag[block_sz//2, block_sz//2] = 0
                idx = np.unravel_index(np.argmax(mag), mag.shape)
                dist = np.sqrt((idx[0]-block_sz//2)**2 + (idx[1]-block_sz//2)**2)
                if dist > 1:
                    spacings.append(dist)
        if len(spacings) > 3:
            cv_spacing = float(np.std(spacings) / (np.mean(spacings) + 1e-10))
            if cv_spacing < 0.12:
                ai_score += 0.35

        # Histogram entropy
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        hist = hist / (hist.sum() + 1e-10)
        entropy = float(-np.sum(hist * np.log2(hist + 1e-10)))
        if entropy > 7.5:
            ai_score += 0.2

        # Kurtosis of noise
        kurt = float(np.mean((noise - np.mean(noise))**4) /
                      (np.std(noise)**4 + 1e-10) - 3)
        if abs(kurt) > 10:
            ai_score += 0.15

        is_ai = ai_score >= 0.55
        reason = ("AI-generated fingerprint detected." if is_ai
                  else "Passes authenticity check.")
        return is_ai, round(ai_score * 100, 1), reason
    except Exception as e:
        return False, 0.0, f"AI detection failed: {e}"


# ═══════════════════════════════════════════════════════════════════════════════
# GATE 7: QUALITY ASSESSMENT
# ═══════════════════════════════════════════════════════════════════════════════

def assess_quality(image_bytes):
    """Check image quality for reliable prediction."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        gray = np.array(img, dtype=np.uint8)
        issues = []
        h, w = gray.shape

        if h < 64 or w < 64:
            issues.append("Image too small (min 64×64).")
        if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 50:
            issues.append("Image too blurry.")
        if float(np.std(gray)) < 15:
            issues.append("Very low contrast.")
        mean_b = float(np.mean(gray))
        if mean_b < 30:
            issues.append("Image too dark.")
        elif mean_b > 240:
            issues.append("Image overexposed.")

        score = max(0.0, 1.0 - len(issues) * 0.25)
        return len(issues) == 0, round(score * 100, 1), issues
    except Exception as e:
        return False, 0.0, [f"Quality check failed: {e}"]


# ═══════════════════════════════════════════════════════════════════════════════
# SMART IMAGE TYPE CLASSIFIER — Tell user what they uploaded
# ═══════════════════════════════════════════════════════════════════════════════

def classify_image_type(image_bytes):
    """
    Classify what kind of image was uploaded so we can tell
    the user specifically what they sent instead of "not a fingerprint."
    Returns: (image_type: str, user_message: str, icon: str)
    """
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        is_color = pil_img.mode in ('RGB', 'RGBA')
        gray = np.array(pil_img.convert('L').resize((256, 256)), dtype=np.uint8)
        bgr = None
        if is_color:
            rgb = np.array(pil_img.convert('RGB').resize((256, 256)), dtype=np.uint8)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception:
        return ("unreadable",
                "We couldn't read this file. Try a JPEG or PNG fingerprint scan.",
                "❌")

    # 1. Face / person photo
    if bgr is not None:
        cascades_to_try = [
            'haarcascade_frontalface_default.xml',
            'haarcascade_upperbody.xml',
            'haarcascade_eye.xml',
        ]
        for c in cascades_to_try:
            try:
                det = cv2.CascadeClassifier(cv2.data.haarcascades + c)
                if len(det.detectMultiScale(gray, 1.05, 3, minSize=(20, 20))) > 0:
                    return ("person_photo",
                            "You uploaded a photo of a person. Please upload a fingerprint "
                            "scan — a close-up grayscale image of a fingertip captured by "
                            "a scanner or inkpad.",
                            "🧑")
            except Exception:
                continue
        # Skin tone check
        ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
        skin = cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127))
        if float(np.sum(skin > 0) / skin.size) > 0.15:
            return ("person_photo",
                    "This image appears to contain a person's skin. "
                    "Upload a fingerprint scan only.",
                    "🧑")

    # 2. Color photo (nature, food, objects, posters)
    if bgr is not None:
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        mean_sat = float(np.mean(hsv[:, :, 1]))
        if mean_sat > 20:
            return ("color_photo",
                    "You uploaded a color photo. Fingerprint scanners produce "
                    "grayscale images. Please scan your fingerprint and upload "
                    "the grayscale result.",
                    "🖼️")

    # 3. QR code / barcode (regular grid pattern in FFT)
    f = np.fft.fft2(gray.astype(np.float64))
    mag = np.abs(np.fft.fftshift(f))
    h, w = mag.shape
    mag[h // 2 - 5:h // 2 + 5, w // 2 - 5:w // 2 + 5] = 0
    p99 = np.percentile(mag, 99)
    col_peaks = np.sum(mag[h // 2 - 10:h // 2 + 10, :] > p99)
    row_peaks = np.sum(mag[:, w // 2 - 10:w // 2 + 10] > p99)
    if col_peaks > 12 and row_peaks > 12:
        return ("qr_barcode",
                "This looks like a QR code or barcode. "
                "Please upload a fingerprint scan instead.",
                "📷")

    # 4. Document / screenshot (many long straight lines)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100,
                            minLineLength=gray.shape[0] // 3, maxLineGap=10)
    if lines is not None and len(lines) > 10:
        return ("document",
                "This looks like a document, screenshot, or printed page. "
                "Please upload a close-up scan of a fingertip.",
                "📄")

    # 5. Blank / solid color
    if float(np.std(gray)) < 12:
        return ("blank_or_solid",
                "This image is nearly blank or a solid color. "
                "Please upload a fingerprint scan.",
                "⬜")

    # 6. Generic fallback
    return ("unknown_image",
            "This image doesn't appear to be a fingerprint. "
            "Please upload a close-up grayscale scan of a fingertip "
            "(JPEG, PNG, BMP, or TIFF from a fingerprint scanner).",
            "🔍")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN VALIDATION PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def validate_image(image_bytes):
    """Run the full validation pipeline with smart rejection messages."""
    result = {
        'is_valid': False,
        'is_fingerprint': False,
        'is_ai_generated': False,
        'quality_ok': False,
        'fingerprint_confidence': 0.0,
        'ai_confidence': 0.0,
        'quality_score': 0.0,
        'rejection_reason': None,
        'detected_image_type': None,
        'rejection_icon': None,
        'warnings': [],
    }

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        is_color_img = pil_img.mode in ('RGB', 'RGBA', 'CMYK')
        gray = np.array(pil_img.convert('L').resize((256, 256)), dtype=np.uint8)
        bgr = None
        if is_color_img:
            rgb = np.array(pil_img.convert('RGB').resize((256, 256)), dtype=np.uint8)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception as e:
        result['rejection_reason'] = f"Cannot read image: {e}"
        result['rejection_icon'] = '❌'
        result['detected_image_type'] = 'unreadable'
        return result

    # ── GATE 1: Color check ──
    if bgr is not None:
        is_color, chroma = _check_color(bgr)
        if is_color:
            img_type, msg, icon = classify_image_type(image_bytes)
            result['rejection_reason'] = msg
            result['detected_image_type'] = img_type
            result['rejection_icon'] = icon
            result['fingerprint_confidence'] = 2.0
            return result

    # ── GATE 2: Person/face detection ──
    is_person, person_reason = _check_person(gray, bgr)
    if is_person:
        img_type, msg, icon = classify_image_type(image_bytes)
        result['rejection_reason'] = msg
        result['detected_image_type'] = img_type
        result['rejection_icon'] = icon
        result['fingerprint_confidence'] = 3.0
        return result

    # ── GATE 3: Edge distribution ──
    edges_ok, active_cells, edge_density, uniformity = _check_edge_distribution(gray)
    if not edges_ok:
        img_type, msg, icon = classify_image_type(image_bytes)
        result['rejection_reason'] = msg
        result['detected_image_type'] = img_type
        result['rejection_icon'] = icon
        result['fingerprint_confidence'] = 5.0
        return result

    # ── GATE 4: Ridge pattern verification ──
    is_fp, fp_conf, _ = _verify_ridge_pattern(gray)
    result['is_fingerprint'] = is_fp
    result['fingerprint_confidence'] = fp_conf

    if not is_fp:
        img_type, msg, icon = classify_image_type(image_bytes)
        result['rejection_reason'] = msg
        result['detected_image_type'] = img_type
        result['rejection_icon'] = icon
        return result

    # ── GATE 5: AI detection ──
    is_ai, ai_conf, _ = detect_ai_generated(image_bytes)
    result['is_ai_generated'] = is_ai
    result['ai_confidence'] = ai_conf
    if is_ai:
        result['rejection_reason'] = (
            "This fingerprint appears AI-generated. "
            "Only authentic fingerprint scans are accepted."
        )
        result['detected_image_type'] = 'ai_generated'
        result['rejection_icon'] = '🤖'
        return result

    # ── GATE 6: Quality ──
    q_ok, q_score, issues = assess_quality(image_bytes)
    result['quality_ok'] = q_ok
    result['quality_score'] = q_score
    result['warnings'] = issues
    result['is_valid'] = True
    return result

