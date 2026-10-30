#!/usr/bin/env python3
"""Deepfake analysis for one video file.

Usage:  python3 deepfake/analyze.py /path/to/video.mp4 [--every 10]

Prints exactly one JSON object as the last line of stdout:
  {"avg_probability": 0.12, "prediction": "REAL", "frames_analyzed": 31}
or, on failure (exit code 1):
  {"error": "..."}
Needs no database, blockchain or login. Works from any working directory.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS = os.path.join(HERE, "weights", "Meso4_DF.h5")  # absolute, independent of cwd
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")


def fail(msg):
    print(json.dumps({"error": str(msg)}))
    sys.exit(1)


def analyze(video_path, every=10):
    if not os.path.isfile(video_path):
        fail(f"Video not found: {video_path}")
    if not os.path.isfile(WEIGHTS):
        fail(f"Model weights not found: {WEIGHTS}")

    try:
        import cv2
        import numpy as np
    except ImportError as e:
        fail(f"Missing dependency ({e}). Run: pip install -r deepfake/requirements.txt")

    sys.path.insert(0, HERE)
    try:
        from classifiers import Meso4
    except Exception as e:  # tensorflow/keras import problems
        fail(f"Could not load model code: {e}")

    model = Meso4()
    model.load(WEIGHTS)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        fail("Could not open video (unsupported or corrupt file)")

    scores, n = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if n % every == 0:
            x = cv2.resize(frame, (256, 256)) / 255.0
            scores.append(float(model.model.predict(np.expand_dims(x, 0), verbose=0)[0][0]))
        n += 1
    cap.release()

    if not scores:
        fail("No frames could be read from the video")

    avg = sum(scores) / len(scores)
    return {
        "avg_probability": round(avg, 6),
        "prediction": "FAKE" if avg > 0.5 else "REAL",
        "frames_analyzed": len(scores),
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--every", type=int, default=10, help="analyze every Nth frame")
    a = p.parse_args()
    try:
        print(json.dumps(analyze(a.video, max(1, a.every))))
    except SystemExit:
        raise
    except Exception as e:
        fail(e)
