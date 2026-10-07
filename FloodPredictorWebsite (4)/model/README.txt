Training the AI, making a flood predictor model :
1. Open terminal in the project folder
2. Type this down: python train_model.py
	- This will train the model on Kaggle data (flood.csv)
	- It will create flood_prediction_model.pkl, feature_names.json, model_metrics.json 
3. Type this down: python application.py
	- Starts the API server. This needs to be activated in order for the model to provide its prediction
4. Run the website




Note : 
1. If .pkl exists, then just run application.p. But for safety precautions, do all of the steps above.
