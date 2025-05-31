from flask import Flask, request, jsonify, render_template, send_from_directory
import tensorflow as tf
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
import io
import os
import pickle
import joblib

app = Flask(__name__, static_url_path='/static')

# Load eye disease model (TensorFlow/Keras)
try:
    # Replace with the actual path to your eye disease model
    eye_model = load_model('./my_model.keras')
    print("Eye disease model loaded successfully")
except Exception as e:
    print(f"Error loading eye disease model: {e}")
    eye_model = None

# Load diabetes model (scikit-learn)
try:
    # Load the pickle model for text-based inputs
    diabetes_model = joblib.load('diabetes_model_logistic.pkl')
    print("Diabetes model loaded successfully")
except Exception as e:
    print(f"Error loading diabetes model: {e}")
    diabetes_model = None

# Labels for eye disease prediction
EYE_DISEASE_LABELS = ['Normal', 'Diabetes', 'Glaucoma', 'Cataract', 'AMD', 'Hypertension', 'Myopia', 'Other']


def preprocess_eye_image(image):
    # Resize to 224x224, normalize to [0,1]
    image = image.resize((224, 224))
    image = np.array(image) / 255.0
    if image.shape[-1] == 4:  # Remove alpha channel if present
        image = image[..., :3]
    # Add batch dimension: [1, 224, 224, 3]
    return np.expand_dims(image, axis=0)


def prepare_diabetes_features(form_data):
    """
    Process the form data into features expected by the scikit-learn diabetes model.
    Features required: Pregnancies, Age, BloodPressure, SkinThickness, Glucose,
    Insulin, BMI, DiabetesPedigreeFunction
    """
    try:
        # Extract the specific fields from form data and convert to appropriate types
        # This matches the exact features the diabetes model was trained on
        features = {
            'Pregnancies': float(form_data.get('pregnancies', 0)),
            'Age': float(form_data.get('age', 0)),
            'BloodPressure': float(form_data.get('bloodpressure', 0)),
            'SkinThickness': float(form_data.get('skinthickness', 0)),
            'Glucose': float(form_data.get('glucose', 0)),
            'Insulin': float(form_data.get('insulin', 0)),
            'BMI': float(form_data.get('bmi', 0)),
            'DiabetesPedigreeFunction': float(form_data.get('diabetespedigreefunction', 0))
        }

        # Convert to list in the right order for the model
        # This order must match the order of features the model was trained with
        feature_names = ['Pregnancies', 'Age', 'BloodPressure', 'SkinThickness',
                         'Glucose', 'Insulin', 'BMI', 'DiabetesPedigreeFunction']

        # Create feature array in correct order
        feature_array = [features[name] for name in feature_names]

        print(f"Prepared diabetes features: {feature_array}")
        return np.array([feature_array])  # Return as 2D array for sklearn

    except Exception as e:
        print(f"Error preparing diabetes features: {e}")
        # Return None to indicate error
        return None

@app.route('/')
def pre_landing():
    # Serve the new pre-landing page
    return render_template('xvlink_landing.html')


@app.route('/home')
def index():
    # Serve the original landing page (now at /home)
    return render_template('medipredict.html')


@app.route('/eye_health')
def eye_health():
    return render_template('eye_health_prediction.html')


@app.route('/diabetes')
def diabetes():
    return render_template('diabetes_prediction_page.html')


@app.route('/static/<path:path>')
def serve_static(path):
    # Serve static files (CSS, JS, images)
    return send_from_directory('static', path)


@app.route('/predict_eye_disease', methods=['POST'])
def predict_eye_disease():
    if not eye_model:
        return jsonify({'error': 'Eye disease model not loaded'}), 500
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        image_file = request.files['image']
        image = Image.open(image_file)
        preprocessed = preprocess_eye_image(image)

        # Run prediction
        predictions = eye_model.predict(preprocessed)[0]
        predicted_class = np.argmax(predictions)
        confidence = float(predictions[predicted_class]) * 100

        result = {
            'label': EYE_DISEASE_LABELS[predicted_class],
            'confidence': round(confidence, 2)
        }

        print(f"Eye disease prediction: {result}")
        return jsonify(result)
    except Exception as e:
        print(f"Error during eye disease prediction: {str(e)}")
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500


@app.route('/predict_diabetes', methods=['POST'])
def predict_diabetes():
    if not diabetes_model:
        return jsonify({'error': 'Diabetes model not loaded'}), 500

    try:
        # Extract all form data for the diabetes prediction
        form_data = request.form

        # Prepare features for the scikit-learn model
        features = prepare_diabetes_features(form_data)

        if features is None:
            return jsonify({'error': 'Could not process the input data'}), 400

        # Make prediction with scikit-learn model
        if hasattr(diabetes_model, 'predict_proba'):
            # If model supports probabilities
            probabilities = diabetes_model.predict_proba(features)[0]
            prediction = diabetes_model.predict(features)[0]

            # Get confidence (probability of predicted class)
            confidence = probabilities[1] * 100 if prediction == 1 else probabilities[0] * 100

            result = {
                'label': 'Positive: Diabetes Likely' if prediction == 1 else 'Negative: Diabetes Unlikely',
                'confidence': round(confidence, 2)
            }
        else:
            # If model doesn't support probabilities
            prediction = diabetes_model.predict(features)[0]
            result = {
                'label': 'Positive: Diabetes Likely' if prediction == 1 else 'Negative: Diabetes Unlikely',
                'confidence': None  # No confidence score available
            }

        print(f"Diabetes prediction: {result}")
        return jsonify(result)
    except Exception as e:
        print(f"Error during diabetes prediction: {str(e)}")
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)