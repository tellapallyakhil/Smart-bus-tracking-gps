import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import os

# Paths
MODEL_PATH = 'backend/eta_model.pkl'
DATA_PATH = 'bus_data_predictions.csv'
LE_BUS_PATH = 'backend/le_bus.pkl'
LE_STOP_PATH = 'backend/le_stop.pkl'

def evaluate():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(DATA_PATH):
        print("Error: Model or Data file missing. Ensure you have trained the model first.")
        return

    # Load Model and Encoders
    model = joblib.load(MODEL_PATH)
    le_bus = joblib.load(LE_BUS_PATH)
    le_stop = joblib.load(LE_STOP_PATH)
    
    # Load Data
    df = pd.read_csv(DATA_PATH)
    
    # Preprocess
    df['Hour'] = pd.to_datetime(df['Scheduled_Arrival']).dt.hour
    df['Minute'] = pd.to_datetime(df['Scheduled_Arrival']).dt.minute
    df['Bus_ID_Code'] = le_bus.transform(df['Bus_ID'])
    df['Stop_Code'] = le_stop.transform(df['Stop_Name'])
    
    X = df[['Bus_ID_Code', 'Stop_Code', 'Hour', 'Minute']]
    y_true = df['Delay_Minutes']
    
    # Predictions
    y_pred = model.predict(X)
    
    # Metrics
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    
    print("\n" + "="*30)
    print("🧠 MODEL ACCURACY REPORT")
    print("="*30)
    print(f"✅ R2 Score: {r2:.4f} (Closer to 1.0 is better)")
    print(f"📏 Mean Absolute Error: {mae:.2f} minutes")
    print(f"📉 Mean Squared Error: {mse:.2f}")
    print("="*30)
    print("Note: R2 Score > 0.80 indicates a very strong predictive model.")

if __name__ == "__main__":
    evaluate()
