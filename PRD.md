# Product Requirements Document (PRD)
## IoT-Based Microgrid Monitoring and Energy Sharing System – MVP

**Document Version:** 1.0  
**Date:** September 7, 2025  
**Project Type:** MVP Development  
**Target:** SIH 25 PVT Competition  

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Vision](#vision)
4. [MVP Scope](#mvp-scope)
5. [Target Users](#target-users)
6. [Technical Overview](#technical-overview)
7. [Differentiation](#differentiation)
8. [Prototype Demo Plan](#prototype-demo-plan)
9. [Success Metrics](#success-metrics)
10. [Roadmap](#roadmap)

---

## 1. Executive Summary
We are developing a cost-effective, IoT-enabled prototype to demonstrate:
- End-to-end solar-to-battery-to-load operation.
- Peer-to-peer (P2P) energy sharing (via simulation and software dashboard).
- AI-powered forecasting for weather and energy consumption.
- Web/mobile dashboard for real-time monitoring.

**MVP Components:**
- **Hardware:** 2 solar panels, 1 battery, 1 charge controller, 2 LED bulbs.
- **Software:** Web dashboard (Next.js frontend, Node.js/Express backend, TypeScript) with integrated AI/ML modules for prediction.
- **Simulation Layer:** P2P sharing logic (software-based, as hardware is centralized for cost efficiency).

---

## 2. Problem Statement
- Rural microgrids lose 25–40% of energy due to isolation and lack of monitoring.
- Absence of real-time visibility leads to undetected failures.
- Surplus/deficit mismatch: some households have excess energy while others face shortages.
- Improper battery usage reduces lifespan and reliability.

---

## 3. Vision
*"Empowering rural communities with intelligent, interconnected microgrids that maximize efficiency, ensure reliable power, and enable community-based energy sharing."*

---

## 4. MVP Scope
### Must Have (Prototype)
- Two-node solar demonstration with battery and LED load.
- Web application dashboard displaying live generation, storage, and consumption data.
- Simulated P2P logic (e.g., Panel A in low sunlight borrows energy from Panel B).

### Nice to Have (Future Enhancements)
- ESP32/Arduino integration for real IoT data acquisition.
- AI/ML-based predictions for:
  - Solar generation forecasting (using weather APIs).
  - Household energy demand prediction.
- Mobile-first Progressive Web App (PWA) for operators.

---

## 5. Target Users
1. **Rural Households:** Seek reliable power, reduced costs, and potential earnings from surplus energy.
2. **Community Operators:** Require real-time visibility, alerts, and distribution control.
3. **Government & NGOs:** Need efficiency data for policy-making and scaling.

---

## 6. Technical Overview
### Hardware Prototype
- 2 × Solar Panels (6V, 180 mA each)
- 1 × 12.4V Battery (~5Ah)
- 1 × 10A PWM Charge Controller
- 2 × 0.5W LED bulbs with holders
- Wiring, fuse, and switch

### Software Stack
- **Frontend:** Next.js with Chart.js for dashboard and visualization.
- **Backend:** Express.js with TypeScript for API and business logic.
- **Database:** PostgreSQL (user and transaction data), InfluxDB (time-series energy data).
- **AI/ML:** Python services for weather-based forecasting and demand prediction.
- **Simulation:** ESP32 (optional) or software layer to emulate multiple peers.

---

## 7. Differentiation
- Existing solutions are centralized solar home kits.
- Our system enables community-first P2P sharing, real-time monitoring, and AI-driven forecasts.
- Focus on low-cost IoT (ESP32, Arduino) for scalability to 1,000+ households.
- Designed for rural Indian context: offline support and local language options.

---

## 8. Prototype Demo Plan
- **Hardware Demo:** Demonstrate two solar panels charging a battery and powering two LED loads (one bright, one dim).
- **Simulation:** Activate sharing; the LED on the dim panel receives energy from the surplus panel.
- **Frontend Demo:** Dashboard displays:
  - Live energy flow (generation, storage, consumption)
  - Simulation of surplus-to-deficit energy sharing
  - AI-driven weather and consumption prediction graphs
- **Pitch Video:** Visual storytelling illustrating scale-up (from 2 homes to a full village).

---

## 9. Success Metrics
- Functional hardware prototype (LEDs powered by solar and battery).
- Dashboard accurately simulates two-node P2P energy sharing.
- Weather and demand forecasts are visible in the application.
- Clear roadmap for scaling to multi-household P2P microgrids.

---

## 10. Roadmap
- **Internal SIH Demo:** Prototype with two nodes, one battery, simulation, and application.
- **Grand Finals:** Integrate IoT sensors and real-time ESP32 data.
- **Future:** Expand to multi-node deployments with real P2P switching and AI optimization.