from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import cv2
from huggingface_hub import hf_hub_download
import os

app = Flask(__name__, static_folder='frontend')
CORS(app)

# Load model using absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
from huggingface_hub import hf_hub_download

model_path = hf_hub_download(
    repo_id="amarbhise31/fake-image-detector",
    filename="model.h5",              # must match exact filename you uploaded
    token=os.environ.get("HF_TOKEN")
)
model = load_model(model_path)

# ── Serve Frontend ────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('frontend', filename)

# ── Helpers ───────────────────────────────────────────────────
def preprocess(img):
    img = img.convert("RGB")
    img = img.resize((32, 32))
    img = np.array(img) / 32.0
    img = np.expand_dims(img, axis=0)
    return img

def explain(img):
    img_rgb = img.convert("RGB")
    img_np  = np.array(img_rgb)
    gray    = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    explanation = []

    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur < 50:
        explanation.append("Image looks overly smooth (possible AI generation)")

    if np.mean(gray) > 200:
        explanation.append("Unusual brightness/lighting detected")

    std_dev = np.std(img_np)
    if std_dev < 30:
        explanation.append("Low color variation — possible synthetic texture")

    if not explanation:
        explanation.append("No strong fake indicators found")

    return explanation

# ── Detect Route ──────────────────────────────────────────────
@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        img       = Image.open(file)
        processed = preprocess(img)
        pred      = model.predict(processed)[0][0]

        if pred > 0.5:
            result     = "Fake"
            confidence = float(pred * 100)
        else:
            result     = "Real"
            confidence = float((1 - pred) * 100)

        explanation = explain(img)

        return jsonify({
            "result":      result,
            "confidence":  round(confidence, 2),
            "explanation": explanation
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# ── Health Check ──────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=7860)