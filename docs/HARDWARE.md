
# HARDWARE DOCUMENTATION

## 1. Introduction
The hardware component of our solution forms the backbone of the peer-to-peer (P2P) solar microgrid monitoring and sharing system. 
Our aim is to design, build, and demonstrate a cost-effective, scalable prototype that integrates renewable energy generation, 
storage, consumption, and peer-to-peer energy exchange.

This document provides a detailed explanation of the hardware setup, the design choices, wiring configurations, 
cost structure, safety considerations, and future scalability. It is intended for both technical evaluators and implementers 
who may want to replicate or extend this system.

---

## 2. Objectives
- Develop a **low-cost prototype** for microgrid monitoring and P2P energy sharing.
- Integrate **IoT modules** for real-time monitoring and control.
- Demonstrate **plug-and-play hardware kits** that can be easily deployed.
- Ensure **safety** via fuses, controllers, and regulated connections.
- Build a foundation for scaling from **2 households → 20 → 200 → entire community**.

---

## 3. High-Level Hardware Overview
The system consists of decentralized "nodes."  
Each node represents a household with:
- A **solar panel** for energy generation.
- A **battery** for energy storage.
- A **solar charge controller** for regulated charging/discharging.
- A **load** (LED bulb in prototype; real appliances in production).  
- An **IoT module (ESP32/Arduino/Raspberry Pi)** for monitoring and control.
- Optional **relay switches** for energy sharing with peers.

---

## 4. Key Hardware Components

### 4.1 Solar Panels
- **Type:** Polycrystalline/Monocrystalline
- **Prototype Specs:** 6V, 180mA panels (x2)
- **Future Specs:** 12V, 10W–50W panels for larger households
- **Function:** Converts sunlight to DC power for charging the battery.

### 4.2 Battery
- **Prototype Specs:** 12V, ~5Ah sealed lead-acid (SLA) battery / alternative 9V small-scale batteries
- **Function:** Stores excess solar energy for use during low sunlight hours.

### 4.3 Solar Charge Controller
- **Type:** 10A PWM Charge Controller (with LCD and USB support)
- **Function:**
  - Regulates voltage and current from solar panels to battery.
  - Prevents overcharging, deep discharge, and reverse current flow.
  - Provides output terminals for loads.

### 4.4 Loads
- **Prototype Loads:** 0.5W Philips Deco LED bulbs (x2)
- **Demonstration Purpose:** Shows real-time consumption differences under bright vs dim solar input.

### 4.5 IoT Microcontrollers
- **ESP32:** Wi-Fi + Bluetooth, used for telemetry transmission.
- **Arduino Uno:** Used for prototyping and sensor interfacing (if required).
- **Raspberry Pi 4:** Used as a gateway for aggregating multi-node data and running local analytics.

### 4.6 Sensors (Optional for Prototype)
- **Voltage & Current Sensors:** INA219 or ACS712 for monitoring.
- **Temperature Sensor:** For battery health monitoring.
- **Relay Modules:** For switching power between peers.

### 4.7 Supporting Components
- DC-DC Buck Converter (optional for regulated supply to IoT boards).
- Wires, switches, fuses, and bulb holders.

---

## 5. Circuit Design & Wiring

### 5.1 Prototype Connections (Single Node)
1. **Solar Panel → Charge Controller (PV input)**
2. **Battery → Charge Controller (Battery input)**
3. **Load (LED Bulb) → Charge Controller (Load output)**
4. **ESP32/Arduino → Parallel connection across battery terminals (via sensors + buck converter if needed)**

### 5.2 Peer-to-Peer Sharing (Two Nodes)
- Each node has its **own solar panel, charge controller, battery, and load.**
- **Relay Switches** enable transfer of excess energy from Node A’s battery to Node B’s load (and vice versa).
- IoT modules ensure **credits are updated** in software when sharing occurs.

---

## 6. Cost Breakdown (Prototype Scale)
| Component                | Quantity | Unit Cost (₹) | Total (₹) |
|---------------------------|----------|---------------|-----------|
| Solar Panel (6V, 180mA)   | 2        | 350           | 700       |
| 10A PWM Charge Controller | 2        | 550           | 1100      |
| SLA Battery (12V, 5Ah)    | 1        | 1800          | 1800      |
| LED Bulbs (0.5W)          | 2        | 100           | 200       |
| Bulb Holders              | 2        | 50            | 100       |
| ESP32 Dev Board           | 1        | 400           | 400       |
| Arduino Uno               | 1        | 500           | 500       |
| Raspberry Pi 4 (4GB)      | 1        | 5000          | 5000      |
| Sensors + Relay + Buck    | 1 set    | 800           | 800       |
| Wires, Fuses, Switches    | -        | 400           | 400       |
| **Total**                 | -        | -             | **~₹11,000 (scalable)** |

> **Note:** By optimizing (removing Raspberry Pi, using only ESP32 + relays), the cost can be reduced to **₹7,500–8,000** for MVP deployment.

---

## 7. Limitations (Prototype)
- Current prototype demonstrates **basic P2P sharing** with LEDs — scaling to real appliances requires higher wattage panels & batteries.
- No real-time internet dashboard integration (simulated for now).
- Relay-based sharing is sequential, not simultaneous — advanced power electronics needed for large-scale deployment.

---

## 8. Safety Considerations
- Always include **fuses** between panels, battery, and load.
- Ensure **charge controller** is rated higher than expected current.
- Use proper **gauge wires** to avoid overheating.
- Avoid short circuits — test with multimeter before powering.

---

## 9. Future Improvements
- Use **MPPT charge controllers** instead of PWM for better efficiency.
- Introduce **LiFePO4 batteries** for longer life.
- Integrate **smart metering sensors** for precise monitoring.
- Expand to **20+ nodes** using LoRa mesh communication.
- Develop a **blockchain credit system** for transparent energy transactions.
- Introduce **mobile-first dashboards** with AI-based energy predictions.

---

## 10. Conclusion
This hardware setup demonstrates a **low-cost, scalable, and IoT-enabled prototype** for renewable energy microgrids with peer-to-peer sharing.  
Our architecture ensures affordability (target ₹7–8k per node), modularity (plug-and-play design), and future-readiness (AI, blockchain, predictive monitoring).

By integrating **hardware + IoT + software + AI**, we not only solve the monitoring problem stated in SIH PS 25051 but also go beyond by enabling true **community-driven energy sharing**.

---

**Authors:** Team [Your Team Name]  
**Date:** September 2025  
**License:** MIT
