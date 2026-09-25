import * as THREE from 'three';
import { createMcDonalds } from './mcdonalds.js';
import { createTraffic } from './traffic.js';

// Free-roam town: a compact grid of streets with the level locations in its
// blocks (a McDonald's you can drive into, the garage yard, ICA and the
// roundabout), houses and forest all around, traffic lights, stop signs and
// NPC cars. It lives far from the level area so the two never share a view.
const OFFSET_X = 3000;
const BOUNDS = { minX: -80, maxX: 150, minZ: -70, maxZ: 145 };
const TILE = 12.75; // asphalt texture size, matching the levels
const ROAD = 10;
const H_ROADS = [-35, 38, 110]; // z of the east-west streets
const V_ROADS = [-45, 36, 112]; // x of the north-south streets
const node = (x, z) => [x, z];
const NW = node(-45, -35), N = node(36, -35), NE = node(112, -35);
const W = node(-45, 38), C = node(36, 38), E = node(112, 38);
const SW = node(-45, 110), S = node(36, 110), SE = node(112, 110);
const MCD_ORIGIN = [-2, -14];

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const M = {
  sidewalk: std('#b9b8b1', { roughness: 0.95 }),
  curb: std('#9a9d98'),
  paint: new THREE.MeshBasicMaterial({ color: '#e9ebe6' }),
  yellowPaint: new THREE.MeshBasicMaterial({ color: '#f2c230' }),
  pole: std('#8d969a', { metalness: 0.55, roughness: 0.45 }),
  darkPole: std('#2f3438', { metalness: 0.4, roughness: 0.5 }),
  lampGlow: new THREE.MeshBasicMaterial({ color: '#fff3cd' }),
  wood: std('#9a6b43'),
  darkWood: std('#6e4a2e'),
  hedge: std('#4f7a3f', { roughness: 1 }),
  flowerRed: std('#e05a6a'),
  flowerYellow: std('#f5d44a'),
  flowerWhite: std('#f7f3ea'),
  water: new THREE.MeshStandardMaterial({ color: '#4d9fc4', roughness: 0.15, metalness: 0.1 }),
  sand: std('#e3cf97', { roughness: 1 }),
  rubber: std('#c0533f', { roughness: 1 }),
  red: std('#d8362d'),
  yellow: std('#f5c030'),
  blue: std('#2e7fd1'),
  green: std('#3f9a52'),
  pink: std('#ff8fb1'),
  cone: std('#d9a35f'),
  cream: std('#fbe3c4'),
  white: std('#f4f2ec'),
  grey: std('#6f7479'),
  bin: std('#3c6e47'),
  hydrant: std('#c9302c', { roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: '#8fb8cc', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 }),
  window: std('#6f93a8', { roughness: 0.2, metalness: 0.2 }),
  door: std('#6b4a35'),
  chimney: std('#7b4b3d'),
  walls: ['#e3d6bf', '#c9d9e0', '#e8c8b6', '#d6e2cc', '#f1e6c8', '#bfcbd6', '#e6b9a6'].map((c) => std(c)),
  roofs: ['#9a4e45', '#5f6f7a', '#7a5a45', '#4f5f52'].map((c) => std(c)),
  trunk: std('#5b4937', { roughness: 1 }),
  crowns: ['#3f6b3a', '#4a743f', '#5d8445', '#355f36'].map((c) => std(c, { roughness: 1 })),
};

function textureFrom(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function octagon(ctx, w, radius) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2;
    ctx.lineTo(w / 2 + Math.cos(a) * radius, w / 2 + Math.sin(a) * radius);
  }
  ctx.fill();
}
const stopSignMaterial = new THREE.MeshBasicMaterial({ map: textureFrom(128, 128, (ctx, w) => {
  ctx.fillStyle = '#ffffff';
  octagon(ctx, w, 62);
  ctx.fillStyle = '#c8202a';
  octagon(ctx, w, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STOP', w / 2, w / 2 + 2);
}), transparent: true, side: THREE.DoubleSide });
const busSignMaterial = new THREE.MeshBasicMaterial({ map: textureFrom(128, 128, (ctx, w) => {
  ctx.fillStyle = '#f2c230'; ctx.fillRect(0, 0, w, w);
  ctx.fillStyle = '#1d5fa8'; ctx.fillRect(8, 8, w - 16, w - 16);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('BUSS', w / 2, w / 2 + 2);
}), side: THREE.DoubleSide });
const iceCreamSignMaterial = new THREE.MeshBasicMaterial({ map: textureFrom(256, 64, (ctx, w, h) => {
  ctx.fillStyle = '#ff8fb1'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 38px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('GLASS', w / 2, h / 2 + 2);
}) });

export function createOpenWorld({ environments, asphaltTexture, grassMaterial, mergeStatic, random, signTexture, archesTexture }) {
  const group = new THREE.Group();
  group.position.x = OFFSET_X;
  group.visible = false;
  const props = new THREE.Group(); // everything static, merged at the end
  const paving = new THREE.Group();
  group.add(props, paving);
  const boxes = [];
  const circles = [];
  const solidMeshes = [];

  // ---- helpers (coordinates are local to the town) ----
  function box(parent, w, h, d, material, x, y, z, solid = false, rotY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = h > 0.2;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) solidMeshes.push(mesh);
    return mesh;
  }
  function cyl(parent, r, h, material, x, y, z, solid = false, segments = 12, rBottom = r) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, rBottom, h, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) circles.push({ x: x + OFFSET_X, z, r: Math.max(r, rBottom) });
    return mesh;
  }
  function ball(parent, r, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function flat(parent, material, minX, maxX, minZ, maxZ, y, worldUV = false) {
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const geometry = new THREE.PlaneGeometry(width, depth);
    if (worldUV) {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (minX + uv.getX(i) * width) / TILE, (minZ + uv.getY(i) * depth) / TILE);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((minX + maxX) / 2, y, (minZ + maxZ) / 2);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const nearNode = (x, z, radius) => [NW, N, NE, W, C, E, SW, S, SE].some(([nx, nz]) => Math.hypot(x - nx, z - nz) < radius);

  // ---- Ground, blocks, streets, sidewalks and markings ----
  const roadTexture = asphaltTexture.clone();
  roadTexture.repeat.set(1, 1);
  roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.needsUpdate = true;
  const asphalt = new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.96, metalness: 0.02 });
  const lotAsphalt = new THREE.MeshStandardMaterial({ map: roadTexture, color: '#e4e4e4', roughness: 0.96 });
  flat(paving, grassMaterial, BOUNDS.minX - 120, BOUNDS.maxX + 120, BOUNDS.minZ - 120, BOUNDS.maxZ + 120, -0.08);
  for (const [minX, maxX, minZ, maxZ] of [[-40, 31, -30, 33], [41, 107, -30, 33], [-40, 31, 43, 105], [41, 107, 43, 105]]) {
    flat(paving, lotAsphalt, minX, maxX, minZ, maxZ, -0.04, true);
    // A flat sidewalk band round each block makes the streets easy to read.
    flat(paving, M.sidewalk, minX, maxX, minZ, minZ + 2.2, -0.025);
    flat(paving, M.sidewalk, minX, maxX, maxZ - 2.2, maxZ, -0.025);
    flat(paving, M.sidewalk, minX, minX + 2.2, minZ, maxZ, -0.026);
    flat(paving, M.sidewalk, maxX - 2.2, maxX, minZ, maxZ, -0.026);
  }
  for (const z of H_ROADS) flat(paving, asphalt, V_ROADS[0] - 5, V_ROADS[2] + 5, z - 5, z + 5, -0.03, true);
  for (const x of V_ROADS) flat(paving, asphalt, x - 5, x + 5, H_ROADS[0] - 5, H_ROADS[2] + 5, -0.031, true);
  // Sidewalks with kerbs on the outer side of the ring
  const spanX = [V_ROADS[0] - 9, V_ROADS[2] + 9];
  const spanZ = [H_ROADS[0] - 9, H_ROADS[2] + 9];
  flat(paving, M.sidewalk, spanX[0], spanX[1], H_ROADS[0] - 9, H_ROADS[0] - 5, -0.02);
  flat(paving, M.sidewalk, spanX[0], spanX[1], H_ROADS[2] + 5, H_ROADS[2] + 9, -0.02);
  flat(paving, M.sidewalk, V_ROADS[0] - 9, V_ROADS[0] - 5, spanZ[0], spanZ[1], -0.021);
  flat(paving, M.sidewalk, V_ROADS[2] + 5, V_ROADS[2] + 9, spanZ[0], spanZ[1], -0.021);
  box(props, spanX[1] - spanX[0], 0.18, 0.3, M.curb, (spanX[0] + spanX[1]) / 2, 0.02, spanZ[0]);
  box(props, spanX[1] - spanX[0], 0.18, 0.3, M.curb, (spanX[0] + spanX[1]) / 2, 0.02, spanZ[1]);
  box(props, 0.3, 0.18, spanZ[1] - spanZ[0], M.curb, spanX[0], 0.02, (spanZ[0] + spanZ[1]) / 2);
  box(props, 0.3, 0.18, spanZ[1] - spanZ[0], M.curb, spanX[1], 0.02, (spanZ[0] + spanZ[1]) / 2);
  // Dashed centre lines, left out at the junctions
  for (const z of H_ROADS) {
    for (let x = V_ROADS[0]; x < V_ROADS[2]; x += 6) if (!nearNode(x, z, 9)) flat(paving, M.paint, x, x + 3, z - 0.1, z + 0.1, -0.015);
  }
  for (const x of V_ROADS) {
    for (let z = H_ROADS[0]; z < H_ROADS[2]; z += 6) if (!nearNode(x, z, 9)) flat(paving, M.paint, x - 0.1, x + 0.1, z, z + 3, -0.015);
  }
  function zebra(cx, cz, alongX) {
    for (let i = -4; i <= 4; i++) {
      if (alongX) flat(paving, M.paint, cx - 1.2, cx + 1.2, cz + i * 1.05 - 0.35, cz + i * 1.05 + 0.35, -0.014);
      else flat(paving, M.paint, cx + i * 1.05 - 0.35, cx + i * 1.05 + 0.35, cz - 1.2, cz + 1.2, -0.014);
    }
  }
  // Main crossing: zebra crossings and stop lines on every arm
  const arms = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dz] of arms) {
    zebra(C[0] + dx * 9, C[1] + dz * 9, dx !== 0);
    const lx = C[0] + dx * 6.6;
    const lz = C[1] + dz * 6.6;
    if (dx !== 0) flat(paving, M.paint, lx - 0.25, lx + 0.25, dx > 0 ? C[1] - 5 : C[1], dx > 0 ? C[1] : C[1] + 5, -0.013);
    else flat(paving, M.paint, dz > 0 ? C[0] : C[0] - 5, dz > 0 ? C[0] + 5 : C[0], lz - 0.25, lz + 0.25, -0.013);
  }
  // T-junctions: STOP sign, stop line and zebra crossing on the side street
  const signs = [
    { node: N, stem: 'ns', d: [0, -1] }, { node: S, stem: 'ns', d: [0, 1] },
    { node: W, stem: 'ew', d: [-1, 0] }, { node: E, stem: 'ew', d: [1, 0] },
  ];
  for (const sign of signs) {
    const [dx, dz] = sign.d;
    const [nx, nz] = sign.node;
    const rx = -dz;
    const rz = dx;
    const lx = nx - dx * 6.6;
    const lz = nz - dz * 6.6;
    if (dx !== 0) flat(paving, M.paint, lx - 0.3, lx + 0.3, Math.min(nz, nz + rz * 5), Math.max(nz, nz + rz * 5), -0.013);
    else flat(paving, M.paint, Math.min(nx, nx + rx * 5), Math.max(nx, nx + rx * 5), lz - 0.3, lz + 0.3, -0.013);
    zebra(nx - dx * 9, nz - dz * 9, dx !== 0);
    const sx = nx - dx * 7 + rx * 6.2;
    const sz = nz - dz * 7 + rz * 6.2;
    cyl(props, 0.07, 3, M.pole, sx, 1.5, sz, true, 8);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), stopSignMaterial);
    plate.position.set(sx, 3.1, sz);
    plate.rotation.y = Math.atan2(-dx, -dz);
    props.add(plate);
  }

  // ---- The level locations, placed in the blocks ----
  const placements = [
    { key: 'garage', x: 74, z: 0, turn: 0 },
    { key: 'store', x: 5, z: 72, turn: Math.PI },
    { key: 'roundabout', x: 77.5, z: 70, turn: Math.PI },
  ];
  const clones = [];
  for (const placement of placements) {
    const place = environments[placement.key].clone(true);
    place.visible = true;
    // Leave out the level fences and the filler scenery around each level.
    const remove = [];
    place.traverse((child) => { if (child.name === 'boundary' || child.userData.filler) remove.push(child); });
    for (const child of remove) child.removeFromParent();
    place.position.set(placement.x, 0, placement.z);
    place.rotation.y = placement.turn;
    group.add(place);
    clones.push({ place, key: placement.key });
  }

  // ---- McDonald's block ----
  const mcd = createMcDonalds({ signTexture, archesTexture });
  mcd.group.position.set(MCD_ORIGIN[0], 0, MCD_ORIGIN[1]);
  group.add(mcd.group);
  // Parking stalls either side of the walkway to the door
  for (const [from, to] of [[-15, -6.5], [4.5, 27]]) {
    for (let x = from; x <= to + 0.01; x += 3.4) {
      flat(paving, M.paint, x - 0.08, x + 0.08, 3, 10.5, -0.012);
      flat(paving, M.paint, x - 0.08, x + 0.08, 22, 29.5, -0.012);
    }
  }
  flat(paving, M.paint, -15, 27, 10.4, 10.6, -0.012);
  flat(paving, M.paint, -15, 27, 21.9, 22.1, -0.012);
  // Painted walkway to the door, with bollards
  for (let i = 0; i < 6; i++) flat(paving, M.yellowPaint, -5.5 + i * 1.8, -4.8 + i * 1.8, -3.5, 10, -0.011);
  for (const x of [-6, 2]) for (const z of [-2, 2]) cyl(props, 0.18, 1, M.yellow, x, 0.5, z, true, 10);
  // Drive-thru lane along the east side, with arrows and an order point
  flat(paving, M.yellowPaint, 13.6, 13.8, -28, 1, -0.012);
  flat(paving, M.yellowPaint, 19.4, 19.6, -28, 1, -0.012);
  for (let z = -24; z < 0; z += 8) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2, 3), M.paint);
    arrow.rotation.x = -Math.PI / 2;
    arrow.scale.z = 0.05;
    arrow.position.set(16.5, -0.01, z);
    paving.add(arrow);
  }
  box(props, 0.2, 2.6, 2.6, M.darkPole, 20.5, 1.8, -10, true);
  const orderBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: archesTexture }));
  orderBoard.position.set(20.38, 2.1, -10);
  orderBoard.rotation.y = -Math.PI / 2;
  props.add(orderBoard);
  cyl(props, 0.15, 1.2, M.darkPole, 20.2, 0.6, -15, true, 8);
  // Tall arches sign by the crossing
  box(props, 0.6, 11, 0.6, M.darkPole, 27, 5.5, 27, true);
  box(props, 4.8, 4.8, 0.6, M.red, 27, 12.4, 27);
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: archesTexture }));
    face.position.set(27, 12.4, 27 + side * 0.31);
    face.rotation.y = side > 0 ? 0 : Math.PI;
    props.add(face);
  }
  // Patio with parasols on the west side
  flat(paving, M.sidewalk, -38, -17, -26, -1, -0.02);
  for (const [x, z, color] of [[-33, -21, M.red], [-26, -21, M.yellow], [-33, -13, M.yellow], [-26, -13, M.red], [-33, -5, M.red], [-26, -5, M.yellow]]) {
    cyl(props, 1, 0.08, M.white, x, 1.05, z, true, 16);
    cyl(props, 0.06, 1, M.darkPole, x, 0.5, z);
    cyl(props, 0.05, 3, M.darkPole, x, 1.5, z);
    const parasol = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.8, 8), color);
    parasol.position.set(x, 3.1, z);
    parasol.castShadow = true;
    props.add(parasol);
    for (const [cx, cz] of [[-1.5, 0], [1.5, 0], [0, 1.5], [0, -1.5]]) box(props, 0.6, 0.6, 0.6, M.wood, x + cx, 0.3, z + cz);
  }
  for (let z = -26; z <= -1; z += 2.5) box(props, 0.1, 0.9, 0.1, M.darkPole, -38.5, 0.45, z);
  box(props, 0.06, 0.06, 25, M.darkPole, -38.5, 0.9, -13.5);
  // Playground next to the car park
  flat(paving, M.rubber, -38, -19, 4, 30, -0.02);
  for (const side of [-1, 1]) {
    for (const x of [-36.5, -28.5]) {
      const leg = box(props, 0.15, 3.6, 0.15, M.blue, x, 1.7, 8 + side * 0.6);
      leg.rotation.x = side * 0.18;
    }
  }
  box(props, 8.4, 0.18, 0.18, M.blue, -32.5, 3.45, 8, true);
  for (const x of [-34.5, -30.5]) {
    for (const side of [-0.4, 0.4]) cyl(props, 0.02, 2.4, M.darkPole, x + side, 2.2, 8, false, 4);
    box(props, 1.1, 0.1, 0.45, M.red, x, 1, 8);
  }
  box(props, 2, 2.4, 2, M.yellow, -25, 1.2, 12, true);
  box(props, 2.2, 0.2, 2.2, M.red, -25, 2.5, 12);
  const playSlide = box(props, 1.2, 0.15, 4, M.red, -25, 1.3, 15.3);
  playSlide.rotation.x = 0.5;
  box(props, 4, 0.3, 4, M.wood, -32, 0.15, 21);
  flat(props, M.sand, -33.7, -30.3, 19.3, 22.7, 0.31);
  for (const [x, z, material] of [[-24, 26, M.green], [-35, 27, M.pink]]) {
    cyl(props, 0.12, 0.8, M.darkPole, x, 0.4, z, false, 6);
    ball(props, 0.55, material, x, 1.1, z, 1.4, 0.8, 0.8);
  }
  for (const z of [5, 29]) box(props, 2.2, 0.5, 0.7, M.wood, -21, 0.5, z, true);

  // ---- Bus stops on the main street ----
  function busStop(x, z, facing) {
    const stop = new THREE.Group();
    stop.position.set(x, 0, z);
    stop.rotation.y = facing;
    props.add(stop);
    box(stop, 5, 0.12, 2, M.darkPole, 0, 2.9, 0);
    solidMeshes.push(box(stop, 5, 2.6, 0.06, M.glass, 0, 1.5, -0.95));
    for (const px of [-2.4, 2.4]) box(stop, 0.1, 2.9, 0.1, M.darkPole, px, 1.45, -0.9);
    box(stop, 3.2, 0.12, 0.6, M.wood, 0, 0.6, -0.55);
    cyl(stop, 0.06, 3.2, M.pole, 3.1, 1.6, 0.6, false, 8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), busSignMaterial);
    sign.position.set(3.1, 3.1, 0.6);
    stop.add(sign);
  }
  busStop(58, 31, 0);
  busStop(-15, 45, Math.PI);

  // ---- Ice cream kiosk next to the garage yard ----
  box(props, 6, 3.2, 5, M.white, 102, 1.6, -8, true);
  box(props, 7, 0.3, 6.5, M.pink, 102, 3.4, -7.5);
  const iceSign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), iceCreamSignMaterial);
  iceSign.position.set(102, 4.2, -5.45);
  props.add(iceSign);
  cyl(props, 0.7, 1.6, M.cone, 102, 3.9, -8, false, 10, 0.05);
  ball(props, 0.8, M.cream, 102, 5.1, -8);
  for (const x of [98, 106]) cyl(props, 0.6, 0.08, M.white, x, 1.05, -2, true, 12);

  // ---- Park with a duck pond south of ICA ----
  flat(paving, grassMaterial, -40, 31, 90, 105, -0.035);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 32), M.water);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-18, -0.01, 97.5);
  props.add(pond);
  circles.push({ x: -18 + OFFSET_X, z: 97.5, r: 6 });
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    ball(props, 0.5, M.grey, -18 + Math.cos(a) * 6.3, 0.1, 97.5 + Math.sin(a) * 6.3, 1, 0.5, 1);
  }
  ball(props, 0.35, M.white, -17, 0.15, 96, 1.3, 0.8, 0.9);
  ball(props, 0.18, M.white, -16.6, 0.45, 96);
  ball(props, 0.35, M.yellow, -20, 0.15, 99, 1.3, 0.8, 0.9);
  ball(props, 0.18, M.yellow, -19.6, 0.45, 99);
  for (const [x, z] of [[-4, 94], [8, 100], [20, 94]]) box(props, 2.6, 0.5, 0.8, M.wood, x, 0.5, z, true);
  for (let i = 0; i < 26; i++) ball(props, 0.35, [M.flowerRed, M.flowerYellow, M.flowerWhite][i % 3], -2 + (i % 13) * 1.6, 0.3, 102 + Math.floor(i / 13) * 1.2);

  // ---- Filling the open corners: a food truck plaza, extra parking, recycling ----
  function tree(x, z, scale = 1) {
    cyl(props, 0.22 * scale, 2.6 * scale, M.trunk, x, 1.3 * scale, z, true, 7);
    ball(props, 1.7 * scale, M.crowns[Math.floor(Math.abs(x * 7 + z)) % 4], x, 3.4 * scale, z, 1, 1.15, 1);
  }
  function picnicTable(x, z) {
    box(props, 2.4, 0.12, 1, M.wood, x, 1, z, true);
    for (const side of [-1, 1]) box(props, 2.4, 0.1, 0.4, M.wood, x, 0.6, z + side * 0.85);
    for (const side of [-1, 1]) box(props, 0.12, 1, 1, M.darkWood, x + side * 1, 0.5, z);
  }
  // Food truck plaza on the east side of the roundabout block
  flat(paving, M.sidewalk, 88, 105, 47, 78, -0.02);
  const truck = new THREE.Group();
  truck.position.set(100, 0, 58);
  props.add(truck);
  box(truck, 3, 3, 7, M.blue, 0, 1.9, 0, true);
  box(truck, 2.8, 1.8, 2.2, M.white, 0, 1.3, 4.4, true);
  box(truck, 0.1, 1.2, 3.6, M.glass, -1.52, 2.2, -0.6);
  box(truck, 0.9, 0.12, 3.8, M.yellow, -1.9, 2.95, -0.6);
  for (const [wz, side] of [[-2.4, -1], [-2.4, 1], [4, -1], [4, 1]]) {
    const wheel = cyl(truck, 0.55, 0.4, M.darkPole, side * 1.45, 0.55, wz, false, 14);
    wheel.rotation.z = Math.PI / 2;
  }
  for (const [x, z] of [[93, 52], [93, 60], [93, 68]]) picnicTable(x, z);
  for (const [x, z] of [[90, 75], [104, 75], [90, 49], [104, 48]]) tree(x, z, 0.8);
  // Extra parking on the west side of the roundabout block
  for (let z = 47; z <= 78; z += 3.4) flat(paving, M.paint, 43, 50, z - 0.08, z + 0.08, -0.012);
  flat(paving, M.paint, 49.9, 50.1, 47, 78.2, -0.012);
  for (const x of [54, 58]) for (const z of [50, 64, 78]) tree(x, z, 0.7);
  // Recycling station and trolley shelter west of ICA
  const bins = [M.green, M.blue, M.yellow, M.red, M.grey];
  bins.forEach((material, i) => {
    box(props, 2, 2.2, 2, material, -35, 1.1, 50 + i * 2.6, true);
    box(props, 2.1, 0.15, 2.1, M.darkPole, -35, 2.25, 50 + i * 2.6);
  });
  box(props, 6, 0.15, 3, M.darkPole, -32, 2.6, 78);
  for (const [x, z] of [[-34.8, 76.6], [-29.2, 76.6], [-34.8, 79.4], [-29.2, 79.4]]) box(props, 0.1, 2.6, 0.1, M.pole, x, 1.3, z, true);
  for (let i = 0; i < 5; i++) {
    const trolley = new THREE.Group();
    trolley.position.set(-34 + i * 0.9, 0, 78);
    props.add(trolley);
    box(trolley, 0.7, 0.7, 1.2, M.pole, 0, 1, 0);
    box(trolley, 0.1, 0.1, 0.8, M.red, 0, 1.45, -0.7);
  }
  for (const z of [62, 70]) tree(-36, z, 0.75);

  // ---- Street furniture: lights, bins, hydrants, planters, bike racks ----
  function streetLight(x, z, facing) {
    cyl(props, 0.12, 7, M.pole, x, 3.5, z, true, 8);
    box(props, 0.14, 0.14, 1.6, M.pole, x + Math.sin(facing) * 0.8, 7, z + Math.cos(facing) * 0.8, false, facing);
    box(props, 0.35, 0.12, 0.7, M.lampGlow, x + Math.sin(facing) * 1.5, 6.9, z + Math.cos(facing) * 1.5, false, facing);
  }
  for (let x = V_ROADS[0] - 2; x <= V_ROADS[2] + 2; x += 19) {
    if (!nearNode(x, H_ROADS[0], 8)) streetLight(x, H_ROADS[0] - 7.5, 0);
    if (!nearNode(x, H_ROADS[2], 8)) streetLight(x, H_ROADS[2] + 7.5, Math.PI);
  }
  for (let z = H_ROADS[0] + 4; z <= H_ROADS[2]; z += 19) {
    if (!nearNode(V_ROADS[0], z, 8)) streetLight(V_ROADS[0] - 7.5, z, Math.PI / 2);
    if (!nearNode(V_ROADS[2], z, 8)) streetLight(V_ROADS[2] + 7.5, z, -Math.PI / 2);
  }
  for (const [x, z, facing] of [[-10, 31, 0], [88, 31, 0], [60, 45, Math.PI], [-30, 45, Math.PI], [29, 20, Math.PI / 2], [43, 20, -Math.PI / 2], [29, 70, Math.PI / 2], [43, 70, -Math.PI / 2]]) streetLight(x, z, facing);
  for (const [x, z] of [[-8, 1], [3, 1], [-17, 31], [30, 1], [55, 29], [44, 46], [-38, 46], [104, 30]]) {
    cyl(props, 0.35, 1, M.bin, x, 0.5, z, true, 10);
    cyl(props, 0.38, 0.1, M.darkPole, x, 1.02, z, false, 10);
  }
  for (const [x, z] of [[30, 31], [42, 31], [-38, 31], [100, 45], [30, 45]]) {
    cyl(props, 0.2, 0.8, M.hydrant, x, 0.4, z, true, 8);
    ball(props, 0.2, M.hydrant, x, 0.85, z);
  }
  for (const [x, z] of [[-14, -1.5], [11, -1.5], [29, -27], [-38, -28], [44, 4], [44, 22], [104, 18], [104, 100], [44, 100]]) {
    box(props, 2.6, 0.6, 1.2, M.curb, x, 0.3, z, true);
    box(props, 2.3, 0.7, 0.9, M.hedge, x, 0.9, z);
    for (let i = 0; i < 4; i++) ball(props, 0.22, [M.flowerRed, M.flowerYellow][i % 2], x - 0.9 + i * 0.6, 1.3, z);
  }
  for (const x of [-12.5, -11.3, -10.1]) {
    const rack = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 12, Math.PI), M.pole);
    rack.position.set(x, 0, 1.2);
    rack.rotation.y = Math.PI / 2;
    props.add(rack);
  }

  // ---- Houses with gardens around the town ----
  function house(x, z, facing, index) {
    const home = new THREE.Group();
    home.position.set(x, 0, z);
    home.rotation.y = facing;
    props.add(home);
    const body = box(home, 9, 4.6, 8, M.walls[index % M.walls.length], 0, 2.3, 0, true);
    const roofShape = new THREE.Shape([new THREE.Vector2(-4.6, 0), new THREE.Vector2(4.6, 0), new THREE.Vector2(0, 3)]);
    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: 9.8, bevelEnabled: false });
    roofGeometry.translate(0, 0, -4.9);
    roofGeometry.rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(roofGeometry, M.roofs[index % M.roofs.length]);
    roof.position.y = 4.6;
    roof.castShadow = true;
    home.add(roof);
    box(home, 0.8, 1.8, 0.8, M.chimney, 2.5, 6.6, -1.5);
    box(home, 1.3, 2.3, 0.15, M.door, 0, 1.15, 4.02);
    box(home, 1.9, 0.12, 1.2, M.darkWood, 0, 2.5, 4.5);
    for (const wx of [-2.8, 2.8]) {
      box(home, 1.6, 1.3, 0.12, M.window, wx, 2.6, 4.02);
      box(home, 1.8, 0.12, 0.25, M.white, wx, 1.9, 4.1);
      box(home, 0.12, 1.3, 1.6, M.window, wx < 0 ? -4.52 : 4.52, 2.6, 0);
    }
    // Garden: hedges with a gap for the path, a small tree and a mailbox
    for (const hx of [-3.3, 3.3]) box(home, 3.6, 1, 0.7, M.hedge, hx, 0.5, 7, true);
    flat(home, M.sidewalk, -0.7, 0.7, 4.1, 7.4, 0.01);
    cyl(home, 0.06, 1.1, M.pole, 1.6, 0.55, 7.6, false, 6);
    box(home, 0.5, 0.35, 0.3, index % 2 ? M.yellow : M.blue, 1.6, 1.2, 7.6);
    cyl(home, 0.2, 2.4, M.trunk, -3.8, 1.2, 5.5, false, 6);
    ball(home, 1.4, M.crowns[index % 4], -3.8, 3.2, 5.5, 1, 1.2, 1);
    return body;
  }
  let houseIndex = 0;
  for (let x = -60; x <= 132; x += 16) {
    house(x, H_ROADS[0] - 17, 0, houseIndex++);
    house(x, H_ROADS[2] + 17, Math.PI, houseIndex++);
  }
  for (let z = -22; z <= 100; z += 16) {
    house(V_ROADS[0] - 17, z, Math.PI / 2, houseIndex++);
    house(V_ROADS[2] + 17, z, -Math.PI / 2, houseIndex++);
  }

  // ---- Trees: along the outer sidewalks and a forest beyond the houses ----
  const treeSpots = [];
  for (let x = V_ROADS[0] - 4; x <= V_ROADS[2] + 4; x += 11) {
    if (!nearNode(x + 3, H_ROADS[0], 10)) treeSpots.push([x + 3, H_ROADS[0] - 8, 0.7]);
    if (!nearNode(x + 3, H_ROADS[2], 10)) treeSpots.push([x + 3, H_ROADS[2] + 8, 0.7]);
  }
  for (let tries = 0; tries < 5000 && treeSpots.length < 480; tries++) {
    const x = BOUNDS.minX - 70 + random() * (BOUNDS.maxX - BOUNDS.minX + 140);
    const z = BOUNDS.minZ - 70 + random() * (BOUNDS.maxZ - BOUNDS.minZ + 140);
    const insideTown = x > V_ROADS[0] - 27 && x < V_ROADS[2] + 27 && z > H_ROADS[0] - 27 && z < H_ROADS[2] + 27;
    if (!insideTown) treeSpots.push([x, z, 0.75 + random() * 0.8]);
  }
  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.35, 3.6, 7);
  const crownGeometry = new THREE.SphereGeometry(1, 10, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, M.trunk, treeSpots.length);
  const crownMeshes = M.crowns.map((material) => new THREE.InstancedMesh(crownGeometry, material, Math.ceil(treeSpots.length / 4)));
  const crownCounts = [0, 0, 0, 0];
  const dummy = new THREE.Object3D();
  treeSpots.forEach(([x, z, scale], index) => {
    dummy.position.set(x, 1.8 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 4.6 * scale;
    dummy.scale.set(2.5 * scale, 3.1 * scale, 2.4 * scale);
    dummy.updateMatrix();
    const color = index % 4;
    crownMeshes[color].setMatrixAt(crownCounts[color]++, dummy.matrix);
    if (x > BOUNDS.minX - 2 && x < BOUNDS.maxX + 2 && z > BOUNDS.minZ - 2 && z < BOUNDS.maxZ + 2) circles.push({ x: x + OFFSET_X, z, r: 0.4 * scale });
  });
  crownMeshes.forEach((mesh, i) => { mesh.count = crownCounts[i]; });
  for (const mesh of [trunks, ...crownMeshes]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  // ---- Traffic lights at the main crossing ----
  const lightMaterials = {};
  for (const axis of ['ns', 'ew']) {
    lightMaterials[axis] = {
      red: new THREE.MeshStandardMaterial({ color: '#3a0d0d', emissive: '#ff2a1a', emissiveIntensity: 0 }),
      yellow: new THREE.MeshStandardMaterial({ color: '#3a300d', emissive: '#ffc21a', emissiveIntensity: 0 }),
      green: new THREE.MeshStandardMaterial({ color: '#0d3a14', emissive: '#2aff5a', emissiveIntensity: 0 }),
    };
  }
  const lightsGroup = new THREE.Group();
  group.add(lightsGroup);
  for (const [dx, dz] of arms) {
    // Traffic on this arm drives towards the centre; the signal stands on its right-hand kerb.
    const rightX = dz;
    const rightZ = -dx;
    const x = C[0] + dx * 7.5 + rightX * 6.3;
    const z = C[1] + dz * 7.5 + rightZ * 6.3;
    const axis = dx !== 0 ? 'ew' : 'ns';
    cyl(props, 0.12, 4.4, M.darkPole, x, 2.2, z, true, 8);
    const head = new THREE.Group();
    head.position.set(x, 4.7, z);
    head.rotation.y = Math.atan2(dx, dz);
    lightsGroup.add(head);
    box(head, 0.7, 2, 0.5, M.darkPole, 0, 0, 0);
    box(head, 0.9, 2.2, 0.06, M.darkPole, 0, 0, -0.27);
    ['red', 'yellow', 'green'].forEach((color, i) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), lightMaterials[axis][color]);
      lamp.position.set(0, 0.6 - i * 0.6, 0.2);
      lamp.scale.z = 0.5;
      head.add(lamp);
      box(head, 0.55, 0.06, 0.35, M.darkPole, 0, 0.85 - i * 0.6, 0.35).castShadow = false;
    });
  }

  // ---- NPC traffic and parked cars ----
  const traffic = createTraffic({
    loops: [
      { nodes: [NW, NE, SE, SW], cars: 3 },
      { nodes: [NW, SW, SE, NE], cars: 3 },
      { nodes: [NW, N, S, SW], cars: 2 },
      { nodes: [N, NE, SE, S], cars: 2 },
      { nodes: [NW, NE, E, W], cars: 2 },
      { nodes: [W, E, SE, SW], cars: 2 },
    ],
    lightNode: C,
    signNodes: signs,
    parkedSpots: [
      [-12.9, 6.8, Math.PI], [9.9, 6.8, Math.PI], [16.7, 6.8, Math.PI], [23.5, 6.8, Math.PI],
      [-9.5, 25.8, 0], [6.5, 25.8, 0], [13.3, 25.8, 0], [20.1, 25.8, 0],
      [66, 12, 0.35], [88, 8, 1.3],
      [15, 68, 0], [3, 68, Math.PI], [-9, 68, 0], [-15, 68, Math.PI],
      [96, 100, Math.PI / 2], [60, 101, -Math.PI / 2],
      [46.5, 52.1, -Math.PI / 2], [46.5, 58.9, Math.PI / 2], [46.5, 69.1, -Math.PI / 2], [46.5, 75.9, Math.PI / 2],
    ],
    random,
  });
  group.add(traffic.group);

  // ---- Colliders: measure everything solid, then merge the static meshes ----
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const pushBox = (object) => {
    bounds.setFromObject(object);
    boxes.push({ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z });
  };
  for (const { place } of clones) {
    // In the level scenery, anything standing on the ground and taller than a kerb is solid.
    place.traverse((mesh) => {
      if (!mesh.isMesh) return;
      bounds.setFromObject(mesh);
      if (bounds.min.y > 0.8 || bounds.max.y < 1.1) return;
      boxes.push({ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z });
    });
  }
  const roundabout = clones.find((clone) => clone.key === 'roundabout').place;
  const islandCenter = roundabout.localToWorld(new THREE.Vector3(5, 0, 4));
  circles.push({ x: islandCenter.x, z: islandCenter.z, r: 7.05 });
  for (const mesh of solidMeshes) pushBox(mesh);
  for (const mesh of mcd.solids) {
    pushBox(mesh);
    if (mesh.userData.colliderOnly) mesh.removeFromParent();
  }
  for (const { place } of clones) mergeStatic(place);
  for (const part of mcd.staticGroups) mergeStatic(part, mcd.dynamic);
  mergeStatic(props);
  mergeStatic(paving);

  // ---- Collision test ----
  const dynamicCircles = [];
  function penetration(x, z, heading, small) {
    const along = small ? [[0, 0.75]] : [[-1.9, 1.1], [0, 1.2], [1.9, 1.1]];
    const localX = x - OFFSET_X;
    let deepest = Math.max(0, BOUNDS.minX - localX, localX - BOUNDS.maxX, BOUNDS.minZ - z, z - BOUNDS.maxZ);
    for (const [offset, radius] of along) {
      const cx = x + Math.sin(heading) * offset;
      const cz = z + Math.cos(heading) * offset;
      for (const b of boxes) {
        if (cx < b.minX - radius || cx > b.maxX + radius || cz < b.minZ - radius || cz > b.maxZ + radius) continue;
        const dx = cx - THREE.MathUtils.clamp(cx, b.minX, b.maxX);
        const dz = cz - THREE.MathUtils.clamp(cz, b.minZ, b.maxZ);
        deepest = Math.max(deepest, radius - Math.hypot(dx, dz));
      }
      for (const list of [circles, dynamicCircles]) {
        for (const c of list) {
          const reach = radius + c.r;
          const dx = cx - c.x;
          const dz = cz - c.z;
          if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
          deepest = Math.max(deepest, reach - Math.hypot(dx, dz));
        }
      }
    }
    return deepest;
  }

  let clock = 0;
  const playerLocal = { x: 0, z: 0 };
  return {
    group,
    spawn: { x: OFFSET_X + MCD_ORIGIN[0], z: MCD_ORIGIN[1] + 21, heading: Math.PI },
    // Moving is blocked when it would push further into something; backing out is always allowed.
    blocks(fromX, fromZ, toX, toZ, heading, small) {
      const next = penetration(toX, toZ, heading, small);
      return next > 0 && next >= penetration(fromX, fromZ, heading, small) - 1e-4;
    },
    setCarModel(root, meshes, paintMaterial) {
      traffic.setCarModel(root, meshes, paintMaterial);
    },
    // Advance traffic and lights, open doors, and report whether the player is indoors.
    update(dt, player, camera) {
      clock += dt;
      playerLocal.x = player.x - OFFSET_X;
      playerLocal.z = player.z;
      const light = traffic.update(dt, clock, playerLocal);
      for (const axis of ['ns', 'ew']) {
        for (const color of ['red', 'yellow', 'green']) lightMaterials[axis][color].emissiveIntensity = light[axis] === color ? 2.4 : 0;
      }
      dynamicCircles.length = 0;
      traffic.solidCircles(dynamicCircles);
      for (const circle of dynamicCircles) circle.x += OFFSET_X;
      return mcd.update(dt,
        { x: playerLocal.x - MCD_ORIGIN[0], z: playerLocal.z - MCD_ORIGIN[1] },
        { x: camera.x - OFFSET_X - MCD_ORIGIN[0], z: camera.z - MCD_ORIGIN[1] });
    },
  };
}
