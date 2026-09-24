import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A yellow bobby car with a kid riding it: blue bear helmet, navy top,
// light-blue letter leggings and white sneakers. Everything is modelled in
// real-world metres (a bobby car is ~60 cm long, seat ~30 cm high, the kid is
// about three and a half) and then scaled as one piece to match the Volvo,
// which is ~1.3 game units per metre, so the kid is clearly smaller than the car.
const GAME_SCALE = 2.1;
const WHEEL_RADIUS = 0.065;

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const lettersTexture = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#d3e4ec';
  ctx.fillRect(0, 0, w, h);
  const letters = ['A', 'B', 'W', 'I', 'O', 'V', 'M'];
  const colors = ['#d8363a', '#2f9d9a', '#2c5aa0', '#e0a21c', '#b53a6b'];
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let i = 0;
  for (let y = 22; y < h; y += 50) {
    for (let x = 22 + (i % 2 ? 26 : 0); x < w; x += 58) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((i * 47) % 70 - 35) * Math.PI / 180);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(letters[(i * 3) % letters.length], 0, 0);
      ctx.restore();
      i++;
    }
  }
});
lettersTexture.wrapS = lettersTexture.wrapT = THREE.RepeatWrapping;

// Helmet shell texture. The helmet uses the top half of a sphere, so only the
// upper half of the canvas is visible: vents near the top, the yellow bear and
// the round stickers lower down on the sides.
const helmetTexture = canvasTexture(512, 256, (ctx, w, h) => {
  ctx.fillStyle = '#1b4cc0';
  ctx.fillRect(0, 0, w, h);
  const shine = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  shine.addColorStop(0, '#3a73ea');
  shine.addColorStop(1, '#1b4cc0');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, w, h * 0.5);
  // Vent slots
  ctx.fillStyle = '#0f245e';
  for (let x = 20; x < w; x += 64) {
    ctx.beginPath();
    ctx.ellipse(x, h * 0.2, 9, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Yellow bear on both sides
  for (const bx of [w * 0.12, w * 0.62]) {
    const by = h * 0.37;
    ctx.fillStyle = '#f2c230';
    for (const [dx, dy, r] of [[0, 0, 34], [-27, -26, 12], [27, -26, 12]]) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c47d1c';
    for (const dx of [-27, 27]) {
      ctx.beginPath();
      ctx.arc(bx + dx, by - 26, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbe3a0';
    ctx.beginPath();
    ctx.ellipse(bx, by + 11, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    for (const dx of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(bx + dx, by - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(bx, by + 6, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bx, by + 12, 7, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  // Round red-and-white stickers
  for (const [x, y] of [[w * 0.3, h * 0.36], [w * 0.38, h * 0.42], [w * 0.8, h * 0.4], [w * 0.88, h * 0.34]]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7263a';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 7, y - 2, 14, 4);
  }
});

const bobbyLabelTexture = canvasTexture(256, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#b77a00';
  ctx.lineWidth = 5;
  ctx.font = 'italic 900 46px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('bobby car', w / 2, h / 2 + 2);
  ctx.fillText('bobby car', w / 2, h / 2 + 2);
});

const yellow = new THREE.MeshPhysicalMaterial({ color: '#f9b700', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 });
const tire = new THREE.MeshStandardMaterial({ color: '#232427', roughness: 0.9 });
const hubRed = new THREE.MeshStandardMaterial({ color: '#d81f26', roughness: 0.4 });
const hubDark = new THREE.MeshStandardMaterial({ color: '#9e141a', roughness: 0.5 });
const hubRing = new THREE.MeshStandardMaterial({ color: '#f2a900', roughness: 0.45 });
const blackPlastic = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.45 });
const whiteDecal = new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.5 });
const greyMetal = new THREE.MeshStandardMaterial({ color: '#a6abb0', metalness: 0.6, roughness: 0.35 });
const skin = new THREE.MeshStandardMaterial({ color: '#f4d0b5', roughness: 0.7 });
const hair = new THREE.MeshStandardMaterial({ color: '#e6c47c', roughness: 0.85 });
const navy = new THREE.MeshStandardMaterial({ color: '#1f2942', roughness: 0.95 });
const navyCuff = new THREE.MeshStandardMaterial({ color: '#171f33', roughness: 0.95 });
const leggings = new THREE.MeshStandardMaterial({ map: lettersTexture, roughness: 0.9 });
const shoe = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.75 });
const sole = new THREE.MeshStandardMaterial({ color: '#b9b3a6', roughness: 0.9 });
const helmetShell = new THREE.MeshStandardMaterial({ map: helmetTexture, roughness: 0.3, metalness: 0.05 });
const helmetRim = new THREE.MeshStandardMaterial({ color: '#12151c', roughness: 0.6 });
const eyeWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
const eyeDark = new THREE.MeshStandardMaterial({ color: '#3b3a45', roughness: 0.25 });
const brow = new THREE.MeshStandardMaterial({ color: '#c9a064', roughness: 0.9 });
const cheek = new THREE.MeshStandardMaterial({ color: '#f0b39e', roughness: 0.8 });
const lips = new THREE.MeshStandardMaterial({ color: '#c9776a', roughness: 0.7 });
const strap = new THREE.MeshStandardMaterial({ color: '#2a3440', roughness: 0.8 });
const labelMaterial = new THREE.MeshStandardMaterial({ map: bobbyLabelTexture, transparent: true, roughness: 0.4 });

function add(parent, geometry, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const up = new THREE.Vector3(0, 1, 0);
// A rounded tube from one point to another (arms, legs). With an end radius
// it becomes a tapered cylinder, e.g. a thigh narrowing towards the knee.
function limb(parent, from, to, radius, material, endRadius = radius) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = endRadius === radius
    ? new THREE.CapsuleGeometry(radius, Math.max(0.001, length), 6, 14)
    : new THREE.CylinderGeometry(endRadius, radius, length, 14);
  const mesh = add(parent, geometry, material, 0, 0, 0);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  return mesh;
}
function ball(parent, radius, material, x, y, z, sx = 1, sy = 1, sz = 1, shadow = true) {
  const mesh = add(parent, new THREE.SphereGeometry(radius, 20, 14), material, x, y, z, shadow);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

// Side silhouette of the car: low nose, rounded hood, a dip in front of the
// seat, a raised seat and a round tail, with arches cut out for the wheels.
// It is extruded sideways with a thick bevel so every edge is soft plastic.
function bodyGeometry() {
  const wellRadius = 0.1;
  const bottom = 0.085;
  const shape = new THREE.Shape();
  shape.moveTo(-0.255, bottom);
  shape.quadraticCurveTo(-0.3, 0.1, -0.29, 0.19);
  shape.quadraticCurveTo(-0.28, 0.27, -0.2, 0.285);
  shape.quadraticCurveTo(-0.13, 0.295, -0.06, 0.28);
  shape.quadraticCurveTo(-0.02, 0.27, 0.02, 0.245);
  shape.quadraticCurveTo(0.08, 0.25, 0.16, 0.225);
  shape.quadraticCurveTo(0.26, 0.2, 0.285, 0.14);
  shape.quadraticCurveTo(0.3, 0.09, 0.265, bottom);
  // Arch over each wheel, going from the front edge of the well to its back edge.
  for (const centerZ of [0.19, -0.18]) {
    const halfOpening = 0.07;
    const centerY = bottom - Math.sqrt(wellRadius * wellRadius - halfOpening * halfOpening);
    const angle = Math.acos(halfOpening / wellRadius);
    shape.lineTo(centerZ + halfOpening, bottom);
    shape.absarc(centerZ, centerY, wellRadius, angle, Math.PI - angle, false);
  }
  shape.lineTo(-0.255, bottom);
  const width = 0.2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width, curveSegments: 28, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 7,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWheel(parent, x, z, rear) {
  const wheel = new THREE.Group();
  wheel.position.set(x, WHEEL_RADIUS, z);
  parent.add(wheel);
  const side = Math.sign(x);
  // Rounded rubber tyre
  const tyre = add(wheel, new THREE.TorusGeometry(WHEEL_RADIUS - 0.017, 0.017, 12, 30), tire, 0, 0, 0);
  tyre.rotation.y = Math.PI / 2;
  tyre.scale.set(1, 1, 1.35);
  const inner = add(wheel, new THREE.CylinderGeometry(WHEEL_RADIUS - 0.02, WHEEL_RADIUS - 0.02, 0.036, 26), tire, 0, 0, 0);
  inner.rotation.z = Math.PI / 2;
  if (rear) {
    const ring = add(wheel, new THREE.CylinderGeometry(0.045, 0.045, 0.006, 26), hubRing, side * 0.02, 0, 0);
    ring.rotation.z = Math.PI / 2;
  }
  const hubSize = rear ? 0.037 : 0.043;
  const hub = add(wheel, new THREE.CylinderGeometry(hubSize, hubSize * 1.05, 0.008, 26), hubRed, side * 0.022, 0, 0);
  hub.rotation.z = Math.PI / 2;
  const cap = add(wheel, new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12), greyMetal, side * 0.026, 0, 0);
  cap.rotation.z = Math.PI / 2;
  // Five dimples in the hub so the spinning is easy to see
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2;
    const hole = add(wheel, new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 10), hubDark, side * 0.0245, Math.sin(angle) * 0.022, Math.cos(angle) * 0.022, false);
    hole.rotation.z = Math.PI / 2;
  }
  return wheel;
}

export function createBobbyCar() {
  const root = new THREE.Group();
  const model = new THREE.Group();
  model.scale.setScalar(GAME_SCALE);
  root.add(model);

  // ---- The bobby car ----
  add(model, bodyGeometry(), yellow, 0, 0, 0);
  // Headlight "eyes", fuel cap, side labels and a little rear light
  for (const x of [-0.075, 0.075]) {
    const light = add(model, new THREE.CircleGeometry(0.022, 20), whiteDecal, x, 0.215, 0.292, false);
    light.rotation.x = -0.75;
    light.rotation.y = x * 2.2;
    const pupil = add(model, new THREE.CircleGeometry(0.009, 14), blackPlastic, x, 0.2158, 0.2932, false);
    pupil.rotation.copy(light.rotation);
  }
  const fuelRing = add(model, new THREE.TorusGeometry(0.02, 0.006, 8, 20), greyMetal, 0, 0.268, 0.1);
  fuelRing.rotation.x = Math.PI / 2 - 0.25;
  const fuelCap = add(model, new THREE.CylinderGeometry(0.018, 0.018, 0.008, 18), blackPlastic, 0, 0.268, 0.1);
  fuelCap.rotation.x = -0.25;
  for (const side of [-1, 1]) {
    const label = add(model, new THREE.PlaneGeometry(0.15, 0.037), labelMaterial, side * 0.1505, 0.17, 0.1, false);
    label.rotation.y = side * Math.PI / 2;
    label.rotation.z = side * -0.08;
  }
  const rearLight = add(model, new THREE.CircleGeometry(0.018, 18), hubRed, 0, 0.2, -0.318, false);
  rearLight.rotation.y = Math.PI;
  rearLight.rotation.x = -0.4;

  // Steering column and wheel, tilted towards the driver, with a red horn
  limb(model, new THREE.Vector3(0, 0.25, 0.04), new THREE.Vector3(0, 0.395, -0.002), 0.009, blackPlastic);
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(0, 0.4, -0.008);
  steeringWheel.rotation.x = -0.96;
  model.add(steeringWheel);
  const steeringSpin = new THREE.Group();
  steeringWheel.add(steeringSpin);
  add(steeringSpin, new THREE.TorusGeometry(0.066, 0.011, 12, 36), blackPlastic, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const angle = i / 3 * Math.PI * 2 - Math.PI / 2;
    const spoke = add(steeringSpin, new THREE.BoxGeometry(0.06, 0.012, 0.007), blackPlastic, Math.cos(angle) * 0.033, Math.sin(angle) * 0.033, 0);
    spoke.rotation.z = angle;
  }
  const hornRing = add(steeringSpin, new THREE.CylinderGeometry(0.024, 0.024, 0.014, 22), blackPlastic, 0, 0, 0.004);
  hornRing.rotation.x = Math.PI / 2;
  const horn = add(steeringSpin, new THREE.CylinderGeometry(0.019, 0.02, 0.012, 22), hubRed, 0, 0, 0.01);
  horn.rotation.x = Math.PI / 2;
  const hornDot = add(steeringSpin, new THREE.CylinderGeometry(0.007, 0.007, 0.004, 14), hubRing, 0, 0, 0.017, false);
  hornDot.rotation.x = Math.PI / 2;

  const wheels = [
    makeWheel(model, -0.158, 0.19, false), makeWheel(model, 0.158, 0.19, false),
    makeWheel(model, -0.158, -0.18, true), makeWheel(model, 0.158, -0.18, true),
  ];

  // ---- The kid ----
  const hip = new THREE.Vector3(0, 0.365, -0.13);
  const bottomOnSeat = ball(model, 0.075, leggings, 0, 0.35, -0.135, 1.3, 0.55, 1.15);
  bottomOnSeat.rotation.x = 0.1;

  // Upper body pivots at the hips so it can lean into turns.
  const upper = new THREE.Group();
  upper.position.copy(hip);
  model.add(upper);
  const torso = add(upper, new THREE.CapsuleGeometry(0.078, 0.13, 8, 18), navy, 0, 0.13, 0.025);
  torso.rotation.x = 0.22;
  torso.scale.set(1.08, 1, 0.82);
  ball(upper, 0.07, navy, 0, 0.06, 0.035, 1.2, 0.9, 0.95); // tummy
  // Neck, head and face
  add(upper, new THREE.CylinderGeometry(0.028, 0.032, 0.04, 14), skin, 0, 0.265, 0.06);
  const head = new THREE.Group();
  head.position.set(0, 0.35, 0.075);
  upper.add(head);
  ball(head, 0.084, skin, 0, 0, 0, 0.94, 1.02, 0.98);
  ball(head, 0.05, skin, 0, -0.04, 0.03, 1.05, 0.8, 1); // round cheeks and chin
  for (const side of [-1, 1]) {
    ball(head, 0.022, skin, side * 0.08, -0.005, -0.005, 0.45, 1, 0.75); // ears
    ball(head, 0.013, eyeWhite, side * 0.029, 0.004, 0.077, 1, 1.1, 0.55, false);
    ball(head, 0.0085, eyeDark, side * 0.029, 0.003, 0.083, 1, 1.1, 0.5, false);
    ball(head, 0.0025, eyeWhite, side * 0.026, 0.007, 0.0875, 1, 1, 1, false);
    const eyebrow = add(head, new THREE.CapsuleGeometry(0.003, 0.018, 4, 6), brow, side * 0.03, 0.026, 0.079, false);
    eyebrow.rotation.z = Math.PI / 2 + side * 0.12;
    ball(head, 0.015, cheek, side * 0.048, -0.028, 0.066, 1, 0.7, 0.4, false);
  }
  ball(head, 0.011, skin, 0, -0.014, 0.086, 1, 0.8, 0.8, false); // nose
  const smile = add(head, new THREE.TorusGeometry(0.014, 0.0033, 6, 16, Math.PI * 0.75), lips, 0, -0.036, 0.08, false);
  smile.rotation.z = Math.PI + Math.PI * 0.125;
  // Blond hair: fringe under the helmet brim, and tufts at the sides and back
  for (let i = -3; i <= 3; i++) {
    const tuft = ball(head, 0.017, hair, i * 0.014, 0.045 - Math.abs(i) * 0.003, 0.07 - Math.abs(i) * 0.006, 1, 0.8, 0.6);
    tuft.rotation.z = i * 0.15;
  }
  for (const side of [-1, 1]) {
    ball(head, 0.03, hair, side * 0.068, 0.012, -0.032, 0.5, 1.15, 1);
    ball(head, 0.022, hair, side * 0.056, -0.028, -0.05, 0.6, 1, 0.9);
  }
  ball(head, 0.07, hair, 0, -0.012, -0.04, 1.05, 0.9, 0.9);
  // Bike helmet: blue shell tilted up at the front, dark rim, small visor, straps
  const helmet = new THREE.Group();
  helmet.position.set(0, 0.024, -0.008);
  helmet.rotation.x = -0.28;
  head.add(helmet);
  const shell = add(helmet, new THREE.SphereGeometry(0.1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), helmetShell, 0, 0, 0);
  shell.scale.set(0.98, 0.95, 1.14);
  const rim = add(helmet, new THREE.TorusGeometry(0.099, 0.008, 8, 44), helmetRim, 0, 0.001, 0);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.98, 1.14, 1);
  const visor = add(helmet, new THREE.SphereGeometry(0.06, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), helmetShell, 0, 0.018, 0.098);
  visor.rotation.x = 1.05;
  visor.scale.set(1.35, 1, 0.45);
  for (const side of [-1, 1]) {
    limb(head, new THREE.Vector3(side * 0.07, 0.005, 0.005), new THREE.Vector3(side * 0.04, -0.075, 0.03), 0.0035, strap);
    limb(head, new THREE.Vector3(side * 0.07, 0.005, -0.03), new THREE.Vector3(side * 0.04, -0.075, 0.03), 0.0035, strap);
  }
  add(head, new RoundedBoxGeometry(0.014, 0.012, 0.01, 2, 0.003), strap, 0.036, -0.076, 0.032);

  // Arms reaching forward to the steering wheel (coordinates relative to the hips)
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * 0.085, 0.225, 0.045);
    const elbow = new THREE.Vector3(side * 0.125, 0.12, 0.035);
    const wrist = new THREE.Vector3(side * 0.064, 0.052, 0.082);
    ball(upper, 0.036, navy, shoulder.x, shoulder.y, shoulder.z);
    limb(upper, shoulder, elbow, 0.03, navy);
    limb(upper, elbow, wrist, 0.026, navy);
    const cuff = limb(upper, wrist.clone().lerp(elbow, 0.12), wrist, 0.027, navyCuff);
    cuff.scale.y = 0.35;
    ball(upper, 0.022, skin, wrist.x, wrist.y + 0.006, wrist.z + 0.012, 0.9, 0.85, 1.2);
    if (side > 0) {
      const patch = add(upper, new THREE.BoxGeometry(0.004, 0.02, 0.018), whiteDecal, shoulder.x + 0.03, 0.165, 0.065, false);
      patch.rotation.z = 0.3;
    }
  }

  // Legs straddle the car, knees up, feet flat on the ground ready to push.
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.05, hip.y, hip.z + 0.01);
    model.add(leg);
    const knee = new THREE.Vector3(side * 0.12, -0.055, 0.16);
    const ankle = new THREE.Vector3(side * 0.145, -0.29, 0.15);
    limb(leg, new THREE.Vector3(0, 0, 0), knee, 0.04, leggings, 0.034);
    ball(leg, 0.034, leggings, knee.x, knee.y, knee.z);
    limb(leg, knee, ankle, 0.032, leggings, 0.026);
    // Sneaker: white upper, grey sole, round toe and a hint of laces
    const foot = new THREE.Group();
    foot.position.set(ankle.x, ankle.y - 0.035, ankle.z + 0.025);
    foot.rotation.y = side * 0.12;
    leg.add(foot);
    add(foot, new RoundedBoxGeometry(0.052, 0.042, 0.11, 3, 0.018), shoe, 0, 0.004, 0);
    add(foot, new RoundedBoxGeometry(0.056, 0.012, 0.116, 2, 0.005), sole, 0, -0.019, 0);
    ball(foot, 0.024, shoe, 0, -0.002, 0.04, 1.1, 0.8, 0.9);
    add(foot, new THREE.BoxGeometry(0.03, 0.003, 0.04), sole, 0, 0.026, 0.005, false);
    legs.push(leg);
  }

  let wheelSpin = 0;
  let stride = 0;
  let lean = 0;
  return {
    group: root,
    // Spin the wheels with the ground speed and let the feet push like on a real bobby car.
    update(speed, dt, turning) {
      wheelSpin += speed * dt / (WHEEL_RADIUS * GAME_SCALE);
      for (const wheel of wheels) wheel.rotation.x = wheelSpin;
      const moving = Math.min(1, Math.abs(speed) / 2);
      stride += dt * (5 + Math.abs(speed) * 1.1) * moving;
      legs[0].rotation.x = Math.sin(stride) * 0.3 * moving;
      legs[1].rotation.x = -Math.sin(stride) * 0.3 * moving;
      lean = THREE.MathUtils.damp(lean, THREE.MathUtils.clamp(turning, -1, 1) * 0.14, 5, dt);
      upper.rotation.z = -lean;
      upper.position.y = hip.y + Math.abs(Math.sin(stride)) * 0.006 * moving;
      steeringSpin.rotation.z = lean * 3.5;
    },
  };
}
