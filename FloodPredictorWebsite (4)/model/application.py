from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import json
import os

app = Flask(__name__)
CORS(app)

try:
    model = joblib.load('flood_prediction_model.pkl')
    
    with open('feature_names.json', 'r') as f:
        FEATURE_NAMES = json.load(f)
    
    if os.path.exists('model_metrics.json'):
        with open('model_metrics.json', 'r') as f:
            metrics = json.load(f)
            MODEL_CLASSES = metrics.get('classes', [0, 1, 2, 3])
            CLASS_NAMES = metrics.get('class_names', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
            N_FEATURES = metrics.get('n_features', 16)
    else:
        MODEL_CLASSES = [0, 1, 2, 3]
        CLASS_NAMES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        N_FEATURES = 16
    
    print(f"Model loaded successfully!")
except FileNotFoundError as e:
    print(f"Error: {e}")
    print("Please run train_model.py first!")
    exit(1)

RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

def scale_jakarta_to_kaggle(value):

    return value * 0.16

def scale_features_array(features):
   
    return [scale_jakarta_to_kaggle(f) for f in features]

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'api': 'Flood Prediction API (Scale-Fixed)',
        'status': 'operational',
        'n_features': N_FEATURES,
        'classes': CLASS_NAMES,
        'feature_names': FEATURE_NAMES,
        'note': 'Now correctly scales Jakarta (0-100) to Kaggle (0-16) range',
        'endpoints': {
            'GET /': 'API info',
            'GET /health': 'Health check',
            'POST /predict': 'Make prediction',
            'POST /predict-district': 'Predict for district'
        }
    })

@app.route('/health', methods=['GET'])
def health():

    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'n_features': N_FEATURES,
        'expected_features': 16,
        'n_classes': len(CLASS_NAMES),
        'classes': CLASS_NAMES,
        'scaling': 'Jakarta (0-100) → Kaggle (0-16)'
    })

@app.route('/predict', methods=['POST'])
def predict():

    try:
        data = request.json
        

        features = []
        for feature_name in FEATURE_NAMES:
     
            camel_case = ''.join([
                word.capitalize() if i > 0 else word 
                for i, word in enumerate(feature_name.split('_'))
            ])
            
            value = data.get(camel_case, data.get(feature_name, 50))
            features.append(float(value))
        

        if len(features) != N_FEATURES:
            return jsonify({
                'success': False,
                'error': f'Expected {N_FEATURES} features, got {len(features)}'
            }), 400
        
        scaled_features = scale_features_array(features)
        

        features_df = pd.DataFrame([scaled_features], columns=FEATURE_NAMES)
        prediction = model.predict(features_df)[0]
        probabilities = model.predict_proba(features_df)[0]
        

        predicted_risk = RISK_LEVELS[int(prediction)]
        confidence = float(max(probabilities))

        probability_breakdown = {}
        for i, prob in enumerate(probabilities):
            class_idx = MODEL_CLASSES[i]
            probability_breakdown[RISK_LEVELS[class_idx]] = float(prob)
        
        return jsonify({
            'success': True,
            'prediction': {
                'riskLevel': predicted_risk,
                'confidence': confidence,
                'confidencePercent': round(confidence * 100, 1),
                'probabilities': probability_breakdown,
                'probabilitiesPercent': {
                    level: round(prob * 100, 1) 
                    for level, prob in probability_breakdown.items()
                }
            },
            'debug': {
                'original_features': [round(f, 1) for f in features],
                'scaled_features': [round(f, 2) for f in scaled_features],
                'scaling_note': 'Jakarta (0-100) scaled to Kaggle (0-16)'
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/predict-district', methods=['POST'])
def predict_district():
    try:
        data = request.json
        params = data['parameters']

        features = [
            params['environmental']['climateWeather']['monsoonIntensity'],
            params['environmental']['climateWeather']['climateChange'],
            params['environmental']['topography']['topographyDrainage'],
            params['environmental']['topography']['siltation'],
            params['environmental']['topography']['wetlandLoss'],
            params['environmental']['watershed']['watersheds'],
            params['environmental']['watershed']['riverManagement'],
            params['infrastructure']['critical']['drainageSystem'],
            params['infrastructure']['critical']['damsQuality'],
            params['infrastructure']['critical']['deterioratingInfrastructure'],
            params['urbanSocial']['urbanDevelopment']['urbanization'],
            params['urbanSocial']['urbanDevelopment']['encroachments'],
            params['urbanSocial']['population']['populationScore'],
            params['governance']['disasterPreparedness']['ineffectiveDisasterPreparedness'],
            params['governance']['planningPolicy']['inadequatePlanning'],
            params['governance']['planningPolicy']['politicalFactors']
        ]
        
        # Validate feature count
        if len(features) != 16:
            return jsonify({
                'success': False,
                'error': f'Expected 16 features, got {len(features)}'
            }), 400
        
        scaled_features = scale_features_array(features)

        features_df = pd.DataFrame([scaled_features], columns=FEATURE_NAMES)
        prediction = model.predict(features_df)[0]
        probabilities = model.predict_proba(features_df)[0]

        predicted_risk = RISK_LEVELS[int(prediction)]
        confidence = float(max(probabilities))

        probability_breakdown = {}
        for i, prob in enumerate(probabilities):
            class_idx = MODEL_CLASSES[i]
            probability_breakdown[RISK_LEVELS[class_idx]] = float(prob)

        risk_weights = {'LOW': 12.5, 'MEDIUM': 37.5, 'HIGH': 62.5, 'CRITICAL': 87.5}
        flood_probability = sum(
            probability_breakdown.get(level, 0) * weight 
            for level, weight in risk_weights.items()
        )
        flood_probability = round(flood_probability, 1)
        
        return jsonify({
            'success': True,
            'districtName': data.get('districtName', 'Unknown'),
            'prediction': {
                'floodProbability': flood_probability,
                'riskLevel': predicted_risk,
                'confidence': confidence,
                'confidencePercent': round(confidence * 100, 1),
                'probabilities': probability_breakdown,
                'probabilitiesPercent': {
                    level: round(prob * 100, 1) 
                    for level, prob in probability_breakdown.items()
                }
            },
            'debug': {
                'original_scale': '0-100 (Jakarta)',
                'scaled_to': '0-16 (Kaggle)',
                'sample_original': [round(features[0], 1), round(features[3], 1)],
                'sample_scaled': [round(scaled_features[0], 2), round(scaled_features[3], 2)]
            }
        })
    
    except KeyError as e:
        return jsonify({
            'success': False,
            'error': f'Missing parameter: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    print(f"\nStarting server...")
    print(f"URL: http://localhost:5000")
    print("\nEndpoints:")
    print("   GET  /              - API info")
    print("   GET  /health        - Health check")
    print("   POST /predict       - Predict from parameters")
    print("   POST /predict-district - Predict for district")
    print("\nServer ready! Press Ctrl+C to stop.")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)