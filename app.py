from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import cv2
import os

app = Flask(__name__)
CORS(app)

# Use absolute path so Flask can be run from anywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = load_model(os.path.join(BASE_DIR, "fake_image_detector.h5"))

def preprocess(img):
    # Always convert to RGB to avoid RGBA/grayscale crashes
    img = img.convert("RGB")
    img = img.resize((224, 224))
    img = np.array(img) / 255.0
    img = np.expand_dims(img, axis=0)
    return img

def explain(img):
    # Ensure RGB for OpenCV too
    img_rgb = img.convert("RGB")
    img_np = np.array(img_rgb)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    explanation = []

    if blur < 50:
        explanation.append("Image looks overly smooth (possible AI generation)")

    if np.mean(gray) > 200:
        explanation.append("Unusual brightness/lighting detected")

    # Check for unnatural color uniformity
    std_dev = np.std(img_np)
    if std_dev < 30:
        explanation.append("Low color variation — possible synthetic texture")

    if not explanation:
        explanation.append("No strong fake indicators found")

    return explanation

@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        img = Image.open(file)

        processed = preprocess(img)
        pred = model.predict(processed)[0][0]

        if pred > 0.5:
            result = "Fake"
            confidence = float(pred * 100)
        else:
            result = "Real"
            confidence = float((1 - pred) * 100)

        explanation = explain(img)

        return jsonify({
            "result": result,
            "confidence": round(confidence, 2),
            "explanation": explanation
        })

    except Exception as e:
        print(f"Error during detection: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=7860)