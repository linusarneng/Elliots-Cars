import * as THREE from 'three';

// NPC traffic for the open world: cars follow closed loops along the roads
// (driving on the right), keep their distance, stop at red lights and stop
// signs, and wait for the player instead of running into them.
const LANE = 2.5;
const CRUISE = 7;
const CORNER_RADIUS = 5;
const LIGHT_CYCLE = [
  { ns: 'green', ew: 'red', time: 8 },
  { ns: 'yellow', ew: 'red', time: 2 },
  { ns: 'red', ew: 'red', time: 1 },
  { ns: 'red', ew: 'green', time: 8 },
  { ns: 'red', ew: 'yellow', time: 2 },
  { ns: 'red', ew: 'red', time: 1 },
];
const CYCLE_LENGTH = LIGHT_CYCLE.reduce((sum, phase) => sum + phase.time, 0);
const PAINTS = ['#c0392b', '#2e86de', '#f1c40f', '#ecf0f1', '#27ae60', '#8e44ad', '#e67e22', '#34495e', '#95a5a6', '#16a085', '#d35400', '#1abc9c'];

const right = (d) => new THREE.Vector2(-d.y, d.x);

// Build a smooth path through road-centre nodes, shifted into the right-hand lane.
function lanePath(nodes) {
  const count = nodes.length;
  const corners = nodes.map((node, i) => {
    const prev = nodes[(i - 1 + count) % count];
    const next = nodes[(i + 1) % count];
    const dIn = new THREE.Vector2(node[0] - prev[0], node[1] - prev[1]).normalize();
    const dOut = new THREE.Vector2(next[0] - node[0], next[1] - node[1]).normalize();
    const point = new THREE.Vector2(node[0], node[1]);
    if (dIn.dot(dOut) > 0.99) point.addScaledVector(right(dIn), LANE);
    else point.addScaledVector(right(dIn), LANE).addScaledVector(right(dOut), LANE);
    return { point, dIn, dOut, straight: dIn.dot(dOut) > 0.99 };
  });
  const path = new THREE.CurvePath();
  const v3 = (p) => new THREE.Vector3(p.x, 0, p.y);
  const turns = corners.filter((corner) => !corner.straight).map((corner) => ({
    corner,
    entry: corner.point.clone().addScaledVector(corner.dIn, -CORNER_RADIUS),
    exit: corner.point.clone().addScaledVector(corner.dOut, CORNER_RADIUS),
  }));
  turns.forEach((turn, k) => {
    const next = turns[(k + 1) % turns.length];
    path.add(new THREE.QuadraticBezierCurve3(v3(turn.entry), v3(turn.corner.point), v3(turn.exit)));
    path.add(new THREE.LineCurve3(v3(turn.exit), v3(next.entry)));
  });
  return path;
}

export function createTraffic({ loops, lightNode, signNodes, parkedSpots, random }) {
  const group = new THREE.Group();
  const paths = loops.map((loop) => {
    const path = lanePath(loop.nodes);
    const length = path.getLength();
    // Pre-sample positions and headings for cheap lookups every frame.
    const step = 0.5;
    const samples = [];
    for (let s = 0; s < length; s += step) {
      const u = s / length;
      const p = path.getPointAt(u);
      const t = path.getTangentAt(u);
      samples.push({ x: p.x, z: p.z, heading: Math.atan2(t.x, t.z) });
    }
    // Stops: a red-light line before the main crossing, stop signs before T-junctions.
    const stops = [];
    const checkNode = (node, type, axisFilter) => {
      for (let i = 1; i < samples.length; i++) {
        const a = samples[i - 1];
        const b = samples[i];
        const da = Math.hypot(a.x - node[0], a.z - node[1]);
        const db = Math.hypot(b.x - node[0], b.z - node[1]);
        if (da > 8 && db <= 8) {
          const axis = Math.abs(Math.sin(b.heading)) > Math.abs(Math.cos(b.heading)) ? 'ew' : 'ns';
          if (!axisFilter || axis === axisFilter) stops.push({ s: i * step, type, axis, node });
        }
      }
    };
    checkNode(lightNode, 'light');
    for (const sign of signNodes) checkNode(sign.node, 'sign', sign.stem);
    stops.sort((a, b) => a.s - b.s);
    return { samples, length, step, stops };
  });

  const cars = [];
  loops.forEach((loop, pathIndex) => {
    for (let i = 0; i < loop.cars; i++) {
      const path = paths[pathIndex];
      cars.push({ index: cars.length, path, s: ((i + pathIndex * 0.37) / loop.cars + random() * 0.05) % 1 * path.length, speed: 0, x: 0, z: 0, heading: 0, waited: 0, clearedStop: -1 });
    }
  });
  const moving = cars.length;
  const parked = parkedSpots.map(([x, z, heading]) => ({ x, z, heading }));
  const colors = [...cars, ...parked].map((_, i) => new THREE.Color(PAINTS[(i * 7) % PAINTS.length]));

  // Blend between the two nearest samples so cars glide instead of stepping.
  const blended = { x: 0, z: 0, heading: 0 };
  function sample(path, s, out = blended) {
    const wrapped = ((s % path.length) + path.length) % path.length;
    const exact = wrapped / path.step;
    const i = Math.floor(exact) % path.samples.length;
    const a = path.samples[i];
    const b = path.samples[(i + 1) % path.samples.length];
    const t = exact - Math.floor(exact);
    out.x = a.x + (b.x - a.x) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.heading = a.heading + Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading)) * t;
    return out;
  }
  for (const car of cars) {
    const point = sample(car.path, car.s);
    car.x = point.x;
    car.z = point.z;
    car.heading = point.heading;
  }

  function lightState(time) {
    let t = time % CYCLE_LENGTH;
    for (const phase of LIGHT_CYCLE) {
      if (t < phase.time) return phase;
      t -= phase.time;
    }
    return LIGHT_CYCLE[0];
  }

  // ---- Car meshes: one instanced mesh per part of the Volvo model ----
  let parts = [];
  const matrix = new THREE.Matrix4();
  const carMatrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  function writeCar(index, car) {
    quaternion.setFromAxisAngle(up, car.heading);
    carMatrix.compose(new THREE.Vector3(car.x, 0, car.z), quaternion, unitScale);
    for (const part of parts) {
      matrix.multiplyMatrices(carMatrix, part.relative);
      part.mesh.setMatrixAt(index, matrix);
    }
  }
  function setCarModel(root, meshes, paintMaterial) {
    root.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const total = moving + parked.length;
    parts = meshes.map((source) => {
      const isPaint = source.material === paintMaterial;
      let material = source.material;
      if (isPaint) {
        material = paintMaterial.clone();
        material.color.set('#ffffff');
      } else if (material.emissive && material.emissiveIntensity === 0) {
        material = material.clone(); // reverse lamps: keep NPC lamps dark
      }
      const mesh = new THREE.InstancedMesh(source.geometry, material, total);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (isPaint) colors.forEach((color, i) => mesh.setColorAt(i, color));
      group.add(mesh);
      return { mesh, relative: new THREE.Matrix4().multiplyMatrices(rootInverse, source.matrixWorld) };
    });
    cars.forEach((car, i) => writeCar(i, car));
    parked.forEach((spot, i) => writeCar(moving + i, spot));
    for (const part of parts) {
      part.mesh.instanceMatrix.needsUpdate = true;
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- Per-frame driving ----
  function update(dt, time, player) {
    const light = lightState(time);
    for (const car of cars) {
      const { path } = car;
      let target = CRUISE;
      // Slow down for bends
      const ahead = sample(path, car.s + 7);
      const turn = Math.abs(Math.atan2(Math.sin(ahead.heading - car.heading), Math.cos(ahead.heading - car.heading)));
      target *= THREE.MathUtils.clamp(1 - turn * 0.55, 0.45, 1);
      // Lights and stop signs
      for (const stop of path.stops) {
        let distance = stop.s - (car.s % path.length);
        if (distance < -1) distance += path.length;
        if (distance > 28 || distance < -1) continue;
        let mustStop = false;
        if (stop.type === 'light') {
          const state = light[stop.axis];
          mustStop = state === 'red' || (state === 'yellow' && distance > 5);
        } else if (car.clearedStop !== stop) {
          mustStop = true;
          if (distance < 1.2 && car.speed < 0.3) {
            car.waited += dt;
            // Go once the junction is clear
            const busy = cars.some((other) => other !== car && other.speed > 0.5 && Math.hypot(other.x - stop.node[0], other.z - stop.node[1]) < 11);
            if (car.waited > 1.2 && !busy) {
              car.clearedStop = stop;
              car.waited = 0;
              mustStop = false;
            }
          }
        }
        if (mustStop) target = Math.min(target, Math.sqrt(Math.max(0, distance - 0.3) * 2 * 6));
        break;
      }
      // Keep a gap to anything in front: other cars and the player.
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      for (let o = 0; o <= cars.length; o++) {
        const other = o < cars.length ? cars[o] : player;
        if (!other) continue;
        if (other === car) continue;
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const along = dx * fx + dz * fz;
        const side = Math.abs(dx * fz - dz * fx);
        if (along <= 0) continue;
        if (along < 14 && side < 2.6) {
          target = Math.min(target, Math.max(0, along - 6.5) * 1.4);
        } else if (along < 8 && side < 5.5 && other.path) {
          // A car crossing close in front: give way, unless it is also waiting for us
          // and we have priority (lower index), so two cars never block each other.
          const ofx = Math.sin(other.heading);
          const ofz = Math.cos(other.heading);
          const theySeeUs = -dx * ofx - dz * ofz > 0;
          if (!(theySeeUs && car.index < other.index)) target = Math.min(target, Math.max(0, along - 5) * 1.2);
        } else if (along < 8 && side < 4 && !other.path) {
          target = 0; // the player
        }
      }
      const rate = target < car.speed ? 9 : 3;
      car.speed = THREE.MathUtils.clamp(car.speed + Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), rate * dt), 0, CRUISE);
      car.s = (car.s + car.speed * dt) % path.length;
      if (car.clearedStop !== -1) {
        // Forget the stop sign once the car is well past it.
        const past = (car.s - car.clearedStop.s + path.length) % path.length;
        if (past > 3 && past < path.length - 30) car.clearedStop = -1;
      }
      const point = sample(path, car.s);
      car.x = point.x;
      car.z = point.z;
      car.heading = point.heading;
    }
    if (parts.length) {
      cars.forEach((car, i) => writeCar(i, car));
      for (const part of parts) part.mesh.instanceMatrix.needsUpdate = true;
    }
    return light;
  }

  // Solid circles for the player's collision test (three along each car).
  // Fills (and reuses) the player's collision list: three circles along each car.
  const allCars = [...cars, ...parked];
  function solidCircles(out, offsetX = 0) {
    let n = 0;
    for (const car of allCars) {
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      for (let k = -1; k <= 1; k++) {
        const circle = out[n] || (out[n] = { x: 0, z: 0, r: 1.15 });
        circle.x = car.x + fx * k * 1.9 + offsetX;
        circle.z = car.z + fz * k * 1.9;
        n++;
      }
    }
    out.length = n;
    return out;
  }

  return { group, cars, update, setCarModel, solidCircles, lightState };
}
