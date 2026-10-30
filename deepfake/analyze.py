#!/usr/bin/env python3
"""Deepfake analysis for one image or video.

Usage:  python3 deepfake/analyze.py /path/to/file [--frames 32]

Prints exactly one JSON object as the last line of stdout. On success:
  {"prediction": "FAKE", "fake_probability": 0.91, "confidence": 0.91,
   "avg_probability": 0.91, "media_type": "video", "frames_analyzed": 32,
   "faces_found": 30, "face_detected": true, "note": null}
On failure (exit code 1):
  {"error": "..."}

fake_probability is the model's probability that the media is manipulated.
confidence is the strength of the verdict: max(p, 1 - p).
Needs no database, blockchain or login. Works from any working directory.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS = os.path.join(HERE, "weights", "Meso4_DF.h5")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# MesoNet's output is the probability the face is REAL (class 1); deepfakes are class 0.
MODEL_OUTPUT_IS_REAL = True


def fail(msg):
    print(json.dumps({"error": str(msg)}))
    sys.exit(1)


def load_model():
    if not os.path.isfile(WEIGHTS):
        fail(f"Model weights not found: {WEIGHTS}")
    sys.path.insert(0, HERE)
    try:
        from classifiers import Meso4
    except Exception as e:  # tensorflow/keras import problems
        fail(f"Could not load model code: {e}")
    model = Meso4()
    model.load(WEIGHTS)
    return model.model


def face_crop(frame, cascade, cv2):
    """Largest detected face with some padding, or None."""
    h, w = frame.shape[:2]
    scale = 640.0 / max(h, w) if max(h, w) > 640 else 1.0
    small = cv2.resize(frame, None, fx=scale, fy=scale) if scale != 1.0 else frame
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    min_side = max(30, min(small.shape[:2]) // 10)
    boxes = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side))
    if len(boxes) == 0:
        return None
    x, y, bw, bh = max(boxes, key=lambda b: b[2] * b[3])
    x, y, bw, bh = [int(v / scale) for v in (x, y, bw, bh)]
    pad = int(0.2 * max(bw, bh))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(w, x + bw + pad), min(h, y + bh + pad)
    return frame[y0:y1, x0:x1]


def read_frames(path, ext, max_frames, cv2):
    """Yield up to max_frames BGR frames, evenly spread across a video (or the single image)."""
    if ext in IMAGE_EXTS:
        img = cv2.imread(path)
        if img is None:
            fail("Could not read image (unsupported or corrupt file)")
        yield img
        return

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        fail("Could not open video (unsupported or corrupt file)")
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, total // max_frames) if total > 0 else 10
    taken, i = 0, 0
    while taken < max_frames:
        if not cap.grab():
            break
        if i % step == 0:
            ok, frame = cap.retrieve()
            if ok:
                taken += 1
                yield frame
        i += 1
    cap.release()


def analyze(path, max_frames=32):
    if not os.path.isfile(path):
        fail(f"File not found: {path}")
    ext = os.path.splitext(path)[1].lower()
    if ext not in IMAGE_EXTS and ext not in VIDEO_EXTS:
        fail(f"Unsupported file type: {ext or 'unknown'}")

    try:
        import cv2
        import numpy as np
    except ImportError as e:
        fail(f"Missing dependency ({e}). Run: pip install -r deepfake/requirements.txt")

    model = load_model()
    cascade = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))

    face_inputs, full_inputs, n_frames = [], [], 0
    for frame in read_frames(path, ext, max_frames, cv2):
        n_frames += 1
        crop = None if cascade.empty() else face_crop(frame, cascade, cv2)
        src = crop if crop is not None and crop.size else frame
        rgb = cv2.cvtColor(cv2.resize(src, (256, 256)), cv2.COLOR_BGR2RGB) / 255.0  # model was trained on RGB
        (face_inputs if (crop is not None and crop.size) else full_inputs).append(rgb)

    if n_frames == 0:
        fail("No frames could be read from the file")

    # The model is trained on faces, so use face crops whenever any were found.
    face_detected = len(face_inputs) > 0
    batch = face_inputs if face_detected else full_inputs
    out = model.predict(np.array(batch, dtype="float32"), verbose=0).reshape(-1)
    fake_scores = (1.0 - out) if MODEL_OUTPUT_IS_REAL else out
    p_fake = float(np.mean(fake_scores))

    return {
        "prediction": "FAKE" if p_fake >= 0.5 else "REAL",
        "fake_probability": round(p_fake, 6),
        "confidence": round(max(p_fake, 1.0 - p_fake), 6),
        "avg_probability": round(p_fake, 6),  # kept for the evidence_metadata column
        "media_type": "image" if ext in IMAGE_EXTS else "video",
        "frames_analyzed": len(batch),
        "faces_found": len(face_inputs),
        "face_detected": face_detected,
        "note": None if face_detected else "No face was detected, so the whole frame was analyzed. This model is face-based; treat the result as low reliability.",
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("media")
    p.add_argument("--frames", type=int, default=32, help="max frames to sample from a video")
    a = p.parse_args()
    try:
        print(json.dumps(analyze(a.media, max(1, a.frames))))
    except SystemExit:
        raise
    except Exception as e:
        fail(e)
