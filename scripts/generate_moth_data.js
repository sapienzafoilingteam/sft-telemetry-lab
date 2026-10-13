import fs from 'fs';
import path from 'path';

// Math helpers
const deg2rad = (deg) => deg * (Math.PI / 180);
const rad2deg = (rad) => rad * (180 / Math.PI);

function generateMothData(filename, durationSeconds, baseLat, baseLon) {
    const filePath = path.join(process.cwd(), filename);
    const data = [];

    // Header
    data.push('timestamp,latitude,longitude,speed_knots,acceleration_g,height_m,pitch_deg,roll_deg,yaw_deg');

    // Starting parameters
    let lat = baseLat;
    let lon = baseLon;
    let heading = 45; // degrees (Northeast)
    let speedKnots = 10; // start at 10 knots (displacement mode)
    let heightStrut = 0; // m (hull in water)
    let pitch = 2; // nose slightly up
    let roll = 5; // heeling slightly
    let yaw = heading;

    const sampleRateHz = 10; // 10 samples per second
    const totalSamples = durationSeconds * sampleRateHz;

    let flightState = 'taking_off'; // taking_off, foiling, tacking, foiling, splashing
    let timeInState = 0;

    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRateHz; // seconds
        timeInState += 1 / sampleRateHz;

        // State machine logic
        if (flightState === 'taking_off' && timeInState > 10) {
            flightState = 'foiling';
            timeInState = 0;
        } else if (flightState === 'foiling' && timeInState > 60) {
            // tack or gybe every 60s
            flightState = 'tacking';
            timeInState = 0;
        } else if (flightState === 'tacking' && timeInState > 8) {
            flightState = 'foiling';
            timeInState = 0;
        }

        // Smooth transitions for variables based on state
        if (flightState === 'taking_off') {
            speedKnots += 0.2 + (Math.random() * 0.1); // accelerate to 20-25 knots
            if (speedKnots > 16) {
                heightStrut += 0.05; // pop onto foils
                pitch = Math.max(0, pitch - 0.1); // level out
                roll = Math.max(-15, roll - 0.5); // hike out/windward heel
            }
        } else if (flightState === 'foiling') {
            speedKnots = 22 + Math.sin(t * 0.1) * 3 + (Math.random() * 2 - 1);
            heightStrut = 0.8 + Math.sin(t * 0.5) * 0.1 + (Math.random() * 0.05); // flying at 0.8m
            pitch = 0 + (Math.random() * 1 - 0.5);
            roll = -15 + Math.sin(t * 0.2) * 2; // windward heel
        } else if (flightState === 'tacking') {
            speedKnots = Math.max(8, speedKnots - 1); // slow down
            heightStrut = Math.max(0, heightStrut - 0.1); // drop off foils occasionally, or touch down
            heading += 100 / (8 * sampleRateHz); // turn 100 degrees over 8 seconds
            roll = 15; // switch heel
            pitch = 2;
        }

        // Cap values
        speedKnots = Math.min(32, Math.max(0, speedKnots));
        heightStrut = Math.min(1.2, Math.max(0, heightStrut));
        yaw = heading % 360;

        // Kinematics (approximate distance traveled)
        // 1 knot = 0.514444 m/s
        const speedMs = speedKnots * 0.514444;
        const distanceM = speedMs * (1 / sampleRateHz);

        // Update lat/lon (rough approximation: 111,111 meters per degree lat)
        const dLat = (distanceM * Math.cos(deg2rad(heading))) / 111111;
        const dLon = (distanceM * Math.sin(deg2rad(heading))) / (111111 * Math.cos(deg2rad(lat)));

        lat += dLat;
        lon += dLon;

        // Add noise to acceleration to simulate IMU
        const accG = (speedKnots > 15 ? 1.0 : 1.0) + (Math.random() * 0.4 - 0.2) + (flightState === 'tacking' ? 0.5 : 0);

        data.push(`${t.toFixed(2)},${lat.toFixed(6)},${lon.toFixed(6)},${speedKnots.toFixed(2)},${accG.toFixed(2)},${heightStrut.toFixed(2)},${pitch.toFixed(2)},${roll.toFixed(2)},${yaw.toFixed(2)}`);
    }

    fs.writeFileSync(filePath, data.join('\n'));
    console.log(`Generated ${filename} with ${totalSamples} samples.`);
}

// Generate a few different tracks
generateMothData('dummy_data_garda.csv', 120, 45.8693, 10.8655); // Lake Garda approx
generateMothData('dummy_data_sydney.csv', 180, -33.840, 151.250); // Sydney Habour approx
generateMothData('dummy_data_weymouth.csv', 90, 50.592, -2.454); // Weymouth approx
