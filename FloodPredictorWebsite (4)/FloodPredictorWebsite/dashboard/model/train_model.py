
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import json

# Kaggle column names → standardized names
COLUMN_MAPPING = {
    'TopographyDrainage': 'topography_drainage',
    'Siltation': 'siltation',
    'Watersheds': 'watersheds',
    'MonsoonIntensity': 'monsoon_intensity',
    'ClimateChange': 'climate_change',
    'DrainageSystems': 'drainage_system',
    'DamsQuality': 'dams_quality',
    'DeterioratingInfrastructure': 'deteriorating_infrastructure',
    'Urbanization': 'urbanization',
    'WetlandLoss': 'wetland_loss',
    'PopulationScore': 'population_score',
    'Encroachments': 'encroachments',
    'RiverManagement': 'river_management',
    'IneffectiveDisasterPreparedness': 'ineffective_disaster_preparedness',  
    'InadequatePlanning': 'inadequate_planning',
    'PoliticalFactors': 'political_factors'
}

FEATURE_NAMES = [
    'monsoon_intensity', 'climate_change', 'topography_drainage', 'siltation',
    'wetland_loss', 'watersheds', 'river_management', 'drainage_system',
    'dams_quality', 'deteriorating_infrastructure', 'urbanization',
    'encroachments', 'population_score', 'ineffective_disaster_preparedness',
    'inadequate_planning', 'political_factors'
]

RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

def train_flood_model(data_path='flood.csv'): 
    print("Model training initiated")
    
    df_full = pd.read_csv(data_path)
    
    print(f"Loaded {len(df_full)} samples from {data_path}")
    print(f"Total columns: {len(df_full.columns)}")
    

    required_columns = list(COLUMN_MAPPING.keys()) + ['FloodProbability']
    missing = [col for col in required_columns if col not in df_full.columns]
    if missing:
        print(f"\nERROR: Missing columns: {missing}")
        return None
    
    columns_to_use = list(COLUMN_MAPPING.keys()) + ['FloodProbability']
    df = df_full[columns_to_use].copy()
    
    df_renamed = df.rename(columns=COLUMN_MAPPING)
    X = df_renamed[FEATURE_NAMES]

    print("\nFeature Ranges (Kaggle scale):")
    for col in X.columns:
        print(f"   {col:35s}: {X[col].min():5.1f} - {X[col].max():5.1f}")
    
    flood_prob = df['FloodProbability']
    

    if flood_prob.max() <= 1:
        flood_prob = flood_prob * 100
    
    print(f"   FloodProbability range: {flood_prob.min():.2f}% - {flood_prob.max():.2f}%")

    y = pd.cut(
        flood_prob,
        bins=[0, 25, 50, 75, 100],
        labels=[0, 1, 2, 3],
        include_lowest=True
    ).astype(int)
    

    unique_classes = sorted(y.unique())
    actual_risk_levels = [RISK_LEVELS[i] for i in unique_classes]

    for i in unique_classes:
        count = (y == i).sum()
        pct = count / len(y) * 100
    

    print("\nSplitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   Training: {len(X_train)} samples")
    print(f"   Testing: {len(X_test)} samples")
    

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'
    )
    
    model.fit(X_train, y_train)
    print("\nTraining complete!")
    

    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {accuracy:.2%}")
    

    print("\nClassification Report:")
    unique_test_classes = sorted(y_test.unique())
    test_class_names = [RISK_LEVELS[i] for i in unique_test_classes]
    print(classification_report(y_test, y_pred, target_names=test_class_names, digits=3))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   Predicted →")
    print(f"   Actual ↓    {test_class_names}")
    for i, row in enumerate(cm):
        print(f"   {test_class_names[i]:8s}: {row}")
    

    feature_importance = pd.DataFrame({
        'feature': FEATURE_NAMES,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for idx, row in feature_importance.head(10).iterrows():
        bar = '█' * int(row['importance'] * 100)
    

    
    jakarta_samples = {
        'Cempaka Putih (Low Risk)': [62*0.16, 58*0.16, 58*0.16, 65*0.16, 52*0.16, 62*0.16, 58*0.16, 68*0.16, 78*0.16, 55*0.16, 82*0.16, 62*0.16, 72*0.16, 52*0.16, 52*0.16, 48*0.16],
        'Menteng (Medium Risk)': [72*0.16, 68*0.16, 45*0.16, 75*0.16, 65*0.16, 52*0.16, 55*0.16, 62*0.16, 72*0.16, 68*0.16, 88*0.16, 75*0.16, 82*0.16, 60*0.16, 62*0.16, 58*0.16],
        'Tanah Abang (High Risk)': [85*0.16, 75*0.16, 38*0.16, 88*0.16, 78*0.16, 42*0.16, 45*0.16, 42*0.16, 65*0.16, 78*0.16, 96*0.16, 85*0.16, 92*0.16, 70*0.16, 72*0.16, 68*0.16],
        'Sawah Besar (Critical Risk)': [92*0.16, 82*0.16, 28*0.16, 95*0.16, 88*0.16, 35*0.16, 38*0.16, 35*0.16, 58*0.16, 85*0.16, 98*0.16, 92*0.16, 95*0.16, 78*0.16, 78*0.16, 72*0.16]
    }
    
    for name, features in jakarta_samples.items():
        features_df = pd.DataFrame([features], columns=FEATURE_NAMES)
        pred = model.predict(features_df)[0]
        proba = model.predict_proba(features_df)[0]
        
        risk_weights = {'LOW': 12.5, 'MEDIUM': 37.5, 'HIGH': 62.5, 'CRITICAL': 87.5}
        prob_dict = {RISK_LEVELS[i]: proba[i] for i in range(len(proba))}
        flood_prob = sum(prob_dict.get(level, 0) * weight for level, weight in risk_weights.items())
    
    
    # Save model and metadata

    
    # Save model
    joblib.dump(model, 'flood_prediction_model.pkl')
    print("Created 'flood_prediction_model.pkl'")
    
    # Save feature names
    with open('feature_names.json', 'w') as f:
        json.dump(FEATURE_NAMES, f, indent=2)
    print("Created 'feature_names.json'")
    
    # Save feature importance
    feature_importance.to_csv('feature_importance.csv', index=False)
    print("Created 'feature_importance.csv'")
    
    # Save model metrics
    metrics = {
        'accuracy': float(accuracy),
        'cv_accuracy': float(cv_scores.mean()),
        'cv_std': float(cv_scores.std()),
        'n_features': len(FEATURE_NAMES),
        'n_samples': len(df),
        'n_classes': len(unique_classes),
        'classes': [int(c) for c in unique_classes],
        'class_names': actual_risk_levels,
        'feature_names': FEATURE_NAMES,
        'feature_scale': '0-16 (Kaggle original)',
        'note': 'Jakarta districts (0-100) must be scaled by 0.16 before prediction'
    }
    
    with open('model_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    print("Created 'model_metrics.json'")
    
    
    return model, unique_classes


if __name__ == "__main__":
    try:

        result = train_flood_model('flood.csv')
        
        if result is None:
            print("\n❌ Training failed!")
            exit(1)
        
        model, unique_classes = result
        
        print("Model is ready to use. Run application.py");
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()