import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import carUrl from '../volvo_v70.glb?url';
import './style.css';

const canvas = document.querySelector('#scene');
const instruction = document.querySelector('#instruction');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a7c2d2');
scene.fog = new THREE.Fog('#a7c2d2', 100, 230);
const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 500);
const ambient = new THREE.HemisphereLight('#e6f1ff', '#728460', 1.8);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff0d1', 3.1);
sun.position.set(-28, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
sun.shadow.normalBias = 0.025;
scene.add(sun, sun.target);

let seed = 29;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function canvasTexture(size, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  painter(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const asphaltTexture = canvasTexture(512, (ctx, size) => {
  ctx.fillStyle = '#484d53';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14000; i++) {
    const tone = random() > 0.55 ? '255,255,255' : '12,20,28';
    ctx.fillStyle = `rgba(${tone},${0.025 + random() * 0.085})`;
    const dot = 0.5 + random() * 2;
    ctx.fillRect(random() * size, random() * size, dot, dot);
  }
});
asphaltTexture.repeat.set(8, 7);
const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTexture, roughness: 0.96, metalness: 0.02 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(250, 200), new THREE.MeshStandardMaterial({ color: '#657b54', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);
function plane(width, depth, material, x, z, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
plane(102, 62, asphalt, 0, 7, -0.035);
plane(125, 13, asphalt, 0, -32, -0.027);

const roofTexture = canvasTexture(256, (ctx, size) => {
  ctx.fillStyle = '#a15751';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 15) {
    ctx.fillStyle = '#743c39';
    ctx.fillRect(0, y, size, 2);
    ctx.fillStyle = 'rgba(255,215,200,.19)';
    ctx.fillRect(0, y + 3, size, 2);
    for (let x = (y / 15) % 2 ? 0 : 18; x < size; x += 36) {
      ctx.fillStyle = 'rgba(70,34,34,.24)';
      ctx.fillRect(x, y + 2, 1.5, 13);
    }
  }
});
const roofMaterial = new THREE.MeshStandardMaterial({ map: roofTexture, color: '#e7b6a9', roughness: 0.84, side: THREE.DoubleSide });
const sidingTexture = canvasTexture(256, (ctx, size) => {
  ctx.fillStyle = '#d8dee1';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 12) {
    ctx.fillStyle = 'rgba(46,64,77,.18)';
    ctx.fillRect(x, 0, 1.5, size);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(x + 2, 0, 1, size);
  }
});
const garageWall = new THREE.MeshStandardMaterial({ map: sidingTexture, color: '#d5dce0', roughness: 0.82 });
const houseWall = new THREE.MeshStandardMaterial({ map: sidingTexture, color: '#65798d', roughness: 0.87 });
const trim = new THREE.MeshStandardMaterial({ color: '#e9ecea', roughness: 0.75 });
const doorMaterial = new THREE.MeshStandardMaterial({ color: '#d8dfe1', roughness: 0.73 });
const doorSeam = new THREE.MeshStandardMaterial({ color: '#a7b3ba', roughness: 0.9 });
const darkMetal = new THREE.MeshStandardMaterial({ color: '#3d4850', metalness: 0.5, roughness: 0.5 });
const glass = new THREE.MeshPhysicalMaterial({ color: '#7293a3', metalness: 0.25, roughness: 0.16, clearcoat: 0.7 });

function box(parent, width, height, depth, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function roof(group, width, depth, wallHeight, rise) {
  const overhang = 0.4;
  for (const side of [-1, 1]) {
    const end = side * (depth / 2 + overhang);
    const vertices = new Float32Array([
      -width / 2 - overhang, wallHeight + 0.1, end,
      width / 2 + overhang, wallHeight + 0.1, end,
      -width / 2 - overhang, wallHeight + rise, 0,
      width / 2 + overhang, wallHeight + rise, 0,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, width / 2.6, 0, 0, depth / 3.5, width / 2.6, depth / 3.5], 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    geometry.computeVertexNormals();
    const slope = new THREE.Mesh(geometry, roofMaterial);
    slope.castShadow = true;
    slope.receiveShadow = true;
    group.add(slope);
  }
  box(group, width + 0.85, 0.12, 0.12, trim, 0, wallHeight + rise, 0);
}
function building(width, depth, height, x, z, wallMaterial, roofRise, hollow = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  if (hollow) {
    box(group, width, height, 0.22, wallMaterial, 0, height / 2, -depth / 2 + 0.11);
    for (const side of [-1, 1]) box(group, 0.22, height, depth, wallMaterial, side * (width / 2 - 0.11), height / 2, 0);
    box(group, width, 0.86, 0.24, wallMaterial, 0, height - 0.43, depth / 2 - 0.12);
    box(group, width - 0.2, 0.08, depth - 0.2, new THREE.MeshStandardMaterial({ color: '#40494c', roughness: 0.98 }), 0, 0.01, 0);
  } else {
    box(group, width, height, depth, wallMaterial, 0, height / 2, 0);
  }
  box(group, width + 0.2, 0.17, 0.18, trim, 0, height - 0.02, depth / 2 + 0.06);
  box(group, width + 0.2, 0.2, 0.2, trim, 0, 0.12, depth / 2 + 0.07);
  roof(group, width, depth, height, roofRise);
  return group;
}
function garageDoor(group, x, frontZ, width = 4.8) {
  const panel = new THREE.Group();
  group.add(panel);
  box(panel, width, 3.15, 0.1, doorMaterial, x, 1.62, frontZ + 0.07);
  box(group, 0.12, 3.25, 0.15, trim, x - width / 2, 1.62, frontZ + 0.13);
  box(group, 0.12, 3.25, 0.15, trim, x + width / 2, 1.62, frontZ + 0.13);
  box(group, width + 0.1, 0.14, 0.15, trim, x, 3.25, frontZ + 0.13);
  for (let y = 0.6; y < 3; y += 0.5) box(panel, width - 0.2, 0.018, 0.015, doorSeam, x, y, frontZ + 0.132, false);
  box(panel, 0.08, 0.2, 0.04, darkMetal, x + width * 0.27, 1.57, frontZ + 0.15, false);
  return panel;
}
function windowFront(group, x, y, z, width = 2.6, height = 1.7) {
  box(group, width + 0.24, height + 0.24, 0.12, trim, x, y, z + 0.08);
  box(group, width, height, 0.14, glass, x, y, z + 0.16, false);
  box(group, 0.09, height, 0.16, trim, x, y, z + 0.25, false);
  box(group, width, 0.08, 0.16, trim, x, y, z + 0.25, false);
  box(group, width + 0.55, 0.14, 0.35, trim, x, y - height / 2 - 0.12, z + 0.22);
}

// The layout follows the reference: house left, red-roof garages across the rear,
// a broad paved yard, parked cars on the right, and a forest road behind.
const garageRow = building(37, 10, 4.2, 5, -14, garageWall, 1.15, true);
const garageDoors = [];
for (let i = 0; i < 6; i++) garageDoors.push(garageDoor(garageRow, -15.5 + i * 6.2, 5, 5.2));
for (let i = 1; i < 6; i++) {
  const dividerX = -18.6 + i * 6.2;
  box(garageRow, 0.94, 3.2, 0.25, garageWall, dividerX, 1.6, 5.01);
  box(garageRow, 0.16, 3.2, 9.8, garageWall, dividerX, 1.6, 0);
}
box(garageRow, 37.2, 0.13, 0.18, trim, 0, 4.2, -5.04);

const house = building(18, 13, 7.2, -24, -18, houseWall, 3.1);
for (const x of [-5.5, 0, 5.5]) {
  windowFront(house, x, 2.2, 6.5);
  windowFront(house, x, 5.2, 6.5);
}
box(house, 2.4, 3.1, 0.15, trim, -8.2, 1.58, 6.63);
box(house, 1.9, 2.65, 0.17, new THREE.MeshStandardMaterial({ color: '#78909b', roughness: 0.8 }), -8.2, 1.42, 6.75);
const frontGarage = building(20, 17, 3.65, -21, 21, garageWall, 1.45);
for (let i = 0; i < 3; i++) garageDoor(frontGarage, -6.2 + i * 6.2, 8.5, 5.1);
const garageEnvironment = new THREE.Group();
scene.add(garageEnvironment);
garageEnvironment.add(garageRow, house, frontGarage);

const storeEnvironment = new THREE.Group();
scene.add(storeEnvironment);
const storeWall = new THREE.MeshStandardMaterial({ color: '#f0e8d8', roughness: 0.82 });
const storeRoof = new THREE.MeshStandardMaterial({ color: '#4e879a', roughness: 0.7 });
const storeAwning = new THREE.MeshStandardMaterial({ color: '#edaa58', roughness: 0.72 });
box(storeEnvironment, 46, 6, 9, storeWall, 5, 3, -11);
box(storeEnvironment, 46.5, 0.34, 9.5, storeRoof, 5, 6.08, -11);
box(storeEnvironment, 43, 0.3, 1.2, storeAwning, 5, 4.04, -5.9);
box(storeEnvironment, 42, 3.45, 0.14, glass, 5, 2.05, -6.38, false);
for (let x = -15; x <= 25; x += 5) box(storeEnvironment, 0.16, 3.5, 0.2, trim, x, 2.05, -6.23);
const storeSignCanvas = document.createElement('canvas');
storeSignCanvas.width = 1024;
storeSignCanvas.height = 256;
const storeSignContext = storeSignCanvas.getContext('2d');
{
  const ctx = storeSignContext;
  ctx.fillStyle = '#2c667b';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#fff5dc';
  ctx.font = 'bold 130px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SUNNY MARKET', 512, 128);
}
const storeSignTexture = new THREE.CanvasTexture(storeSignCanvas);
storeSignTexture.colorSpace = THREE.SRGBColorSpace;
const storeSign = new THREE.Mesh(new THREE.PlaneGeometry(17, 2.2), new THREE.MeshBasicMaterial({ map: storeSignTexture }));
storeSign.position.set(5, 5.05, -6.34);
storeEnvironment.add(storeSign);
box(storeEnvironment, 8, 4.3, 7, storeWall, -20, 2.15, 12);
box(storeEnvironment, 8.5, 0.27, 7.5, storeRoof, -20, 4.35, 12);
box(storeEnvironment, 0.16, 2.6, 6.5, glass, -15.93, 1.75, 12, false);
box(storeEnvironment, 1.2, 0.2, 7.5, storeAwning, -15.45, 3.45, 12);
const nearStoreSign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.55), new THREE.MeshBasicMaterial({ map: storeSignTexture, side: THREE.DoubleSide }));
nearStoreSign.rotation.y = Math.PI / 2;
nearStoreSign.position.set(-15.82, 3.7, 12);
storeEnvironment.add(nearStoreSign);
box(storeEnvironment, 0.36, 4.7, 0.36, storeRoof, 27.5, 2.35, 12);
box(storeEnvironment, 4.8, 2.35, 0.28, storeAwning, 27.5, 5.45, 12);
const parkingMarketSign = new THREE.Mesh(new THREE.PlaneGeometry(4.45, 1.1), new THREE.MeshBasicMaterial({ map: storeSignTexture, side: THREE.DoubleSide }));
parkingMarketSign.position.set(27.5, 5.54, 12.17);
storeEnvironment.add(parkingMarketSign);
const storeLine = new THREE.MeshBasicMaterial({ color: '#e7dfc8' });
for (const x of [-13, -7, -1, 5, 11, 17, 23]) box(storeEnvironment, 0.1, 0.012, 7.6, storeLine, x, 0.03, 4);
for (const z of [0, 8]) box(storeEnvironment, 36, 0.012, 0.1, storeLine, 5, 0.03, z);
const planter = new THREE.MeshStandardMaterial({ color: '#bdc3ae', roughness: 0.92 });
for (const x of [-14, 24]) {
  box(storeEnvironment, 3.3, 0.55, 1.3, planter, x, 0.27, -2);
  box(storeEnvironment, 3.05, 0.9, 1.1, new THREE.MeshStandardMaterial({ color: '#5d8746', roughness: 1 }), x, 0.75, -2);
}

const roundaboutEnvironment = new THREE.Group();
scene.add(roundaboutEnvironment);
const roundRoad = new THREE.Mesh(new THREE.CylinderGeometry(13.4, 13.4, 0.035, 64), new THREE.MeshStandardMaterial({ color: '#41494d', roughness: 0.95 }));
roundRoad.position.set(5, -0.01, 4);
roundRoad.receiveShadow = true;
roundaboutEnvironment.add(roundRoad);
const island = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 5.7, 0.27, 56), new THREE.MeshStandardMaterial({ color: '#6f985b', roughness: 1 }));
island.position.set(5, 0.14, 4);
island.receiveShadow = true;
roundaboutEnvironment.add(island);
const islandCurb = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.21, 8, 60), new THREE.MeshStandardMaterial({ color: '#d4d4ca', roughness: 0.9 }));
islandCurb.rotation.x = Math.PI / 2;
islandCurb.position.set(5, 0.24, 4);
roundaboutEnvironment.add(islandCurb);
const fountainStone = new THREE.MeshStandardMaterial({ color: '#bbc6ca', roughness: 0.65 });
const fountainWater = new THREE.MeshPhysicalMaterial({ color: '#6fbed3', metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.82 });
const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.15, 0.48, 36), fountainStone);
fountainBasin.position.set(5, 0.57, 4);
roundaboutEnvironment.add(fountainBasin);
const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(1.79, 1.79, 0.045, 36), fountainWater);
fountainPool.position.set(5, 0.83, 4);
roundaboutEnvironment.add(fountainPool);
box(roundaboutEnvironment, 0.38, 1.2, 0.38, fountainStone, 5, 1.37, 4);
const fountainTop = new THREE.Mesh(new THREE.SphereGeometry(0.57, 16, 10), fountainWater);
fountainTop.position.set(5, 2.1, 4);
roundaboutEnvironment.add(fountainTop);
const roundLine = new THREE.MeshBasicMaterial({ color: '#e3e1c9' });
for (let i = 0; i < 28; i++) {
  const angle = i / 28 * Math.PI * 2;
  const dash = box(roundaboutEnvironment, 0.12, 0.014, 1.25, roundLine, 5 + Math.sin(angle) * 9.8, 0.042, 4 + Math.cos(angle) * 9.8, false);
  dash.rotation.y = Math.atan2(Math.cos(angle), -Math.sin(angle));
}
const roundSignTexture = canvasTexture(256, (ctx, size) => {
  ctx.fillStyle = '#397aa5';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 109, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 176px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↻', size / 2, size / 2 + 7);
});
const roundSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: roundSignTexture, transparent: true }));
roundSign.position.set(5, 4.5, 4);
roundSign.scale.set(3, 3, 1);
roundaboutEnvironment.add(roundSign);
for (const [x, color] of [[-24, '#c3d4de'], [31, '#d8c1a9']]) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  box(roundaboutEnvironment, 11, 5.5, 8, material, x, 2.75, -20);
  box(roundaboutEnvironment, 11.5, 0.32, 8.5, storeRoof, x, 5.65, -20);
  for (const offset of [-3, 0, 3]) box(roundaboutEnvironment, 1.6, 1.65, 0.12, glass, x + offset, 3, -15.93, false);
}
storeEnvironment.visible = false;
roundaboutEnvironment.visible = false;

const goalMarker = new THREE.Group();
scene.add(goalMarker);
const goalGlow = new THREE.MeshBasicMaterial({ color: '#75ffc0' });
const goalFloor = new THREE.MeshBasicMaterial({ color: '#55df9d', transparent: true, opacity: 0.44, depthWrite: false });
box(goalMarker, 4.45, 0.025, 5.5, goalFloor, 0, 0.065, -2.8, false);
box(goalMarker, 5.3, 0.14, 0.16, goalGlow, 0, 3.37, 0.23, false);
for (const side of [-1, 1]) box(goalMarker, 0.14, 3.25, 0.16, goalGlow, side * 2.64, 1.64, 0.23, false);
const arrowShape = new THREE.Shape();
arrowShape.moveTo(-0.45, -1.4);
arrowShape.lineTo(0.45, -1.4);
arrowShape.lineTo(0.45, 0.05);
arrowShape.lineTo(1.15, 0.05);
arrowShape.lineTo(0, 1.5);
arrowShape.lineTo(-1.15, 0.05);
arrowShape.lineTo(-0.45, 0.05);
arrowShape.closePath();
const goalArrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), goalFloor);
goalArrow.rotation.x = -Math.PI / 2;
goalArrow.position.set(0, 0.055, 4.4);
goalMarker.add(goalArrow);
const garageLight = new THREE.PointLight('#b6ffd7', 22, 11, 2);
garageLight.position.set(0, 2.4, -2.7);
goalMarker.add(garageLight);

const parkingMarker = new THREE.Group();
scene.add(parkingMarker);
box(parkingMarker, 5.35, 0.018, 7.25, goalFloor, 0, 0.042, 0, false);
for (const side of [-1, 1]) box(parkingMarker, 0.13, 0.018, 7.35, goalGlow, side * 2.72, 0.055, 0, false);
for (const side of [-1, 1]) box(parkingMarker, 5.5, 0.018, 0.13, goalGlow, 0, 0.055, side * 3.7, false);
const parkingSignTexture = canvasTexture(256, (ctx, size) => {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#4bdf96';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 106, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 158px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', size / 2, size / 2 + 8);
});
const parkingSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: parkingSignTexture, transparent: true, depthWrite: false }));
parkingSign.position.set(0, 2.5, -3.7);
parkingSign.scale.set(2.7, 2.7, 1);
parkingMarker.add(parkingSign);

const starTexture = canvasTexture(256, (ctx, size) => {
  ctx.clearRect(0, 0, size, size);
  const center = size / 2;
  ctx.shadowColor = '#ffcf4b';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 === 0 ? 100 : 46;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd64c';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff9d7';
  ctx.lineWidth = 9;
  ctx.stroke();
});
const checkpointMarker = new THREE.Group();
scene.add(checkpointMarker);
const checkpointStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture, transparent: true, depthWrite: false }));
checkpointStar.position.y = 2.15;
checkpointStar.scale.set(2.7, 2.7, 1);
checkpointMarker.add(checkpointStar);
const checkpointRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.11, 8, 36), new THREE.MeshBasicMaterial({ color: '#ffdb71', transparent: true, opacity: 0.85 }));
checkpointRing.rotation.x = Math.PI / 2;
checkpointRing.position.y = 0.09;
checkpointMarker.add(checkpointRing);
checkpointMarker.visible = false;

// A dotted path gives the player a clear route through each layout.
function clearDynamicGroup(group, sharedGeometries = []) {
  group.traverse((child) => {
    if (child.isMesh && child.geometry && !sharedGeometries.includes(child.geometry)) child.geometry.dispose();
  });
  group.clear();
}
const routeGroup = new THREE.Group();
scene.add(routeGroup);
const routePaint = new THREE.MeshBasicMaterial({ color: '#d5fff0', transparent: true, opacity: 0.63, depthWrite: false });
let routeCurve;
let guideSamples = [];
let guideRouteLength = 1;
let guideInitialized = false;
function drawRoute(points) {
  clearDynamicGroup(routeGroup);
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.045, z)), false, 'centripetal');
  routeCurve = curve;
  guideRouteLength = Math.max(1, curve.getLength());
  guideSamples = Array.from({ length: 97 }, (_, index) => curve.getPointAt(index / 96));
  guideInitialized = false;
  const steps = Math.max(7, Math.ceil(curve.getLength() / 2.3));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    if (i % 4 === 0) {
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), routePaint);
      arrow.rotation.set(-Math.PI / 2, 0, Math.atan2(-tangent.x, -tangent.z));
      arrow.scale.setScalar(0.62);
      arrow.position.copy(point);
      routeGroup.add(arrow);
    } else {
      const dash = box(routeGroup, 0.12, 0.012, 1.1, routePaint, point.x, point.y, point.z, false);
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
    }
  }
}
const guideArrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: '#ffe17a', transparent: true, opacity: 0.88, depthWrite: false }));
guideArrow.rotation.x = -Math.PI / 2;
guideArrow.scale.setScalar(0.82);
scene.add(guideArrow);
const coneGroup = new THREE.Group();
scene.add(coneGroup);
const islandGroup = new THREE.Group();
scene.add(islandGroup);
const solidIslands = [];
function makeTrafficIsland(x, z, environment) {
  const base = environment === 'store' ? boundaryBlue : boundaryStone;
  box(islandGroup, 2.7, 0.46, 1.65, base, x, 0.23, z);
  box(islandGroup, 2.35, 0.8, 1.3, boundaryLeaf, x, 0.77, z);
  for (const side of [-0.7, 0, 0.7]) {
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), flowerColors[Math.floor(random() * flowerColors.length)]);
    flower.position.set(x + side, 1.19, z);
    islandGroup.add(flower);
  }
  solidIslands.push({ x, z });
}
const coneOrange = new THREE.MeshStandardMaterial({ color: '#f27d2e', roughness: 0.63 });
const coneWhite = new THREE.MeshStandardMaterial({ color: '#fff7e6', roughness: 0.76 });
const coneBase = new THREE.MeshStandardMaterial({ color: '#2d3940', roughness: 0.9 });
const coneBody = new THREE.CylinderGeometry(0.12, 0.43, 1.05, 12);
const coneStripe = new THREE.CylinderGeometry(0.30, 0.38, 0.20, 12);
function makeCone(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  coneGroup.add(group);
  box(group, 0.92, 0.12, 0.92, coneBase, 0, 0.06, 0);
  const body = new THREE.Mesh(coneBody, coneOrange);
  body.position.y = 0.63;
  body.castShadow = true;
  group.add(body);
  const stripe = new THREE.Mesh(coneStripe, coneWhite);
  stripe.position.y = 0.59;
  stripe.castShadow = true;
  group.add(stripe);
  return { group, hit: false, targetX: x, lean: 0 };
}

const paintLine = new THREE.MeshBasicMaterial({ color: '#c9ccca' });
function marking(x, z, width, depth, material = paintLine) { return plane(width, depth, material, x, z, 0.014); }
marking(0, -32, 115, 0.12, new THREE.MeshBasicMaterial({ color: '#ded9b8' }));
const outerParkingLines = new THREE.Group();
scene.add(outerParkingLines);
for (const x of [28, 34.5, 41, 47.5]) outerParkingLines.add(marking(x, 9, 0.1, 17));
outerParkingLines.add(marking(37.75, 0.5, 19.6, 0.1));
outerParkingLines.add(marking(37.75, 17.5, 19.6, 0.1));
const curb = new THREE.MeshStandardMaterial({ color: '#9a9d98', roughness: 1 });
box(scene, 118, 0.22, 0.36, curb, 0, 0.08, -25.45);
box(scene, 118, 0.22, 0.36, curb, 0, 0.08, -38.55);

// Forest silhouettes and hedges close the yard, like the tree line in the image.
const treeTrunk = new THREE.CylinderGeometry(0.22, 0.35, 3.6, 7);
const treeCrown = new THREE.SphereGeometry(1, 10, 7);
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#5b4937', roughness: 1 });
const foliageMaterials = ['#365d38', '#426e3d', '#597943', '#6f8b44'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
const treeCount = 280;
const trunks = new THREE.InstancedMesh(treeTrunk, trunkMaterial, treeCount);
const foliage = foliageMaterials.map(material => new THREE.InstancedMesh(treeCrown, material, Math.ceil(treeCount / 4)));
const foliageCounts = [0, 0, 0, 0];
const dummy = new THREE.Object3D();
for (let i = 0; i < treeCount; i++) {
  const x = -75 + random() * 150;
  const z = -41 - random() * 48;
  const scale = 0.72 + random() * 0.82;
  dummy.position.set(x, 1.8 * scale, z);
  dummy.scale.set(scale, scale, scale);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.y = 4.6 * scale;
  dummy.scale.set(2.5 * scale, 3.2 * scale, 2.3 * scale);
  dummy.updateMatrix();
  const color = i % 4;
  foliage[color].setMatrixAt(foliageCounts[color]++, dummy.matrix);
}
trunks.instanceMatrix.needsUpdate = true;
scene.add(trunks);
for (let i = 0; i < foliage.length; i++) {
  foliage[i].count = foliageCounts[i];
  foliage[i].instanceMatrix.needsUpdate = true;
  scene.add(foliage[i]);
}
const hedgeMaterial = new THREE.MeshStandardMaterial({ color: '#55753f', roughness: 1 });
const bushGeometry = new THREE.SphereGeometry(1, 10, 7);
function hedge(startX, endX, z) {
  for (let x = startX; x <= endX; x += 1.8) {
    const bush = new THREE.Mesh(bushGeometry, hedgeMaterial);
    bush.position.set(x, 0.78, z + Math.sin(x * 2.3) * 0.15);
    bush.scale.set(1.2, 0.82, 0.9);
    bush.castShadow = true;
    garageEnvironment.add(bush);
  }
}
hedge(26, 43, -7);
hedge(-44, -32, -8);

// The driveable area ends at these edges. Place scenery just beyond the car's
// footprint so every limit has something the player can see and understand.
const driveBounds = { minX: -14, maxX: 24, maxZ: 24, roundMinZ: -13.5 };
const boundaryWood = new THREE.MeshStandardMaterial({ color: '#a98463', roughness: 0.94 });
const boundaryStone = new THREE.MeshStandardMaterial({ color: '#ded9c8', roughness: 0.94 });
const boundaryBlue = new THREE.MeshStandardMaterial({ color: '#8ba6aa', roughness: 0.86 });
const boundaryLeaf = new THREE.MeshStandardMaterial({ color: '#6c965a', roughness: 1 });
const boundaryGrass = new THREE.MeshStandardMaterial({ color: '#85a56d', roughness: 1 });
const flowerColors = ['#fff0a8', '#f4a5a5', '#f4d7fa', '#ffffff'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
function boundary(parent, material, style, closeFront = false) {
  const sideX = [-16.15, 26.15];
  for (const x of sideX) {
    const segments = x < 0 && parent === garageEnvironment ? [[-17, 9]]
      : x < 0 && parent === storeEnvironment ? [[-17, 7], [17, 25]] : [[-17, 25]];
    for (const [start, end] of segments) {
      const middle = (start + end) / 2;
      const length = end - start;
      box(parent, 2.2, 0.16, length + 1, boundaryGrass, x, 0.01, middle);
      box(parent, 0.55, 0.42, length + 0.5, boundaryStone, x - Math.sign(x) * 0.45, 0.2, middle);
      if (style === 'hedge') box(parent, 0.9, 1.15, length, boundaryLeaf, x, 0.61, middle);
      else {
        for (let z = start; z <= end; z += 4.2) box(parent, 0.24, 1.55, 0.24, material, x, 0.8, z);
        for (const y of [0.65, 1.22]) box(parent, 0.13, 0.13, length, material, x, y, middle);
      }
    }
  }
  box(parent, 42.5, 0.16, 2.3, boundaryGrass, 5, 0.01, 26.1);
  box(parent, 41.6, 0.42, 0.55, boundaryStone, 5, 0.2, 25.55);
  if (style === 'hedge') box(parent, 40.5, 1.05, 0.9, boundaryLeaf, 5, 0.6, 26.2);
  else {
    for (let x = -16; x <= 26; x += 4.2) box(parent, 0.24, 1.55, 0.24, material, x, 0.8, 26.1);
    for (const y of [0.65, 1.22]) box(parent, 42.5, 0.13, 0.13, material, 5, y, 26.1);
  }
  if (closeFront) {
    box(parent, 43, 0.18, 2.2, boundaryGrass, 5, 0.01, -17.15);
    box(parent, 42.5, 0.42, 0.55, boundaryStone, 5, 0.2, -16.55);
    box(parent, 40, 1.05, 0.85, boundaryLeaf, 5, 0.65, -17.2);
  }
}
boundary(garageEnvironment, boundaryWood, 'fence');
boundary(storeEnvironment, boundaryBlue, 'fence');
boundary(roundaboutEnvironment, boundaryStone, 'hedge', true);

function smallHouse(parent, x, z, wallColor, roofColor, size = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(size);
  parent.add(group);
  const wall = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
  const roofPaint = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.84 });
  box(group, 8, 5.4, 7.6, wall, 0, 2.7, 0);
  const top = box(group, 8.8, 0.42, 8.5, roofPaint, 0, 5.65, 0);
  top.rotation.z = -0.045;
  box(group, 1.4, 2.7, 0.14, doorMaterial, 0, 1.38, 3.87);
  for (const wx of [-2.55, 2.55]) {
    box(group, 1.9, 1.9, 0.17, trim, wx, 3.18, 3.88);
    box(group, 1.63, 1.62, 0.18, glass, wx, 3.18, 3.99, false);
    box(group, 0.11, 1.72, 0.2, trim, wx, 3.18, 4.1, false);
  }
  box(group, 2.3, 0.2, 0.38, trim, 0, 2.83, 4.05);
}
for (const [x, z, wall, roofColor, scale] of [
  [36, -10, '#e0d7c5', '#9a6557', 1], [37, 8, '#b8c9d2', '#6d8088', 0.92],
  [36, 28, '#d7c1b5', '#9b574e', 1.03], [-28, 34, '#c8d3c4', '#8f6853', 1],
]) smallHouse(garageEnvironment, x, z, wall, roofColor, scale);
for (const [x, z, wall, roofColor] of [
  [37, -9, '#d6e3dd', '#5f8593'], [38, 9, '#e5d6bb', '#879d96'],
  [37, 29, '#c5d9df', '#5f8593'], [-28, 33, '#ebd9bc', '#8da6a1'],
]) smallHouse(storeEnvironment, x, z, wall, roofColor, 0.9);
for (const [x, z, wall, roofColor] of [
  [-27, -12, '#e6ceb9', '#a76556'], [-28, 11, '#b9d1d8', '#6d8290'],
  [-28, 31, '#f0dfc9', '#9f695d'], [37, -12, '#d8d8c5', '#879875'],
  [38, 9, '#d8c4b5', '#a8705a'], [37, 30, '#c1d3d3', '#748c96'],
]) smallHouse(roundaboutEnvironment, x, z, wall, roofColor, 0.94);

function roadsideTree(parent, x, z, scale = 1) {
  const trunk = new THREE.Mesh(treeTrunk, trunkMaterial);
  trunk.position.set(x, 1.8 * scale, z);
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  parent.add(trunk);
  for (const [dx, dy, dz, radius] of [[0, 4.1, 0, 2.2], [-1.1, 3.4, 0.3, 1.5], [1, 3.6, -0.2, 1.45]]) {
    const crown = new THREE.Mesh(treeCrown, foliageMaterials[Math.floor(random() * foliageMaterials.length)]);
    crown.position.set(x + dx * scale, dy * scale, z + dz * scale);
    crown.scale.set(radius * scale, radius * 0.9 * scale, radius * scale);
    crown.castShadow = true;
    parent.add(crown);
  }
}
for (const z of [-14, 2, 18, 35]) roadsideTree(garageEnvironment, 30.5, z, 0.72);
for (const z of [-17, 3, 22]) roadsideTree(storeEnvironment, 32, z, 0.72);
for (const z of [-13, 3, 20, 34]) roadsideTree(roundaboutEnvironment, 31.5, z, 0.78);
for (const z of [-8, 13, 32]) roadsideTree(roundaboutEnvironment, -21.5, z, 0.68);
for (let i = 0; i < 22; i++) {
  const angle = i / 22 * Math.PI * 2;
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), flowerColors[i % flowerColors.length]);
  flower.position.set(5 + Math.cos(angle) * 4.6, 0.28, 4 + Math.sin(angle) * 4.6);
  roundaboutEnvironment.add(flower);
}
for (const [x, z] of [[-10, 25.4], [4, 25.4], [18, 25.4]]) {
  box(garageEnvironment, 2.2, 0.45, 0.9, boundaryStone, x, 0.23, z - 0.5);
  box(garageEnvironment, 2.05, 0.6, 0.75, boundaryLeaf, x, 0.63, z - 0.5);
}
for (const [x, z] of [[-11, 25.2], [3, 25.2], [17, 25.2]]) {
  box(storeEnvironment, 2.7, 0.48, 1.05, boundaryBlue, x, 0.24, z - 0.4);
  box(storeEnvironment, 2.5, 0.75, 0.86, boundaryLeaf, x, 0.73, z - 0.4);
}
const lampGlow = new THREE.MeshBasicMaterial({ color: '#fff3cd' });
const lampPoleMaterial = new THREE.MeshStandardMaterial({ color: '#aeb9b7', metalness: 0.58, roughness: 0.46 });
function streetLamp(parent, x, z) {
  box(parent, 0.15, 6.8, 0.15, lampPoleMaterial, x, 3.4, z);
  box(parent, 1.15, 0.16, 0.35, lampPoleMaterial, x - 0.5, 6.76, z);
  box(parent, 0.8, 0.09, 0.32, lampGlow, x - 0.58, 6.65, z, false);
}
for (const z of [-3, 19]) streetLamp(garageEnvironment, 27.8, z);
for (const z of [-2, 19]) streetLamp(storeEnvironment, 28.2, z);
for (const z of [-8, 17]) streetLamp(roundaboutEnvironment, 28.1, z);

const poleMaterial = new THREE.MeshStandardMaterial({ color: '#c4c8c6', metalness: 0.6, roughness: 0.4 });
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 11, 10), poleMaterial);
pole.position.set(-2, 5.5, -29);
pole.castShadow = true;
scene.add(pole);
box(scene, 1.35, 0.18, 0.4, poleMaterial, -1.45, 11, -29);
box(scene, 0.85, 0.1, 0.35, new THREE.MeshBasicMaterial({ color: '#f7f5db' }), -0.9, 10.85, -29);

const car = new THREE.Group();
car.position.set(0, 0, 8);
scene.add(car);
const crashSparkGroup = new THREE.Group();
scene.add(crashSparkGroup);
const crashSparkGeometry = new THREE.SphereGeometry(0.12, 6, 5);
const crashSparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffe079', transparent: true, opacity: 1, depthWrite: false });
const crashParticles = [];
let carReady = false;
const parkedCars = [];
const reflectionTarget = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const reflectionCamera = new THREE.CubeCamera(0.1, 220, reflectionTarget);
reflectionCamera.position.set(0, 1.5, 8);
reflectionCamera.update(renderer, scene);
const blackPaint = new THREE.MeshPhysicalMaterial({
  color: '#080a0d', metalness: 0.24, roughness: 0.15,
  clearcoat: 1, clearcoatRoughness: 0.045,
  envMap: reflectionTarget.texture, envMapIntensity: 0.14,
});

new GLTFLoader().load(carUrl, (gltf) => {
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 6.1 / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale + 0.025, -center.z * scale);
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material?.name?.includes('vehicle_generic_smallspecmap')) child.material = blackPaint;
    child.castShadow = true;
  });
  car.add(model);
  const parkedPaints = ['#344451', '#e3e8e9', '#3d5365'].map(color => new THREE.MeshPhysicalMaterial({ color, metalness: 0.45, roughness: 0.24, clearcoat: 0.7, envMap: reflectionTarget.texture, envMapIntensity: 0.25 }));
  for (let i = 0; i < 3; i++) {
    const parked = new THREE.Group();
    const copy = cloneSkeleton(model);
    copy.traverse((child) => { if (child.isMesh && child.material === blackPaint) child.material = parkedPaints[i]; });
    parked.add(copy);
    parked.position.set(31.25 + i * 6.5, 0, 8.5);
    parked.rotation.y = 0.12;
    scene.add(parked);
    parkedCars.push(parked);
  }
  arrangeParkedCars();
  carReady = true;
  refreshReflections();
  document.querySelector('#loading').classList.add('hidden');
}, undefined, (error) => {
  console.error('Could not load Volvo model:', error);
  document.querySelector('#loading').textContent = 'Could not load the car';
});

let speed = 0;
let soundOn = true;
let audioContext;
let engineTone;
let engineSubTone;
let engineOvertone;
let enginePulse;
let roadNoiseGain;
let engineGain;
let engineFilter;
let engineRpm = 60;
let lastSoundSpeed = 0;
function ensureAudio() {
  if (!soundOn) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  if (!audioContext) {
    audioContext = new AudioContextType();
    engineTone = audioContext.createOscillator();
    engineTone.type = 'sawtooth';
    engineSubTone = audioContext.createOscillator();
    engineSubTone.type = 'sine';
    engineOvertone = audioContext.createOscillator();
    engineOvertone.type = 'triangle';
    engineFilter = audioContext.createBiquadFilter();
    engineFilter.type = 'lowpass';
    const motorBody = audioContext.createGain();
    motorBody.gain.value = 0.42;
    const motorBass = audioContext.createGain();
    motorBass.gain.value = 0.52;
    const motorTop = audioContext.createGain();
    motorTop.gain.value = 0.15;
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0;
    engineTone.connect(engineFilter);
    engineOvertone.connect(motorTop).connect(engineFilter);
    engineFilter.connect(motorBody).connect(engineGain);
    engineSubTone.connect(motorBass).connect(engineGain);
    enginePulse = audioContext.createOscillator();
    enginePulse.type = 'sine';
    const pulseDepth = audioContext.createGain();
    pulseDepth.gain.value = 0.08;
    enginePulse.connect(pulseDepth).connect(motorBody.gain);
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noiseSamples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSamples.length; i++) noiseSamples[i] = Math.random() * 2 - 1;
    const roadNoise = audioContext.createBufferSource();
    roadNoise.buffer = noiseBuffer;
    roadNoise.loop = true;
    const roadFilter = audioContext.createBiquadFilter();
    roadFilter.type = 'bandpass';
    roadFilter.frequency.value = 310;
    roadFilter.Q.value = 0.55;
    roadNoiseGain = audioContext.createGain();
    roadNoiseGain.gain.value = 0;
    roadNoise.connect(roadFilter).connect(roadNoiseGain).connect(engineGain);
    engineGain.connect(audioContext.destination);
    engineTone.start();
    engineSubTone.start();
    engineOvertone.start();
    enginePulse.start();
    roadNoise.start();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}
function playNote(frequency, delay, duration, volume = 0.085) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
function playWinSound() {
  for (const [frequency, delay] of [[392, 0], [494, 0.13], [587, 0.26], [784, 0.42]]) playNote(frequency, delay, 0.35, 0.095);
}
function playCrashSound() {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  for (const [type, startFrequency, endFrequency, volume, duration] of [
    ['sine', 170, 62, 0.16, 0.28], ['triangle', 390, 135, 0.055, 0.18],
  ]) {
    const tone = audioContext.createOscillator();
    const gain = audioContext.createGain();
    tone.type = type;
    tone.frequency.setValueAtTime(startFrequency, now);
    tone.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    tone.connect(gain).connect(audioContext.destination);
    tone.start(now);
    tone.stop(now + duration + 0.02);
  }
  const noiseBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 0.18), audioContext.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'lowpass';
  filter.frequency.value = 850;
  gain.gain.setValueAtTime(0.065, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  noise.connect(filter).connect(gain).connect(audioContext.destination);
  noise.start(now);
  noise.stop(now + 0.18);
}
function updateEngineSound(dt = 1 / 60) {
  if (!audioContext || !engineGain) return;
  const now = audioContext.currentTime;
  const throttle = (input.active && Math.hypot(input.axisX, input.axisY) > 0.12) || keys.has('w') || keys.has('arrowup') || keys.has(' ');
  const acceleration = Math.max(0, (speed - lastSoundSpeed) / Math.max(dt, 0.016));
  lastSoundSpeed = speed;
  const targetRpm = 54 + speed * 11 + (throttle ? 14 : 0) + Math.min(13, acceleration * 1.8);
  engineRpm = THREE.MathUtils.damp(engineRpm, targetRpm, 5.5, dt);
  const volume = soundOn && !completed && !crashing && (speed > 0.05 || throttle) ? 0.023 + speed * 0.0028 : 0;
  engineGain.gain.setTargetAtTime(volume, now, 0.11);
  engineTone.frequency.setTargetAtTime(engineRpm, now, 0.06);
  engineSubTone.frequency.setTargetAtTime(engineRpm * 0.5, now, 0.06);
  engineOvertone.frequency.setTargetAtTime(engineRpm * 2.02, now, 0.06);
  enginePulse.frequency.setTargetAtTime(engineRpm * 0.25, now, 0.08);
  engineFilter.frequency.setTargetAtTime(185 + speed * 42 + (throttle ? 75 : 0), now, 0.08);
  roadNoiseGain.gain.setTargetAtTime(speed * 0.028, now, 0.12);
}
const input = { active: false, pointerId: null, source: null, startX: 0, startY: 0, dragX: 0, dragZ: 0, axisX: 0, axisY: 0 };
const pointerRay = new THREE.Raycaster();
const drivePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const startGround = new THREE.Vector3();
const currentGround = new THREE.Vector3();
function groundPoint(clientX, clientY, target) {
  const rect = canvas.getBoundingClientRect();
  pointerRay.setFromCamera(new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    1 - ((clientY - rect.top) / rect.height) * 2,
  ), camera);
  return pointerRay.ray.intersectPlane(drivePlane, target);
}
function startDrive(event, source) {
  if (input.active || !carReady || completed || crashing) return;
  event.preventDefault();
  ensureAudio();
  input.active = true;
  input.pointerId = event.pointerId;
  input.source = source;
  input.startX = event.clientX;
  input.startY = event.clientY;
  input.dragX = 0;
  input.dragZ = 0;
  input.axisX = 0;
  input.axisY = 0;
  source.setPointerCapture(event.pointerId);
  instruction.classList.add('is-driving');
}
function updateDrive(event) {
  if (!input.active || event.pointerId !== input.pointerId) return;
  if (input.source === canvas) {
    input.axisX = THREE.MathUtils.clamp((event.clientX - input.startX) / 115, -1, 1);
    input.axisY = THREE.MathUtils.clamp((event.clientY - input.startY) / 115, -1, 1);
    if (groundPoint(input.startX, input.startY, startGround) && groundPoint(event.clientX, event.clientY, currentGround)) {
      input.dragX = currentGround.x - startGround.x;
      input.dragZ = currentGround.z - startGround.z;
    }
  }
}
function endDrive(event) {
  if (event && event.pointerId !== input.pointerId) return;
  input.active = false;
  input.pointerId = null;
  input.source = null;
  input.axisX = 0;
  input.axisY = 0;
  instruction.classList.remove('is-driving');
}
canvas.addEventListener('pointerdown', (event) => startDrive(event, canvas));
canvas.addEventListener('pointermove', updateDrive);
canvas.addEventListener('pointerup', endDrive);
canvas.addEventListener('pointercancel', endDrive);
canvas.addEventListener('lostpointercapture', endDrive);
const levels = [
  { environment: 'garage', type: 'garage', bay: 2, start: [0, 18], route: [[0, 18], [7, 16], [10, 10], [7, 3], [2, 0], [1.9, -12.5]], pickups: [2], cones: [[3, 12]], cars: [], islands: [[1, 8]], threeStar: 70 },
  { environment: 'store', type: 'parking', goal: [20, 4], start: [-10, 20], route: [[-10, 20], [-7, 14], [1, 15], [8, 11], [17, 13], [20, 4]], pickups: [2, 4], cones: [[5, 8], [16, 8]], cars: [[-4, 4, 0], [8, 4, 0]], islands: [[5, 19], [14, 8]], threeStar: 100 },
  { environment: 'roundabout', type: 'parking', goal: [-10, -8], start: [20, 18], route: [[20, 18], [16, 12], [17, 4], [13, -5], [5, -8], [-3, -7], [-10, -8]], pickups: [2, 4], cones: [[16, 11], [8, -9]], cars: [[20, -10, 0], [-10, 8, 0]], islands: [], threeStar: 110 },
  { environment: 'garage', type: 'parking', goal: [-6, 0], start: [20, 20], route: [[20, 20], [18, 13], [10, 15], [4, 10], [-4, 9], [-6, 0]], pickups: [2, 4], cones: [[16, 17], [6, 7]], cars: [[12, 4, 0], [3, 3, 0]], islands: [[15, 8], [0, 16]], threeStar: 115 },
  { environment: 'store', type: 'parking', goal: [-10, 4], start: [22, 20], route: [[22, 20], [17, 14], [10, 16], [3, 11], [-5, 14], [-10, 4]], pickups: [2, 4], cones: [[18, 9], [-6, 8]], cars: [[14, 4, 0], [2, 4, 0]], islands: [[14, 10], [-2, 8]], threeStar: 115 },
  { environment: 'roundabout', type: 'parking', goal: [20, -7], start: [-11, 18], route: [[-11, 18], [-5, 13], [-7, 4], [-4, -5], [5, -8], [14, -7], [20, -7]], pickups: [2, 4], cones: [[-9, 8], [12, -9]], cars: [[-10, -9, 0], [20, 11, 0]], islands: [], threeStar: 120 },
  { environment: 'garage', type: 'garage', bay: 4, start: [-4, 20], route: [[-4, 20], [1, 14], [10, 17], [17, 10], [13, 3], [14.3, -2], [14.3, -12.5]], pickups: [2, 4], cones: [[2, 8], [19, 13]], cars: [[4, 6, 0], [20, 5, 0]], islands: [[10, 10]], threeStar: 125 },
  { environment: 'store', type: 'parking', goal: [8, 4], start: [-10, 20], route: [[-10, 20], [-8, 12], [-2, 16], [4, 12], [15, 14], [8, 4]], pickups: [2, 4], cones: [[-5, 9], [11, 9]], cars: [[-10, 4, 0], [20, 4, 0]], islands: [[1, 8], [18, 9]], threeStar: 125 },
  { environment: 'roundabout', type: 'parking', goal: [20, 17], start: [-11, -9], route: [[-11, -9], [-8, 1], [-4, 11], [5, 16], [14, 12], [20, 17]], pickups: [2, 4], cones: [[-8, 6], [11, 16]], cars: [[20, -9, 0], [-10, 18, 0]], islands: [], threeStar: 130 },
  { environment: 'garage', type: 'parking', goal: [17, 0], start: [-5, 19], route: [[-5, 19], [0, 14], [8, 18], [17, 15], [12, 8], [17, 0]], pickups: [2, 4], cones: [[11, 15], [15, 4]], cars: [[-3, 4, 0], [5, 4, 0], [21, 9, 0]], islands: [[5, 10], [20, 12]], threeStar: 135 },
  { environment: 'store', type: 'parking', goal: [-4, 4], start: [21, 19], route: [[21, 19], [17, 12], [11, 16], [5, 11], [-7, 13], [-4, 4]], pickups: [2, 4], cones: [[18, 8], [-8, 9]], cars: [[20, 4, 0], [8, 4, 0], [-10, 4, 0]], islands: [[14, 9], [-1, 8]], threeStar: 135 },
  { environment: 'roundabout', type: 'parking', goal: [-10, 17], start: [20, -9], route: [[20, -9], [18, 1], [15, 10], [5, 16], [-4, 12], [-10, 17]], pickups: [2, 4], cones: [[16, 6], [-7, 10]], cars: [[20, 19, 0], [-10, -10, 0]], islands: [], threeStar: 140 },
  { environment: 'garage', type: 'garage', bay: 1, start: [20, 19], route: [[20, 19], [16, 13], [8, 17], [1, 12], [-3, 7], [3, 3], [-4.3, -2], [-4.3, -12.5]], pickups: [2, 4, 6], cones: [[18, 9], [-7, 7], [2, -2]], cars: [[14, 5, 0], [8, 7, 0]], islands: [[8, 11], [0, 17]], threeStar: 145 },
  { environment: 'store', type: 'parking', goal: [14, 4], start: [-11, 20], route: [[-11, 20], [-6, 14], [1, 18], [7, 12], [18, 16], [20, 10], [14, 4]], pickups: [2, 4, 5], cones: [[5, 8], [12, 8], [18, 8]], cars: [[-10, 4, 0], [2, 4, 0], [20, 4, 0]], islands: [[2, 9], [12, 8]], threeStar: 145 },
  { environment: 'roundabout', type: 'parking', goal: [-10, -8], start: [20, 18], route: [[20, 18], [14, 13], [5, 16], [-4, 12], [-7, 4], [-4, -5], [-10, -8]], pickups: [2, 4, 5], cones: [[16, 11], [-8, 8]], cars: [[20, -9, 0], [-10, 17, 0]], islands: [], threeStar: 150 },
  { environment: 'garage', type: 'parking', goal: [9, 0], start: [-7, 19], route: [[-7, 19], [-2, 13], [6, 17], [18, 15], [20, 8], [13, 9], [9, 0]], pickups: [2, 4, 5], cones: [[2, 9], [17, 12], [12, 4]], cars: [[-6, 4, 0], [3, 4, 0], [20, 3, 0]], islands: [[5, 10], [16, 5]], threeStar: 150 },
  { environment: 'store', type: 'parking', goal: [2, 4], start: [22, 20], route: [[22, 20], [16, 13], [10, 17], [4, 12], [-8, 15], [-6, 9], [2, 4]], pickups: [2, 4, 5], cones: [[-4, 11], [5, 8], [17, 9]], cars: [[20, 4, 0], [14, 4, 0], [-10, 4, 0]], islands: [[11, 9], [2, 18]], threeStar: 155 },
  { environment: 'roundabout', type: 'parking', goal: [20, -7], start: [-11, 18], route: [[-11, 18], [-5, 13], [-7, 4], [-4, -5], [5, -8], [13, -5], [17, 4], [20, -7]], pickups: [2, 4, 6], cones: [[-8, 7], [6, -10], [17, 8]], cars: [[-10, -10, 0], [20, 18, 0]], islands: [], threeStar: 160 },
  { environment: 'garage', type: 'garage', bay: 3, start: [-5, 20], route: [[-5, 20], [0, 14], [10, 18], [18, 14], [15, 7], [5, 9], [8, -2], [8.1, -12.5]], pickups: [2, 4, 6], cones: [[1, 10], [12, 12], [4, 2]], cars: [[-5, 5, 0], [20, 3, 0]], islands: [[10, 3], [20, 18]], threeStar: 165 },
  { environment: 'roundabout', type: 'parking', goal: [-10, 17], start: [20, 18], route: [[20, 18], [17, 4], [13, -5], [5, -8], [-4, -5], [-7, 4], [-4, 12], [-10, 17]], pickups: [2, 4, 6], cones: [[16, 11], [10, -9], [-8, 8]], cars: [[20, -10, 0], [-10, -10, 0], [22, -1, 0]], islands: [], threeStar: 170 },
];
const obstacles = [];
let level = 1;
let activeLevel = levels[0];
let activePickup = 0;
let checkpointRouteProgress = 1;
let completed = false;
let crashing = false;
let crashTime = 0;
let levelElapsed = 0;
let timerStarted = false;
function startCrash() {
  if (crashing || completed) return;
  crashing = true;
  crashTime = 0;
  speed = 0;
  keys.clear();
  endDrive();
  playCrashSound();
  document.querySelector('#crash-feedback').hidden = false;
  crashSparkGroup.clear();
  crashParticles.length = 0;
  crashSparkMaterial.opacity = 1;
  const impactX = car.position.x + Math.sin(car.rotation.y) * 2.3;
  const impactZ = car.position.z + Math.cos(car.rotation.y) * 2.3;
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const spark = new THREE.Mesh(crashSparkGeometry, crashSparkMaterial);
    spark.position.set(impactX, 0.85, impactZ);
    spark.scale.setScalar(i % 3 === 0 ? 1.55 : 1);
    crashSparkGroup.add(spark);
    crashParticles.push({ mesh: spark, velocity: new THREE.Vector3(Math.cos(angle) * (1.5 + Math.random() * 1.6), 2.2 + Math.random() * 2, Math.sin(angle) * (1.5 + Math.random() * 1.6)) });
  }
}
function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
function updateObjective() {
  const placeName = { garage: 'Garage yard', store: 'Sunny Market', roundabout: 'Roundabout' }[activeLevel.environment];
  const total = activeLevel.pickups.length;
  const progress = document.querySelector('#star-progress');
  progress.textContent = `⭐ ${activePickup}/${total}`;
  progress.setAttribute('aria-label', `${activePickup} of ${total} route stars collected`);
  const nextRouteIndex = activeLevel.pickups[activePickup];
  checkpointMarker.visible = nextRouteIndex !== undefined;
  if (checkpointMarker.visible) {
    const [x, z] = activeLevel.route[nextRouteIndex];
    checkpointMarker.position.set(x, 0, z);
    let bestDistance = Infinity;
    for (let i = 0; i < guideSamples.length; i++) {
      const distance = Math.hypot(guideSamples[i].x - x, guideSamples[i].z - z);
      if (distance < bestDistance) {
        bestDistance = distance;
        checkpointRouteProgress = i / (guideSamples.length - 1);
      }
    }
  } else checkpointRouteProgress = 1;
  const readyToPark = activePickup === total;
  garageDoors.forEach((panel, index) => { panel.visible = activeLevel.type !== 'garage' || !readyToPark || index !== activeLevel.bay; });
  goalMarker.visible = activeLevel.type === 'garage' && readyToPark;
  parkingMarker.visible = activeLevel.type === 'parking' && readyToPark;
  document.querySelector('#goal-instruction').textContent = `${placeName} · ${checkpointMarker.visible ? 'Catch the star!' : activeLevel.type === 'garage' ? 'Find the open door' : 'Find the glowing parking spot'}`;
}
function arrangeParkedCars() {
  parkedCars.forEach((parked, index) => {
    const placement = activeLevel.cars[index] || [31.25 + index * 6.5, 8.5, 0.12];
    parked.position.set(placement[0], 0, placement[1]);
    parked.rotation.y = placement[2];
  });
}
function refreshReflections() {
  if (!carReady) return;
  car.visible = false;
  parkedCars.forEach((parked) => { parked.visible = false; });
  reflectionCamera.position.set(car.position.x, 1.5, car.position.z);
  reflectionCamera.update(renderer, scene);
  car.visible = true;
  parkedCars.forEach((parked) => { parked.visible = true; });
}
function beginLevel(number) {
  crashing = false;
  crashTime = 0;
  crashSparkGroup.clear();
  crashParticles.length = 0;
  document.querySelector('#crash-feedback').hidden = true;
  level = number > levels.length ? 1 : number;
  activeLevel = levels[level - 1];
  garageEnvironment.visible = activeLevel.environment === 'garage';
  storeEnvironment.visible = activeLevel.environment === 'store';
  roundaboutEnvironment.visible = activeLevel.environment === 'roundabout';
  outerParkingLines.visible = activeLevel.environment !== 'roundabout';
  const skyColor = { garage: '#a7c2d2', store: '#b9d7e0', roundabout: '#b7d8dd' }[activeLevel.environment];
  scene.background.set(skyColor);
  scene.fog.color.set(skyColor);
  completed = false;
  levelElapsed = 0;
  timerStarted = false;
  garageDoors.forEach((panel, index) => { panel.visible = activeLevel.type !== 'garage' || index !== activeLevel.bay; });
  goalMarker.visible = activeLevel.type === 'garage';
  parkingMarker.visible = activeLevel.type === 'parking';
  if (goalMarker.visible) goalMarker.position.set(5 - 15.5 + activeLevel.bay * 6.2, 0, -9);
  if (parkingMarker.visible) parkingMarker.position.set(activeLevel.goal[0], 0, activeLevel.goal[1]);
  drawRoute(activeLevel.route);
  activePickup = 0;
  updateObjective();
  coneGroup.position.x = 0;
  clearDynamicGroup(coneGroup, [coneBody, coneStripe]);
  obstacles.length = 0;
  for (const [x, z] of activeLevel.cones) obstacles.push(makeCone(x, z));
  clearDynamicGroup(islandGroup);
  solidIslands.length = 0;
  for (const [x, z] of activeLevel.islands) makeTrafficIsland(x, z, activeLevel.environment);
  arrangeParkedCars();
  const [startX, startZ] = activeLevel.start;
  car.position.set(startX, 0, startZ);
  car.rotation.y = Math.atan2(activeLevel.route[1][0] - startX, activeLevel.route[1][1] - startZ);
  car.rotation.z = 0;
  refreshReflections();
  speed = 0;
  lastSoundSpeed = 0;
  engineRpm = 60;
  endDrive();
  document.querySelector('#level-number').textContent = `Level ${level} / ${levels.length}`;
  const placeName = { garage: 'Garage yard', store: 'Sunny Market', roundabout: 'Roundabout' }[activeLevel.environment];
  canvas.setAttribute('aria-label', `Drive the black Volvo at ${placeName}`);
  document.querySelector('#level-time').textContent = '0:00';
  document.querySelector('#win-screen').hidden = true;
  document.querySelector('#next-level').innerHTML = level === levels.length ? 'Play again <span aria-hidden="true">↻</span>' : 'Next level <span aria-hidden="true">➜</span>';
  camera.position.set(startX + 10, 25, startZ + 22);
  camera.lookAt(startX, 0, startZ);
}
const keys = new Set();
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (['w', 'arrowup', ' '].includes(event.key.toLowerCase())) ensureAudio();
  keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); endDrive(); });
document.querySelector('#reset').addEventListener('click', () => {
  beginLevel(level);
});
document.querySelector('#next-level').addEventListener('click', () => beginLevel(level + 1));
document.querySelector('#retry-level').addEventListener('click', () => beginLevel(level));
document.querySelector('#sound-toggle').addEventListener('click', () => {
  soundOn = !soundOn;
  const button = document.querySelector('#sound-toggle');
  button.textContent = soundOn ? '🔊' : '🔇';
  button.setAttribute('aria-label', soundOn ? 'Mute sounds' : 'Turn on sounds');
  button.setAttribute('aria-pressed', String(!soundOn));
  if (soundOn) ensureAudio();
  updateEngineSound();
});

const clock = new THREE.Clock();
const cameraGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
camera.position.set(10, 25, 30);
camera.lookAt(0, 0, 8);
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 650 ? 57 : 43;
  camera.zoom = 1.18;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const keyboardForward = keys.has('w') || keys.has('arrowup') || keys.has(' ');
  const draggingScene = input.active && input.source === canvas;
  const keySteer = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  if (carReady && !completed && !crashing) {
    const dragAmount = Math.hypot(input.axisX, input.axisY);
    if (draggingScene && dragAmount >= 0.12) {
      let targetYaw = Math.atan2(input.dragX, input.dragZ);
      const garageX = goalMarker.position.x;
      // Help young players line up with the open door once they reach the garage.
      if (activeLevel.type === 'garage' && activePickup === activeLevel.pickups.length && car.position.z < 0.5 && Math.abs(car.position.x - garageX) < 7.5) {
        const alignmentZ = Math.abs(car.position.x - garageX) > 1.3 ? -6.7 : -14;
        targetYaw = Math.atan2(garageX - car.position.x, alignmentZ - car.position.z);
      } else if (activeLevel.type === 'parking') {
        const toParkingX = parkingMarker.position.x - car.position.x;
        const toParkingZ = parkingMarker.position.z - car.position.z;
        if (activePickup === activeLevel.pickups.length && Math.hypot(toParkingX, toParkingZ) < 6) targetYaw = Math.atan2(toParkingX, toParkingZ);
      }
      const turn = Math.atan2(Math.sin(targetYaw - car.rotation.y), Math.cos(targetYaw - car.rotation.y));
      const turnRate = 2.25 * Math.min(1, 0.55 + speed * 0.16);
      car.rotation.y += THREE.MathUtils.clamp(turn, -turnRate * dt, turnRate * dt);
      // The drag sets a direction, so holding keeps the car moving forward.
      const cornerSpeed = THREE.MathUtils.clamp(1 - Math.abs(turn) / Math.PI, 0.32, 1);
      const desiredSpeed = Math.min(7.2, 2.5 + dragAmount * 4.2) * cornerSpeed;
      speed = THREE.MathUtils.clamp(desiredSpeed, Math.max(0, speed - 12 * dt), speed + 8 * dt);
    } else {
      speed = THREE.MathUtils.damp(speed, keyboardForward ? 6.6 : 0, keyboardForward ? 1.8 : 4.4, dt);
      if (Math.abs(speed) < 0.015) speed = 0;
      if (keyboardForward && keySteer) car.rotation.y += keySteer * Math.min(2, speed * 0.38) * dt;
    }
    const impactSpeed = speed;
    const desiredX = car.position.x + Math.sin(car.rotation.y) * speed * dt;
    const desiredZ = car.position.z + Math.cos(car.rotation.y) * speed * dt;
    let nextX = THREE.MathUtils.clamp(desiredX, driveBounds.minX, driveBounds.maxX);
    let nextZ = THREE.MathUtils.clamp(desiredZ, activeLevel.environment === 'roundabout' ? driveBounds.roundMinZ : -15.5, driveBounds.maxZ);
    let hitSolid = nextX !== desiredX || nextZ !== desiredZ;
    if (activeLevel.environment === 'garage' && nextX < -9.5 && nextZ > 10.8) {
      hitSolid = true;
      nextX = car.position.x;
      nextZ = car.position.z;
      speed = Math.min(speed, 0.2);
    }
    if (activeLevel.environment === 'roundabout' && Math.hypot(nextX - 5, nextZ - 4) < 7.05) {
      hitSolid = true;
      nextX = car.position.x;
      nextZ = car.position.z;
      speed = Math.min(speed, 0.2);
    }
    for (const island of solidIslands) {
      if (Math.hypot(nextX - island.x, nextZ - island.z) < 2.45) {
        hitSolid = true;
        nextX = car.position.x;
        nextZ = car.position.z;
        speed = Math.min(speed, 0.2);
        break;
      }
    }
    for (let i = 0; i < activeLevel.cars.length; i++) {
      const parked = parkedCars[i];
      if (parked && Math.hypot(nextX - parked.position.x, nextZ - parked.position.z) < 3.15) {
        hitSolid = true;
        nextX = car.position.x;
        nextZ = car.position.z;
        speed = Math.min(speed, 0.25);
        break;
      }
    }
    const doorwayX = goalMarker.position.x;
    if (activeLevel.type === 'parking') {
      const minZ = activeLevel.environment === 'garage' ? -6.1 : activeLevel.environment === 'store' ? -3.5 : -13.5;
      if (nextZ < minZ) hitSolid = true;
      car.position.set(nextX, 0, Math.max(nextZ, minZ));
    } else if (activeLevel.type === 'garage' && nextZ < -6.1 && (activePickup < activeLevel.pickups.length || Math.abs(nextX - doorwayX) > 1.65)) {
      hitSolid = true;
      car.position.set(nextX, 0, -6.1);
    } else {
      car.position.set(activeLevel.type === 'garage' && nextZ < -6.1 ? THREE.MathUtils.clamp(nextX, doorwayX - 1.65, doorwayX + 1.65) : nextX, 0, nextZ);
    }
    if (speed > 0.2) timerStarted = true;
    if (timerStarted) {
      levelElapsed += dt;
      document.querySelector('#level-time').textContent = formatTime(levelElapsed);
    }
    if (checkpointMarker.visible && Math.hypot(car.position.x - checkpointMarker.position.x, car.position.z - checkpointMarker.position.z) < 4) {
      activePickup++;
      updateObjective();
      const progress = document.querySelector('#star-progress');
      progress.classList.remove('pop');
      void progress.offsetWidth;
      progress.classList.add('pop');
      playNote(659, 0, 0.18, 0.07);
      playNote(880, 0.09, 0.23, 0.065);
    }
    for (const obstacle of obstacles) {
      const coneX = coneGroup.position.x + obstacle.group.position.x;
      if (!obstacle.hit && Math.abs(car.position.x - coneX) < 1.3 && Math.abs(car.position.z - obstacle.group.position.z) < 2.1) {
        obstacle.hit = true;
        const push = car.position.x <= coneX ? 1 : -1;
        obstacle.targetX = obstacle.group.position.x + push * 1.7;
        obstacle.lean = push * 0.9;
        speed *= 0.68;
        playNote(190, 0, 0.14, 0.055);
      }
      if (obstacle.hit) {
        obstacle.group.position.x = THREE.MathUtils.damp(obstacle.group.position.x, obstacle.targetX, 7, dt);
        obstacle.group.rotation.z = THREE.MathUtils.damp(obstacle.group.rotation.z, obstacle.lean, 6, dt);
      }
    }
    const parkedInGoal = activePickup === activeLevel.pickups.length && (activeLevel.type === 'garage'
      ? car.position.z < -12.2 && Math.abs(car.position.x - doorwayX) < 1.55
      : Math.hypot(car.position.x - parkingMarker.position.x, car.position.z - parkingMarker.position.z) < 1.85);
    if (parkedInGoal) {
      completed = true;
      speed = 0;
      endDrive();
      const stars = levelElapsed <= activeLevel.threeStar ? 3 : levelElapsed <= activeLevel.threeStar * 1.8 ? 2 : 1;
      const starBox = document.querySelector('#win-stars');
      starBox.replaceChildren(...Array.from({ length: 3 }, (_, index) => {
        const star = document.createElement('span');
        star.textContent = '★';
        if (index < stars) star.classList.add('earned');
        return star;
      }));
      starBox.setAttribute('aria-label', `${stars} out of 3 stars`);
      document.querySelector('#win-title').textContent = activeLevel.type === 'garage' ? 'Garage parked!' : 'You parked it!';
      document.querySelector('#win-level').textContent = `Level ${level} complete`;
      document.querySelector('#win-time').textContent = `Time: ${formatTime(levelElapsed)}`;
      document.querySelector('#win-screen').hidden = false;
      playWinSound();
    }
    if (hitSolid) speed = Math.min(speed, 0.2);
    if (hitSolid && impactSpeed > 1.8 && !completed) startCrash();
  }
  if (crashing) {
    crashTime += dt;
    const shake = Math.exp(-4 * crashTime);
    car.rotation.z = Math.sin(crashTime * 28) * 0.075 * shake;
    car.position.y = Math.abs(Math.sin(crashTime * 20)) * 0.12 * shake;
    for (const particle of crashParticles) {
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.y -= 9 * dt;
    }
    crashSparkMaterial.opacity = Math.max(0, 1 - crashTime / 0.65);
    if (crashTime >= 1.55) beginLevel(level);
  }
  updateEngineSound(dt);
  if (checkpointMarker.visible) {
    const pulse = clock.elapsedTime * 3.2;
    checkpointStar.position.y = 2.15 + Math.sin(pulse) * 0.22;
    checkpointStar.material.rotation = Math.sin(pulse * 0.55) * 0.12;
    checkpointRing.scale.setScalar(1 + Math.sin(pulse) * 0.08);
  }
  guideArrow.visible = !completed && !crashing;
  if (!completed && !crashing) {
    let nearestAlong = 0;
    let nearestDistanceSq = Infinity;
    for (let index = 0; index < guideSamples.length - 1; index++) {
      const from = guideSamples[index];
      const to = guideSamples[index + 1];
      const segmentX = to.x - from.x;
      const segmentZ = to.z - from.z;
      const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
      const along = segmentLengthSq > 0 ? THREE.MathUtils.clamp(((car.position.x - from.x) * segmentX + (car.position.z - from.z) * segmentZ) / segmentLengthSq, 0, 1) : 0;
      const offsetX = car.position.x - from.x - segmentX * along;
      const offsetZ = car.position.z - from.z - segmentZ * along;
      const distanceSq = offsetX * offsetX + offsetZ * offsetZ;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestAlong = (index + along) / (guideSamples.length - 1);
      }
    }
    const routePoint = routeCurve.getPointAt(Math.min(checkpointRouteProgress, nearestAlong + 4 / guideRouteLength));
    const deltaX = routePoint.x - car.position.x;
    const deltaZ = routePoint.z - car.position.z;
    const distance = Math.max(0.001, Math.hypot(deltaX, deltaZ));
    const ahead = Math.min(3.5, distance);
    const targetX = car.position.x + deltaX / distance * ahead;
    const targetZ = car.position.z + deltaZ / distance * ahead;
    const targetAngle = Math.atan2(-deltaX, -deltaZ);
    if (!guideInitialized) {
      guideArrow.position.set(targetX, 0.07, targetZ);
      guideArrow.rotation.z = targetAngle;
      guideInitialized = true;
    } else {
      const blend = 1 - Math.exp(-15 * dt);
      guideArrow.position.x = THREE.MathUtils.lerp(guideArrow.position.x, targetX, blend);
      guideArrow.position.z = THREE.MathUtils.lerp(guideArrow.position.z, targetZ, blend);
      const angleDifference = Math.atan2(Math.sin(targetAngle - guideArrow.rotation.z), Math.cos(targetAngle - guideArrow.rotation.z));
      guideArrow.rotation.z += angleDifference * blend;
    }
  }
  lookGoal.set(car.position.x + Math.sin(car.rotation.y) * 0.8, 0, car.position.z + Math.cos(car.rotation.y) * 0.8);
  cameraGoal.set(lookGoal.x + 10, 25, lookGoal.z + 22);
  camera.position.lerp(cameraGoal, 1 - Math.exp(-5 * dt));
  if (crashing) {
    const shake = Math.exp(-7 * crashTime);
    camera.position.x += Math.sin(crashTime * 34) * 0.17 * shake;
    camera.position.z += Math.cos(crashTime * 31) * 0.13 * shake;
  }
  camera.lookAt(lookGoal);
  renderer.render(scene, camera);
}
const requestedLevel = Number(new URLSearchParams(window.location.search).get('level'));
beginLevel(Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= levels.length ? requestedLevel : 1);
animate();
