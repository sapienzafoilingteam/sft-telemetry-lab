import fs from 'fs';
import path from 'path';

// Math helpers
const deg2rad = (deg) => deg * (Math.PI / 180);

function generateDualData(namePrefix, durationSeconds, baseLat, baseLon) {
    const gpsPath = path.join(process.cwd(), `dummy_gps_${namePrefix}.csv`);
    const imuPath = path.join(process.cwd(), `dummy_imu_${namePrefix}.csv`);

    const gpsData = [];
    const imuData = [];

    // Headers modeling NEO-6M (None) and BNO055
    imuData.push('timestamp_ms,pitch_deg,roll_deg,yaw_deg,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z');

    const gpsRateHz = 2; // NEO-6M commonly runs at 1-5Hz
    const imuRateHz = 50; // BNO055 can go to 100Hz, using 50Hz for file size

    const totalGpsSamples = durationSeconds * gpsRateHz;
    const totalImuSamples = durationSeconds * imuRateHz;

    // Flight state variables
    let lat = baseLat;
    let lon = baseLon;
    let heading = 45;
    let speedKnots = 10;
    let heightStrut = 0;
    let pitch = 2;
    let roll = 5;
    let yaw = heading;

    let flightState = 'taking_off';
    let timeInState = 0;

    // Since rates differ, we simulate continuous underlying physics and sample at the right times
    let currentTimeMs = 0;
    let nextGpsTimeMs = 0;
    let nextImuTimeMs = 0;

    const stepMs = 10; // Physics engine step

    while (currentTimeMs < durationSeconds * 1000) {
        const t = currentTimeMs / 1000;
        timeInState += stepMs / 1000;

        // Physics update
        if (flightState === 'taking_off' && timeInState > 10) {
            flightState = 'foiling';
            timeInState = 0;
        } else if (flightState === 'foiling' && timeInState > 60) {
            flightState = 'tacking';
            timeInState = 0;
        } else if (flightState === 'tacking' && timeInState > 8) {
            flightState = 'foiling';
            timeInState = 0;
        }

        if (flightState === 'taking_off') {
            speedKnots += (0.2 + (Math.random() * 0.1)) * (stepMs / 100);
            if (speedKnots > 16) {
                heightStrut = Math.min(1.0, heightStrut + 0.05 * (stepMs / 100));
                pitch = Math.max(0, pitch - 0.1 * (stepMs / 100));
                roll = Math.max(-15, roll - 0.5 * (stepMs / 100));
            }
        } else if (flightState === 'foiling') {
            speedKnots = 22 + Math.sin(t * 0.1) * 3 + (Math.random() * 2 - 1);
            heightStrut = 0.8 + Math.sin(t * 0.5) * 0.1 + (Math.random() * 0.05);
            pitch = 0 + (Math.random() * 1 - 0.5);
            roll = -15 + Math.sin(t * 0.2) * 2;
        } else if (flightState === 'tacking') {
            speedKnots = Math.max(8, speedKnots - 1 * (stepMs / 100));
            heightStrut = Math.max(0, heightStrut - 0.1 * (stepMs / 100));
            heading += (100 / 8) * (stepMs / 1000); // 100 deg over 8 sec
            roll = 15;
            pitch = 2;
        }

        speedKnots = Math.min(32, Math.max(0, speedKnots));
        heightStrut = Math.min(1.2, Math.max(0, heightStrut));
        yaw = heading % 360;

        // Distance
        const speedMs = speedKnots * 0.514444;
        const distanceM = speedMs * (stepMs / 1000);
        const dLat = (distanceM * Math.cos(deg2rad(heading))) / 111111;
        const dLon = (distanceM * Math.sin(deg2rad(heading))) / (111111 * Math.cos(deg2rad(lat)));

        lat += dLat;
        lon += dLon;

        // Sample GPS
        if (currentTimeMs >= nextGpsTimeMs) {
            // Create a fake YYYYMMDD and HHMMSS based on start time padding
            const dateStr = `20260305`;
            const tSecondsOffset = Math.floor(currentTimeMs / 1000);
            const startHour = 14; const startMin = 50; const startSec = 36;
            let s = startSec + tSecondsOffset;
            let m = startMin + Math.floor(s / 60);
            let h = startHour + Math.floor(m / 60);
            s = s % 60; m = m % 60; h = h % 24;
            const timeStr = `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`;

            const sats = 7 + Math.floor(Math.random() * 2); // 7 or 8 sats
            // Format: YYYYMMDD, HHMMSS, Lat, Lon, Speed, Sats
            gpsData.push(`${dateStr},${timeStr},${lat.toFixed(6)},${lon.toFixed(6)},${speedKnots.toFixed(2)},${sats}`);
            nextGpsTimeMs += (1000 / gpsRateHz);
        }

        // Sample IMU (BNO055)
        if (currentTimeMs >= nextImuTimeMs) {
            // Simulate acceleration (Gravity + Linear Accel) -> Z=~9.8 m/s^2
            // Adding noise + bumpiness based on speed/state
            const bump = (speedKnots > 15 ? 0.3 : 0.1) * Math.random();
            const a_x = ((flightState === 'tacking' ? -2.0 : 0) + (Math.random() - 0.5)).toFixed(2);
            const a_y = ((flightState === 'taking_off' ? 1.5 : 0) + (Math.random() - 0.5)).toFixed(2);
            const a_z = (9.81 + bump + (flightState === 'tacking' ? 0.5 : 0)).toFixed(2);

            const g_x = ((Math.random() - 0.5) * 10).toFixed(2); // gyro noisy
            const g_y = ((Math.random() - 0.5) * 10).toFixed(2);
            const g_z = ((flightState === 'tacking' ? 12.5 : 0) + (Math.random() - 0.5) * 5).toFixed(2);

            imuData.push(`${currentTimeMs},${pitch.toFixed(2)},${roll.toFixed(2)},${yaw.toFixed(2)},${a_x},${a_y},${a_z},${g_x},${g_y},${g_z}`);
            nextImuTimeMs += (1000 / imuRateHz);
        }

        currentTimeMs += stepMs;
    }

    fs.writeFileSync(gpsPath, gpsData.join('\n'));
    fs.writeFileSync(imuPath, imuData.join('\n'));
    console.log(`Generated GPS and IMU data for: ${namePrefix}`);
}

generateDualData('garda', 60, 45.8693, 10.8655);
generateDualData('sydney', 90, -33.840, 151.250);
generateDualData('weymouth', 45, 50.592, -2.454);
