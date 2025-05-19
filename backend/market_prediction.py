# import yfinance as yf
# from sklearn.ensemble import RandomForestClassifier
# from sklearn.metrics import precision_score
# import pandas as pd

# def run_prediction(threshold=0.6, window=60):
#     sp500 = yf.Ticker("^GSPC")
#     sp500 = sp500.history(period="max")

#     del sp500["Dividends"]
#     del sp500["Stock Splits"]

#     sp500["Tomorrow"] = sp500["Close"].shift(-1)

#     sp500["Target"] = (sp500["Tomorrow"] > sp500["Close"]).astype(int)

#     sp500 = sp500.loc["1990-01-01":].copy()

#     model = RandomForestClassifier(n_estimators=200, min_samples_split=50, random_state=1)

#     def predict(train, test, predictors, model):
#         model.fit(train[predictors], train["Target"])
#         preds = model.predict_proba(test[predictors])[:, 1]
#         preds[preds >= .6] = 1
#         preds[preds < .6] = 0
#         preds = pd.Series(preds, index=test.index, name="Predictions")
#         combined = pd.concat([test["Target"], preds], axis=1)
#         return combined

#     def backtest(data, model, predictors, start=2500, step=250):
#         all_predictions = []

#         for i in range(start, data.shape[0], step):
#             train = data.iloc[0:i].copy()
#             test = data.iloc[i:(i + step)].copy()
#             predictions = predict(train, test, predictors, model)
#             all_predictions.append(predictions)
        
#         return pd.concat(all_predictions)

#     horizons = [2, 5, 60, 250, 1000]
#     new_predictors = []

#     for horizon in horizons:
#         rolling_averages = sp500.rolling(horizon).mean()

#         ratio_column = f"Close_Ratio_{horizon}"
#         sp500[ratio_column] = sp500["Close"] / rolling_averages["Close"]

#         trend_column = f"Trend_{horizon}"
#         sp500[trend_column] = sp500.shift(1).rolling(horizon).sum()["Target"]

#         new_predictors += [ratio_column, trend_column]

#     sp500 = sp500.dropna()

#     predictions = backtest(sp500, model, new_predictors)
#     predictions["Predictions"].value_counts()

#     precision = precision_score(predictions["Target"], predictions["Predictions"])

#     return {
#         "precision": round(precision, 4),
#         "tomorrow": {
#             "date": tomorrow.strftime("%Y-%m-%d"),
#             "prediction": int(tomorrow_row["Predictions"].iloc[0]) if not tomorrow_row.empty else None,
#             "probability_up": None
#         },
#         "next_buy": {
#             "date": next_buy.index[0].strftime("%Y-%m-%d") if not next_buy.empty else None
#         },
#         "predictions": [
#             {
#                 "date": date.strftime("%Y-%m-%d"),
#                 "actual": int(row["Target"]),
#                 "predicted": int(row["Predictions"]),
#                 "close": round(float(row["Close"]), 2)
#             }
#             for date, row in predictions.iterrows()
#         ]
#     }
    




import yfinance as yf
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score

def run_prediction(threshold=0.6, window=60):
    sp500 = yf.Ticker("^GSPC").history(period="max")

    sp500 = sp500.drop(columns=["Dividends", "Stock Splits"])
    sp500["Tomorrow"] = sp500["Close"].shift(-1)
    sp500["Target"] = (sp500["Tomorrow"] > sp500["Close"]).astype(int)
    sp500 = sp500.loc["1990-01-01":].copy()

    # Add features for selected horizon
    rolling_averages = sp500.rolling(window).mean()
    ratio_column = f"Close_Ratio_{window}"
    trend_column = f"Trend_{window}"
    sp500[ratio_column] = sp500["Close"] / rolling_averages["Close"]
    sp500[trend_column] = sp500.shift(1).rolling(window).sum()["Target"]
    sp500 = sp500.dropna()
    predictors = [ratio_column, trend_column]

    model = RandomForestClassifier(n_estimators=200, min_samples_split=50, random_state=1)

    def predict(train, test, predictors, model, threshold):
        model.fit(train[predictors], train["Target"])
        probs = model.predict_proba(test[predictors])[:, 1]
        preds = (probs >= threshold).astype(int)
        preds = pd.Series(preds, index=test.index, name="Predictions")
        combined = test.copy()
        combined["Predictions"] = preds
        return combined

    def backtest(data, model, predictors, threshold=0.6, start=2500, step=250):
        all_predictions = []
        for i in range(start, data.shape[0], step):
            train = data.iloc[0:i]
            test = data.iloc[i:i+step]
            predictions = predict(train, test, predictors, model, threshold)
            all_predictions.append(predictions)
        return pd.concat(all_predictions)

    predictions = backtest(sp500, model, predictors, threshold=threshold)
    full_precision = precision_score(predictions["Target"], predictions["Predictions"], zero_division=0)
    value_counts = predictions["Predictions"].value_counts().to_dict()

    # Get latest row and simulate prediction for tomorrow
    latest_row = sp500.iloc[-1:].copy()
    future_row = latest_row.copy()
    future_date = latest_row.index[0] + pd.Timedelta(days=1)
    future_row.index = [future_date]

    future_row[ratio_column] = sp500["Close"].iloc[-1] / sp500[ratio_column].iloc[-1]
    future_row[trend_column] = sp500["Target"].iloc[-window:].sum()
    future_pred_prob = model.predict_proba(future_row[predictors])[:, 1][0]
    future_pred = int(future_pred_prob >= threshold)

    # Next future buy day in predictions
    today = pd.Timestamp.now(tz=sp500.index.tz).normalize()
    future_preds = predictions[predictions.index >= today]
    next_buy = future_preds[future_preds["Predictions"] == 1].head(1)

    return {
        "precision": round(full_precision, 4),
        "value_counts": {str(k): int(v) for k, v in value_counts.items()},
        "tomorrow": {
            "date": future_date.strftime("%Y-%m-%d"),
            "prediction": future_pred,
            "probability_up": round(future_pred_prob, 3)
        },
        "next_buy": {
            "date": next_buy.index[0].strftime("%Y-%m-%d") if not next_buy.empty else None
        },
        "predictions": [],  # optional if not showing historical prediction table
        "sp500": [
            {
                "date": idx.strftime("%Y-%m-%d"),
                "close": round(row["Close"], 2)
            }
            for idx, row in sp500.iterrows()
        ]
    }
