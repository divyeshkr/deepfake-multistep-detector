import sys
import json
import numpy as np
import os
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

# Mock implementation if libraries are missing (for initial setup/testing without full python env)
try:
    import librosa
    import joblib
    from sklearn.svm import SVC
    from sklearn.preprocessing import StandardScaler
except Exception as e:
    print(json.dumps({"error": f"Dependency error: {str(e)}. Please ensure librosa, scikit-learn, joblib, numpy are installed."}))
    sys.exit(1)

# Constants
MODEL_FILE = "deepfake_detector_svm (2).pkl"
SCALER_FILE = "scaler (2).pkl"

def extract_features(file_path):
    try:
        # Load audio
        y, sr = librosa.load(file_path, duration=3, offset=0.5)
        
        # MFCC extraction (matching the screenshot logic)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        delta = librosa.feature.delta(mfcc)
        delta2 = librosa.feature.delta(mfcc, order=2)
        
        combined = np.vstack([mfcc, delta, delta2])
        
        # Mean across time axis
        return np.mean(combined, axis=1)
    except Exception as e:
        return None

def cosine_similarity(a, b):
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    num = float(np.dot(a, b))
    den = float(np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
    return num / den

def stage1_detect(file_path):
    if not os.path.exists(MODEL_FILE) or not os.path.exists(SCALER_FILE):
        # Fallback for demo if models aren't uploaded yet
        # In a real scenario, this should error out, but for the preview to not crash before upload:
        return {"status": "error", "message": "Model files not found. Please upload 'deepfake_detector_svm (2).pkl' and 'scaler (2).pkl'."}

    try:
        clf = joblib.load(MODEL_FILE)
        scaler = joblib.load(SCALER_FILE)
        
        features = extract_features(file_path)
        if features is None:
            return {"status": "error", "message": "Could not extract features"}
            
        # Scale features
        features_scaled = scaler.transform([features])
        
        # Predict
        prediction = clf.predict(features_scaled)
        # Assuming 0 = Real, 1 = Fake or similar. 
        # Based on screenshot, it prints "Real" or "Deepfake".
        # Let's assume the model returns string or 0/1. 
        # If it returns 0/1, we need to know mapping. 
        # Usually 1 is positive class (Deepfake). 
        # Let's return the raw prediction and interpret in frontend or map here if known.
        # Screenshot doesn't explicitly show mapping, but implies binary.
        
        result_label = prediction[0]
        # If result is numpy int/str, convert to native
        if hasattr(result_label, 'item'):
            result_label = result_label.item()
            
        return {"status": "success", "result": result_label}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

def stage2_verify(path1, path2):
    try:
        f1 = extract_features(path1)
        f2 = extract_features(path2)
        
        if f1 is None or f2 is None:
            return {"status": "error", "message": "Could not extract features from one or both files"}
            
        sim = cosine_similarity(f1, f2)
        threshold = 0.91 # From screenshot
        
        is_same = sim >= threshold
        
        return {
            "status": "success", 
            "similarity": float(sim), 
            "is_same_speaker": bool(is_same),
            "threshold": threshold
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
        
    command = sys.argv[1]
    
    if command == "stage1":
        result = stage1_detect(sys.argv[2])
        print(json.dumps(result))
    elif command == "stage2":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Missing second file for stage 2"}))
        else:
            result = stage2_verify(sys.argv[2], sys.argv[3])
            print(json.dumps(result))
    else:
        print(json.dumps({"error": "Unknown command"}))
