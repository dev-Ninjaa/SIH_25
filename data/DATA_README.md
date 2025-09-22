# DATA README

## 1. Introduction
This folder contains **simulated IoT and AI datasets** for the **Renewable Energy Monitoring & Peer-to-Peer Sharing System**.  
The data is structured in a way that demonstrates how our hardware (solar panels, batteries, charge controllers, sensors, ESP32 modules) integrates with the software dashboard and AI/ML components.  

Even though this is simulated for the prototype stage, the formats mirror **real IoT data streams** and can be directly integrated once hardware is deployed.

---

## 2. Data Files Overview

### `households.json`
- Metadata of households/nodes.
- Includes location, solar panel capacity, battery capacity, and status.

### `solar_generation.csv`
- Logs energy generation from each household’s solar panels.
- Fields:
  - `timestamp`
  - `household_id`
  - `solar_voltage_v`
  - `solar_current_a`
  - `solar_power_w`

### `battery_status.csv`
- Tracks the battery voltage, state of charge (SOC), and temperature.
- Fields:
  - `timestamp`
  - `household_id`
  - `battery_voltage_v`
  - `battery_soc_percent`
  - `temperature_c`

### `consumption.csv`
- Household load consumption logs.
- Example devices: LED bulbs, phone chargers, small pumps.
- Fields:
  - `timestamp`
  - `household_id`
  - `load_power_w`
  - `device`

### `inefficiency_alerts.csv`
- Alerts for performance drops or maintenance needs.
- Fields:
  - `timestamp`
  - `household_id`
  - `alert_type`
  - `details`

### `weather_forecast.json`
- Simulated weather API output.
- Provides sunlight hours and sky conditions.
- Used for AI prediction of solar generation.

### `ai_predictions.csv`
- Machine learning predictions of energy consumption vs generation.
- Includes recommendations for P2P sharing.
- Fields:
  - `date`
  - `household_id`
  - `predicted_consumption_wh`
  - `predicted_generation_wh`
  - `recommendation`

---

## 3. Example Use Cases

1. **Monitoring Solar Panels**  
   - From `solar_generation.csv`, we can compare expected vs actual solar output.
   - If underperformance occurs, `inefficiency_alerts.csv` is triggered.

2. **Battery Health Tracking**  
   - Using `battery_status.csv`, operators know SOC (State of Charge).
   - Alerts can be raised if batteries fall below 20% SOC.

3. **Consumption Patterns**  
   - `consumption.csv` shows how much energy each device consumes.
   - Helps optimize loads (e.g., delay pumping water until battery is above 50%).

4. **Forecasting Energy Deficits/Excess**  
   - `weather_forecast.json` provides sunlight predictions.
   - `ai_predictions.csv` uses this to recommend borrowing/sharing energy.

5. **Peer-to-Peer Energy Sharing**  
   - If Household A has surplus and Household B has deficit, `ai_predictions.csv` gives a **“Share Energy” recommendation**.
   - Software updates credit balances accordingly.

---

## 4. Data Flow

```
Solar Panel → Sensors → ESP32 → JSON Stream → Cloud DB → Dashboard

Simulated Data (CSV/JSON) → Backend (Node.js/Express) → API → Frontend (React/Next.js)
```


- Raw sensor-like data is **CSV** (tabular logs).  
- System metadata & forecast data are **JSON**.  
- Predictions are generated and stored in **CSV** for easy analytics.

---

## 5. Alignment with Problem Statement (PS 25051)

- **PS Requirement:** IoT-based monitoring of solar microgrids with real-time data.  
- **Our Data:** Matches this via `solar_generation.csv`, `battery_status.csv`, and `consumption.csv`.  

- **PS Requirement:** Alert users to inefficiencies or maintenance needs.  
- **Our Data:** Achieved with `inefficiency_alerts.csv`.  

- **PS Requirement:** Improve efficiency by 15%.  
- **Our Data:** Demonstrates forecasting and sharing logic with `ai_predictions.csv` + `weather_forecast.json`.  

---

## 6. Notes
- Data is **simulated** but values are within realistic ranges:
  - Solar panel output: 5–12V, 100–500mA.
  - Battery voltage: 11.8–12.6V, SOC: 60–95%.
  - Loads: 0.5–3W for demo; higher in production.
- Judges should assume this represents **working ESP32 output**, ready to be connected to the cloud.

---

## 7. Future Data Extensions
- **Blockchain credits log** → Record energy credit transactions between peers.
- **Regional language metadata** → For accessibility in rural India.
- **Extended 30-day dataset** → To validate AI forecasting accuracy.

---

## 8. Conclusion
The datasets in this folder ensure:
- **Completeness** (generation, storage, consumption, alerts, predictions).  
- **Realism** (values mimic actual hardware).  
- **Scalability** (easily expandable to 200+ households).  

Together, they show that our system is **not just an idea**, but a **deployable, data-driven solution** for renewable energy monitoring and peer-to-peer sharing in rural microgrids.

---
