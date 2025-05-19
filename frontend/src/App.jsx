import React, { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,} from "chart.js";
import {
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Container
} from "@mui/material";
import "./App.css";

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [threshold, setThreshold] = useState(0.6);
  const [window, setWindow] = useState(60);
  const [precision, setPrecision] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [tomorrow, setTomorrow] = useState(null);
  const [nextBuy, setNextBuy] = useState(null);
  const [valueCounts, setValueCounts] = useState({});
  const [sp500Data, setSp500Data] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllData, setShowAllData] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/predict?threshold=${threshold}&window=${window}`);
      const data = await res.json();
      setPrecision(data.precision);
      setPredictions(data.predictions);
      setTomorrow(data.tomorrow);
      setNextBuy(data.next_buy);
      setValueCounts(data.value_counts);
      setSp500Data(data.sp500);
    } catch (err) {
      setError("Failed to fetch predictions.");
    } finally {
      setLoading(false);
    }
  };

  const displayedData = showAllData ? sp500Data : sp500Data.slice(-window);
  const fullCols = sp500Data.length > 0 ? Object.keys(sp500Data[0]).filter(k => k !== "date") : [];

  const chartData = {
    labels: displayedData.map((p) => p.date),
    datasets: [
      {
        label: "S&P 500 Price ($)",
        data: displayedData.map((p) => p.close),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        pointRadius: 2,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
      },
      {
        label: `${window}-day MA`,
        data: displayedData.map((p) => p[`Close_Ratio_${window}`] ? p.close / p[`Close_Ratio_${window}`] : null),
        borderColor: "#3b82f6",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  const horizons = [2, 5, 60, 250, 1000];

  return (
    <div className="min-h-screen py-20"
      style={{
        background: darkMode ? "#0f172a" : "linear-gradient(to bottom right, #f8fafc, #e2e8f0)",
        color: darkMode ? "#f1f5f9" : "#111827",
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: '100%', px: { xs: 2, sm: 4, md: 8 }, mt: 4 }}> 
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" className="font-semibold" sx={{ mt: 2 }}>
            Machine Learning Stock Predictor
          </Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Dark Mode"
          />
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={4} mb={5}>
          <TextField
            label="Precision Threshold"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            inputProps={{ step: 0.01, min: 0, max: 1 }}
            fullWidth
            InputLabelProps={{ style: { color: darkMode ? '#cbd5e1' : undefined } }}
            InputProps={{ style: { color: darkMode ? '#f8fafc' : undefined } }}
          />
          <FormControl fullWidth>
            <InputLabel style={{ color: darkMode ? '#cbd5e1' : undefined }}>Lookback Window (days)</InputLabel>
            <Select
              value={window}
              onChange={(e) => setWindow(parseInt(e.target.value))}
              label="Lookback Window"
              style={{ color: darkMode ? '#f8fafc' : undefined }}
            >
              {horizons.map((h) => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            onClick={runBacktest}
            variant="contained"
            size="large"
            sx={{ height: '56px', bgcolor: darkMode ? '#1f2937' : '#111827', '&:hover': { bgcolor: '#374151' } }}
          >Run Analysis</Button>
        </Box>

        {loading && <Typography color="warning.main">Running model...</Typography>}
        {error && <Typography color="error">{error}</Typography>}

        {precision !== null && (
          <Box mb={4} p={3} bgcolor={darkMode ? "#1e293b" : "#f0fdf4"} borderRadius={2} boxShadow={2}>
            <Typography variant="h6" sx={{ color: '#16a34a' }}>Model Precision: {(precision * 100).toFixed(2)}%</Typography>
<Typography variant="body1" mt={2}>Prediction Classification:</Typography>
            <ul>
              {Object.entries(valueCounts).map(([key, val]) => (
                <li key={key}>{key === '0' ? '📉 Drop' : '📈 Rise'}: {val}</li>
              ))}
            </ul>
          </Box>
        )}

        {tomorrow && (
          <Box mb={4} p={3} bgcolor={darkMode ? "#334155" : "#eef2ff"} borderRadius={2} boxShadow={1}>
            <Typography variant="h6">Tomorrow Forecast ({tomorrow.date}):</Typography>
            <Typography mt={1} color={tomorrow.prediction === 1 ? "success.main" : "error.main"}>
              {tomorrow.prediction === 1
                ? "📈 Expected to rise — positive momentum detected."
                : "📉 Market likely to dip — caution advised."}
            </Typography>
          </Box>
        )}

        {nextBuy?.date && (
          <Box mb={4} p={3} bgcolor={darkMode ? "#3f3f46" : "#fefce8"} borderRadius={2} boxShadow={1}>
            <Typography variant="h6">Next Suggested Entry:</Typography>
            <Typography mt={1}>Optimal buy date: <strong>{nextBuy.date}</strong></Typography>
          </Box>
        )}

        {sp500Data.length > 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <label>
                <input
                  type="checkbox"
                  checked={showAllData}
                  onChange={(e) => setShowAllData(e.target.checked)}
                  className="mr-2"
                />
                View Full Historical Dataset
              </label>
            </Box>
            <Box mb={2}>
              <FormControlLabel
                control={<Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  variant="standard"
                  style={{ color: darkMode ? '#f8fafc' : undefined }}
                >
                  <MenuItem value="line">Line</MenuItem>
                  <MenuItem value="bar">Bar</MenuItem>
                </Select>}
                label="Chart Type (View)"
                labelPlacement="start"
              />
            </Box>
            <div className="chart-container" style={{ width: '100%', height: '700px', paddingBottom: '3rem' }}>
  {chartType === 'line' ? <Line
    data={chartData}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: darkMode ? '#f1f5f9' : '#111827',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: darkMode ? '#e2e8f0' : '#111827',
          },
        },
        y: {
          ticks: {
            color: darkMode ? '#e2e8f0' : '#111827',
          },
        },
      },
    }}
  /> : <Bar data={chartData} options={{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: darkMode ? '#f1f5f9' : '#111827',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: darkMode ? '#e2e8f0' : '#111827',
        },
      },
      y: {
        ticks: {
          color: darkMode ? '#e2e8f0' : '#111827',
        },
      },
    },
  }} />} </div>
          </>
        )}
      </Container>
    </div>
  );
}

export default App;
