from flask import Flask, request, jsonify
from flask_cors import CORS
from market_prediction import run_prediction

app = Flask(__name__)
CORS(app)

@app.route("/api/predict")
def predict():
    threshold = float(request.args.get("threshold", 0.6))
    window = int(request.args.get("window", 60))

    results = run_prediction(threshold=threshold, window=window)
    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
