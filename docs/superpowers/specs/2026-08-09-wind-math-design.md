# Wind Direction and Meteorological Math Design

## Purpose
To accurately identify which of the three sewage plants (Beckton, Crossness, Riverside) is the source of a reported smell by utilizing a Dynamic Back-Trajectory Algorithm based on local wind data.

## Architecture & Logic
The existing implementation averages the current and past hour wind directions equally. This will be replaced with speed-weighted vector math and dynamic lookback times based on the physical distance to the plants from Barking Riverside.

### 1. Data Requirements
- **Endpoint:** Open-Meteo Forecast API
- **Location:** `latitude=51.52&longitude=0.12` (Hardcoded for Barking area)
- **Parameters:** `current_weather=true`, `hourly=windspeed_10m,winddirection_10m`, `past_hours=3`

### 2. Algorithmic Steps

**Step A: Stagnant Air Check**
- Fetch the `current_weather.windspeed`.
- If the current wind speed is `< 2.0 km/h`, the air is considered stagnant.
- **Action:** Halt calculation. Do not display the wind feature. 

**Step B: Dynamic Lookback Calculation**
- The furthest plant (Riverside) is approximately 3.5 km away.
- Calculate the average wind speed by averaging the 4 fetched hourly wind speeds (current hour + 3 past hours).
- If the average speed is 0, halt calculation.
- Calculate travel time: `hoursNeeded = Math.ceil(3.5 / averageWindSpeed)`.
- Clamp `hoursNeeded` between 1 and 4. (1 means we only use the current hour; 4 means we use current + past 3 hours).

**Step C: Speed-Weighted Vector Averaging**
- Initialize `u = 0`, `v = 0`.
- For each of the `hoursNeeded` (starting from current time index and iterating backwards):
  - Retrieve `speed` and `direction` for that hour.
  - Convert to vectors weighted by speed:
    - `u += speed * Math.sin(direction * Math.PI / 180)`
    - `v += speed * Math.cos(direction * Math.PI / 180)`
- Calculate final average direction:
  - `avgWindDir = Math.atan2(u, v) * 180 / Math.PI`
  - Normalize to 0-360 degrees: `if (avgWindDir < 0) avgWindDir += 360`

**Step D: Variable Wind Check**
- Calculate the magnitude of the final vector: `magnitude = Math.sqrt(u*u + v*v)`.
- Calculate the maximum possible magnitude if winds were perfectly aligned: `maxMagnitude = sum of all speeds used`.
- If `magnitude < (maxMagnitude * 0.3)` (meaning winds canceled each other out by more than 70% due to swirling or a 180-degree shift), the wind is too variable.
- **Action:** Halt calculation. Do not display the wind feature.

**Step E: Geographic Matching**
- If the vector is valid, use `avgWindDir` to identify the plant:
  - `210 <= dir <= 330`: Beckton Sewage Treatment Works
  - `120 <= dir < 210`: Crossness Sewage Treatment Works
  - `30 <= dir < 120`: Riverside Sewage Treatment Works
- Display the result in the UI.

## Error Handling
- If the Open-Meteo API fails to load or times out, degrade gracefully (hide the wind feature).
- If calculated array indices go out of bounds (e.g., missing historical data at the start of the data array), clamp to the available data.
