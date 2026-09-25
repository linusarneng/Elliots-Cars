import * as THREE from 'three';

// A McDonald's you can drive into: dining room, ordering counter with menu
// boards, a kitchen with staff, self-order kiosks and a PlayPlace. When the
// player is inside, the roof is hidden and the walls fade so the camera can see in.
// Local coordinates: the building spans x -14..14, z -10..10, entrance on the +z side.
export const MCD_SIZE = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 };
const HEIGHT = 5.2;

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

const floorTexture = canvasTexture(256, 256, (ctx, w) => {
  const tile = w / 4;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#e9e1d2' : '#cfc3ae';
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(80,60,40,.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(w, i * tile); ctx.stroke();
  }
});
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(7, 5);

function drawBurger(ctx, x, y, size) {
  ctx.fillStyle = '#e6a44a';
  ctx.beginPath(); ctx.ellipse(x, y - size * 0.25, size, size * 0.55, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#5ba33b'; ctx.fillRect(x - size, y - size * 0.25, size * 2, size * 0.16);
  ctx.fillStyle = '#6b3a1f'; ctx.fillRect(x - size * 0.95, y - size * 0.1, size * 1.9, size * 0.3);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(x - size, y - size * 0.12, size * 2, size * 0.08);
  ctx.fillStyle = '#e6a44a'; ctx.fillRect(x - size * 0.95, y + size * 0.2, size * 1.9, size * 0.28);
  ctx.fillStyle = '#fff5dc';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + i * size * 0.3, y - size * 0.55, size * 0.05, size * 0.03, 0.4, 0, Math.PI * 2); ctx.fill(); }
}
function drawFries(ctx, x, y, size) {
  ctx.fillStyle = '#f5c518';
  for (let i = -3; i <= 3; i++) ctx.fillRect(x + i * size * 0.14 - size * 0.05, y - size * 1.1 + Math.abs(i) * size * 0.08, size * 0.1, size * 0.9);
  ctx.fillStyle = '#da291c';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.55, y - size * 0.35); ctx.lineTo(x + size * 0.55, y - size * 0.35);
  ctx.lineTo(x + size * 0.42, y + size * 0.45); ctx.lineTo(x - size * 0.42, y + size * 0.45); ctx.fill();
}
function drawDrink(ctx, x, y, size) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.4, y - size * 0.8); ctx.lineTo(x + size * 0.4, y - size * 0.8);
  ctx.lineTo(x + size * 0.3, y + size * 0.5); ctx.lineTo(x - size * 0.3, y + size * 0.5); ctx.fill();
  ctx.fillStyle = '#da291c'; ctx.fillRect(x - size * 0.36, y - size * 0.35, size * 0.72, size * 0.3);
  ctx.fillStyle = '#ffc72c'; ctx.fillRect(x + size * 0.05, y - size * 1.2, size * 0.07, size * 0.45);
}
const MENUS = [
  { title: 'BURGARE', items: [['Big Mac', '69 kr', drawBurger], ['Cheeseburger', '25 kr', drawBurger], ['McFeast', '72 kr', drawBurger]] },
  { title: 'HAPPY MEAL', items: [['Happy Meal', '55 kr', drawBurger], ['Pommes Frites', '29 kr', drawFries], ['Mjölkshake', '32 kr', drawDrink]] },
  { title: 'DRYCK & MER', items: [['Coca-Cola', '25 kr', drawDrink], ['McFlurry', '35 kr', drawDrink], ['Stora Pommes', '35 kr', drawFries]] },
];
const menuTextures = MENUS.map((menu) => canvasTexture(512, 320, (ctx, w, h) => {
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#da291c'; ctx.fillRect(0, 0, w, 58);
  ctx.fillStyle = '#ffc72c'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(menu.title, w / 2, 30);
  menu.items.forEach(([name, price, draw], i) => {
    const x = 90 + i * 166;
    draw(ctx, x, 150, 42);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial'; ctx.fillText(name, x, 232);
    ctx.fillStyle = '#ffc72c'; ctx.font = 'bold 30px Arial'; ctx.fillText(price, x, 272);
  });
}));
const kioskTexture = canvasTexture(128, 256, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#da291c'; ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = '#ffc72c'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText('BESTÄLL HÄR', w / 2, 28);
  drawBurger(ctx, w / 2, 110, 30);
  drawFries(ctx, w / 2 - 25, 200, 20);
  drawDrink(ctx, w / 2 + 25, 200, 20);
  ctx.fillStyle = '#27ae60'; ctx.fillRect(14, 226, w - 28, 22);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Arial'; ctx.fillText('START', w / 2, 242);
});
const wcTexture = canvasTexture(128, 64, (ctx, w, h) => {
  ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('WC', w / 2, h / 2 + 2);
});
const playTexture = canvasTexture(256, 64, (ctx, w, h) => {
  ctx.fillStyle = '#ffc72c'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#da291c'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PlayPlace', w / 2, h / 2 + 2);
});
const trashTexture = canvasTexture(128, 64, (ctx, w, h) => {
  ctx.fillStyle = '#4a3325'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TACK', w / 2, h / 2 + 2);
});

const m = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const mat = {
  brickOut: m('#8f3b2b', { roughness: 0.9, transparent: true }),
  wallIn: m('#efe4cf', { roughness: 0.85, transparent: true }),
  woodPanel: m('#a86f3d', { roughness: 0.75, transparent: true }),
  yellow: m('#ffc72c', { roughness: 0.55 }),
  red: m('#da291c', { roughness: 0.55 }),
  roof: m('#3b3f45', { roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#9fc4d6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 }),
  frame: m('#2d2f33', { metalness: 0.5, roughness: 0.4 }),
  steel: m('#b9bec3', { metalness: 0.75, roughness: 0.3 }),
  darkSteel: m('#5d6268', { metalness: 0.6, roughness: 0.4 }),
  counterTop: m('#dcdcdc', { roughness: 0.35 }),
  black: m('#1c1c1e', { roughness: 0.5 }),
  white: m('#f7f5f0'),
  table: m('#f2ede4', { roughness: 0.4 }),
  wood: m('#b07a45'),
  green: m('#3d8b4f'),
  blue: m('#2e86de'),
  skin: m('#e8c1a0'),
  staffShirt: m('#2d2d2d'),
  oil: m('#d9a520', { roughness: 0.2, metalness: 0.2 }),
  heat: new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff8a1f', emissiveIntensity: 1.2 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#fff0c8', emissiveIntensity: 1.1 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.55 }),
  kiosk: new THREE.MeshBasicMaterial({ map: kioskTexture }),
  wc: new THREE.MeshBasicMaterial({ map: wcTexture }),
  play: new THREE.MeshBasicMaterial({ map: playTexture }),
  trash: new THREE.MeshBasicMaterial({ map: trashTexture }),
  menus: menuTextures.map((map) => new THREE.MeshBasicMaterial({ map })),
  balls: ['#da291c', '#ffc72c', '#2e86de', '#27ae60', '#e84393'].map((color) => m(color, { roughness: 0.35 })),
};

export function createMcDonalds({ signTexture, archesTexture }) {
  const root = new THREE.Group();
  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  const roof = new THREE.Group();
  const lamps = new THREE.Group();
  root.add(exterior, interior, roof, lamps);
  const solids = [];

  function box(parent, w, h, d, material, x, y, z, solid = false, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) solids.push(mesh);
    return mesh;
  }
  function cyl(parent, rTop, rBottom, h, material, x, y, z, solid = false, segments = 18) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) solids.push(mesh);
    return mesh;
  }
  function plane(parent, w, h, material, x, y, z, rotY = 0) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    parent.add(mesh);
    return mesh;
  }

  // ---- Shell: walls with windows and an entrance on the front ----
  // Each side has its own materials so only the wall between camera and player fades.
  const walls = {};
  for (const side of ['back', 'east', 'west', 'front']) {
    walls[side] = { brick: mat.brickOut.clone(), inner: mat.wallIn.clone(), wood: mat.woodPanel.clone() };
  }
  const { minX, maxX, minZ, maxZ } = MCD_SIZE;
  const t = 0.35;
  const wallY = HEIGHT / 2;
  // Back wall and east wall (solid, drive-thru window on the east)
  box(exterior, maxX - minX, HEIGHT, t, walls.back.brick, 0, wallY, minZ, true);
  box(interior, maxX - minX - 0.8, HEIGHT - 0.2, 0.1, walls.back.inner, 0, wallY, minZ + 0.25);
  box(exterior, t, HEIGHT, maxZ - minZ, walls.east.brick, maxX, wallY, 0, true);
  box(interior, 0.1, HEIGHT - 0.2, maxZ - minZ - 0.8, walls.east.inner, maxX - 0.25, wallY, 0);
  box(exterior, 0.2, 1.6, 2.6, mat.glass, maxX + 0.05, 2.1, -6, false, false);
  box(exterior, 0.5, 0.25, 3.2, mat.red, maxX + 0.35, 3.1, -6);
  // West wall: windows between wood pillars, WC door inside
  box(exterior, t, 1.1, maxZ - minZ, walls.west.brick, minX, 0.55, 0, true);
  box(exterior, t, 1.2, maxZ - minZ, walls.west.brick, minX, HEIGHT - 0.6, 0, true);
  for (let z = minZ; z <= maxZ; z += 4) box(exterior, t + 0.05, HEIGHT, 0.5, walls.west.wood, minX, wallY, z, true);
  box(exterior, 0.12, 2.9, maxZ - minZ, mat.glass, minX, 2.55, 0, false, false);
  // Front wall: big windows either side of the sliding doors
  const doorHalf = 2;
  for (const side of [-1, 1]) {
    const from = side < 0 ? minX : doorHalf;
    const to = side < 0 ? -doorHalf : maxX;
    const center = (from + to) / 2;
    const width = to - from;
    box(exterior, width, 1.1, t, walls.front.brick, center, 0.55, maxZ, true);
    box(exterior, width, 2.9, 0.12, mat.glass, center, 2.55, maxZ, false, false);
    for (let x = from; x <= to + 0.01; x += width / 3) box(exterior, 0.4, HEIGHT, t + 0.05, walls.front.wood, x, wallY, maxZ, true);
  }
  box(exterior, maxX - minX, 1.2, t, walls.front.brick, 0, HEIGHT - 0.6, maxZ); // above the door, so not solid
  // Entrance canopy and the McDonald's sign
  box(exterior, 7, 0.3, 2.4, mat.red, 0, 3.6, maxZ + 1.2);
  box(exterior, 7.2, 0.12, 2.5, mat.yellow, 0, 3.78, maxZ + 1.2);
  const sign = plane(exterior, 9, 2.25, new THREE.MeshBasicMaterial({ map: signTexture }), -7.5, 4.3, maxZ + 0.22);
  sign.scale.set(0.8, 0.8, 1);
  const arches = plane(exterior, 2.4, 2.4, new THREE.MeshBasicMaterial({ map: archesTexture }), 8.5, 4.3, maxZ + 0.22);
  // Sliding doors
  const doors = [];
  for (const side of [-1, 1]) {
    const door = box(exterior, doorHalf, 3.3, 0.1, mat.glass, side * doorHalf / 2, 1.7, maxZ, false, false);
    box(door, 0.08, 3.3, 0.14, mat.frame, side * doorHalf / 2, 0, 0);
    box(door, 0.08, 1.1, 0.16, mat.steel, -side * doorHalf / 2 + side * 0.25, 0, 0.05);
    doors.push({ mesh: door, side, closedX: side * doorHalf / 2 });
  }
  box(exterior, doorHalf * 2 + 0.3, 0.3, t + 0.05, mat.frame, 0, 3.45, maxZ);

  // ---- Roof: parapet with the yellow band, dark top, rooftop units ----
  box(roof, maxX - minX + 0.8, 0.35, maxZ - minZ + 0.8, mat.roof, 0, HEIGHT + 0.15, 0);
  for (const [w, d, x, z] of [[maxX - minX + 1, 0.3, 0, minZ - 0.35], [maxX - minX + 1, 0.3, 0, maxZ + 0.35], [0.3, maxZ - minZ + 1, minX - 0.35, 0], [0.3, maxZ - minZ + 1, maxX + 0.35, 0]]) {
    box(roof, w, 1.1, d, mat.yellow, x, HEIGHT - 0.1, z);
  }
  box(roof, 3, 1.1, 2.2, mat.steel, -6, HEIGHT + 0.85, -5);
  box(roof, 2, 0.9, 2, mat.darkSteel, 4, HEIGHT + 0.75, -4);
  cyl(roof, 0.35, 0.35, 1.4, mat.steel, 9, HEIGHT + 1, -6);

  // ---- Floor ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX - 0.4, maxZ - minZ - 0.4), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;
  interior.add(floor);

  // ---- Ordering counter with registers, menu boards overhead ----
  const counterZ = -3.8;
  box(interior, 15, 1.35, 1.2, mat.red, -2.5, 0.68, counterZ, true);
  box(interior, 15.3, 0.1, 1.4, mat.counterTop, -2.5, 1.4, counterZ);
  box(interior, 15, 0.2, 0.05, mat.yellow, -2.5, 1.05, counterZ + 0.62);
  for (const x of [-8, -4, 0]) {
    box(interior, 0.8, 0.45, 0.6, mat.black, x, 1.68, counterZ - 0.1);
    const screen = box(interior, 0.7, 0.45, 0.05, mat.blue, x, 2.05, counterZ + 0.15);
    screen.rotation.x = -0.35;
  }
  box(interior, 1.6, 0.05, 1.1, mat.darkSteel, 3.5, 1.46, counterZ); // tray slide
  for (let i = 0; i < 3; i++) {
    const board = plane(interior, 4.2, 2.1, mat.menus[i], -7.2 + i * 4.4, 3.95, counterZ - 0.9);
    box(interior, 4.4, 2.3, 0.1, mat.black, board.position.x, 3.95, counterZ - 0.97);
  }

  // ---- Kitchen behind the counter ----
  const backZ = minZ + 1.2;
  box(interior, 2.4, 1.4, 1.6, mat.steel, -10.5, 0.7, backZ, true); // fryer
  for (const x of [-11.1, -9.9]) box(interior, 0.9, 0.05, 1.1, mat.oil, x, 1.42, backZ);
  for (const x of [-11.1, -9.9]) box(interior, 0.7, 0.3, 0.6, mat.darkSteel, x, 1.65, backZ + 0.3);
  box(interior, 3, 1.3, 1.6, mat.darkSteel, -7, 0.65, backZ, true); // grill
  box(interior, 3, 0.08, 1.5, mat.black, -7, 1.34, backZ);
  for (let i = 0; i < 6; i++) cyl(interior, 0.22, 0.22, 0.07, m('#6b3a1f'), -8 + (i % 3) * 0.9, 1.42, backZ - 0.3 + Math.floor(i / 3) * 0.6);
  box(interior, 4, 1.3, 1.4, mat.steel, -2.5, 0.65, backZ, true); // prep table
  box(interior, 4, 0.1, 1.3, mat.counterTop, -2.5, 1.35, backZ);
  box(interior, 3.2, 0.5, 0.9, mat.heat, -2.5, 2.3, counterZ - 1.9); // warming shelf with burger boxes
  for (let i = 0; i < 5; i++) box(interior, 0.45, 0.3, 0.4, i % 2 ? mat.yellow : mat.red, -3.9 + i * 0.7, 1.9, counterZ - 1.9);
  box(interior, 2.2, 2.4, 1.2, mat.steel, 2.5, 1.2, backZ, true); // drinks machine
  for (let i = 0; i < 4; i++) {
    cyl(interior, 0.08, 0.08, 0.4, mat.black, 1.8 + i * 0.45, 1.3, backZ + 0.55);
    cyl(interior, 0.13, 0.1, 0.4, mat.white, 1.8 + i * 0.45, 0.95, backZ + 0.6);
  }
  box(interior, 2.2, 0.6, 0.1, mat.red, 2.5, 2.05, backZ + 0.62);
  box(interior, 1.6, 3.4, 1.2, mat.steel, 6, 1.7, backZ, true); // fridge
  box(interior, 0.08, 1.4, 0.05, mat.darkSteel, 5.5, 1.9, backZ + 0.62);
  box(interior, 5, 0.1, 0.8, mat.steel, 10.5, 3.1, minZ + 0.7); // shelves by the drive-thru
  box(interior, 5, 0.1, 0.8, mat.steel, 10.5, 2.3, minZ + 0.7);
  for (let i = 0; i < 6; i++) box(interior, 0.5, 0.5, 0.5, i % 2 ? m('#d7c49e') : mat.white, 8.6 + i * 0.75, 2.62, minZ + 0.7);
  box(interior, 2, 1.35, 1.2, mat.steel, 12.3, 0.68, -6, true); // drive-thru hand-out counter
  // Staff behind the counter, in black shirts and red caps
  function person(x, z, faceZ, shirt, cap) {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.rotation.y = faceZ;
    interior.add(p);
    cyl(p, 0.25, 0.25, 1.2, m('#2d3436'), 0, 0.6, 0);
    const body = cyl(p, 0.42, 0.36, 1.2, shirt, 0, 1.75, 0);
    body.scale.z = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), mat.skin);
    head.position.set(0, 2.72, 0);
    head.castShadow = true;
    p.add(head);
    cyl(p, 0.35, 0.35, 0.18, cap, 0, 2.98, 0);
    box(p, 0.5, 0.05, 0.35, cap, 0, 2.9, 0.35);
    for (const side of [-1, 1]) {
      const arm = cyl(p, 0.1, 0.1, 1, shirt, side * 0.5, 1.8, 0.2);
      arm.rotation.x = -0.6;
    }
    // Invisible collision block, removed again once the colliders are measured.
    box(p, 0.9, 2, 0.9, mat.black, 0, 1, 0, true).userData.colliderOnly = true;
  }
  person(-8, counterZ - 1.5, 0, mat.staffShirt, mat.red);
  person(-3.5, counterZ - 1.8, 0.3, mat.staffShirt, mat.red);
  person(-7, backZ + 1.4, Math.PI, mat.staffShirt, mat.yellow);

  // ---- Self-order kiosks along the east wall ----
  for (const z of [-1.5, 1.5, 4.5]) {
    const kiosk = new THREE.Group();
    kiosk.position.set(maxX - 0.9, 0, z);
    kiosk.rotation.y = -Math.PI / 2;
    interior.add(kiosk);
    box(kiosk, 1.3, 3.4, 0.5, mat.white, 0, 1.7, 0);
    const screen = plane(kiosk, 1.05, 2.1, mat.kiosk, 0, 2.2, 0.26);
    screen.rotation.x = -0.05;
    box(kiosk, 1.4, 0.35, 0.55, mat.red, 0, 0.18, 0);
    solids.push(kiosk.children[0]);
  }

  // ---- Dining room: tables with chairs and a booth by the west windows ----
  const chairColors = [mat.red, mat.yellow];
  function tableSet(x, z, chairs) {
    cyl(interior, 0.9, 0.9, 0.1, mat.table, x, 1.05, z, true, 24);
    cyl(interior, 0.1, 0.1, 1, mat.frame, x, 0.5, z);
    cyl(interior, 0.5, 0.5, 0.05, mat.frame, x, 0.03, z);
    for (let i = 0; i < chairs; i++) {
      const a = i / chairs * Math.PI * 2 + Math.PI / 4;
      const cx = x + Math.cos(a) * 1.55;
      const cz = z + Math.sin(a) * 1.55;
      const chair = new THREE.Group();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = -a - Math.PI / 2;
      interior.add(chair);
      const material = chairColors[i % 2];
      box(chair, 0.8, 0.1, 0.8, material, 0, 0.65, 0);
      box(chair, 0.8, 0.8, 0.1, material, 0, 1.05, 0.38);
      for (const [lx, lz] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]]) box(chair, 0.07, 0.65, 0.07, mat.frame, lx, 0.32, lz);
    }
    // A tray with a meal on some tables
    if ((x + z) % 2 === 0) {
      box(interior, 0.9, 0.04, 0.6, mat.red, x, 1.12, z);
      box(interior, 0.3, 0.25, 0.3, mat.yellow, x - 0.2, 1.27, z);
      cyl(interior, 0.1, 0.08, 0.35, mat.white, x + 0.25, 1.32, z - 0.1);
    }
  }
  // Tables stay west of the entrance so the way in from the door is clear.
  for (const [x, z] of [[-10.5, 1], [-10.5, 6.2], [-6, 1], [-6, 6.2]]) tableSet(x, z, 4);
  // Booth along the west windows
  box(interior, 1.2, 1.1, 8, mat.red, minX + 0.9, 0.55, -4, true);
  box(interior, 0.35, 1.2, 8, mat.red, minX + 0.4, 1.5, -4);
  box(interior, 1.2, 0.08, 7, mat.table, minX + 2.2, 1.05, -4);
  box(interior, 0.2, 1, 6.5, mat.frame, minX + 2.2, 0.5, -4, true);
  // WC door and sign on the west wall
  box(interior, 0.12, 3, 1.8, mat.wood, minX + 0.3, 1.5, -8.2);
  plane(interior, 1, 0.5, mat.wc, minX + 0.38, 3.4, -8.2, Math.PI / 2);
  // Tray return and bin, beside (not in front of) the entrance
  const trayX = -4.4;
  box(interior, 1.8, 1.8, 1, mat.wood, trayX, 0.9, 8.9, true);
  plane(interior, 1.2, 0.6, mat.trash, trayX, 1.3, 8.38, Math.PI);
  box(interior, 1.8, 0.1, 1.1, mat.counterTop, trayX, 1.85, 8.9);
  for (let i = 0; i < 4; i++) box(interior, 0.9, 0.04, 0.6, mat.red, trayX, 1.95 + i * 0.05, 8.9);

  // ---- PlayPlace in the south-east corner ----
  const play = new THREE.Group();
  play.position.set(8.5, 0, 6.2);
  interior.add(play);
  box(play, 9, 0.35, 0.2, mat.yellow, 0, 0.9, -3.3, true);
  // West fence with an opening to ride in through
  box(play, 0.2, 0.35, 2.4, mat.yellow, -4.5, 0.9, -2.1, true);
  box(play, 0.2, 0.35, 2.4, mat.yellow, -4.5, 0.9, 2.1, true);
  for (let i = 0; i <= 8; i++) box(play, 0.12, 0.9, 0.12, mat.red, -4.5 + i * 1.125, 0.45, -3.3, true);
  plane(play, 2.6, 0.65, mat.play, -1, 1.45, -3.19);
  // Ball pit with colourful balls
  box(play, 4, 0.5, 3, mat.blue, 1.6, 0.25, 0.6, true);
  const ballGeometry = new THREE.SphereGeometry(0.16, 8, 6);
  for (let c = 0; c < mat.balls.length; c++) {
    const balls = new THREE.InstancedMesh(ballGeometry, mat.balls[c], 30);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 30; i++) {
      dummy.position.set(1.6 + (Math.random() - 0.5) * 3.6, 0.55 + Math.random() * 0.12, 0.6 + (Math.random() - 0.5) * 2.6);
      dummy.updateMatrix();
      balls.setMatrixAt(i, dummy.matrix);
    }
    play.add(balls);
  }
  // Little slide
  box(play, 1.4, 2, 1.4, mat.red, -2.8, 1, 1.4, true);
  box(play, 1.6, 0.15, 1.6, mat.yellow, -2.8, 2.05, 1.4);
  const slide = box(play, 1.1, 0.12, 3.2, mat.yellow, -2.8, 1.05, -0.8);
  slide.rotation.x = 0.55;
  for (let i = 0; i < 4; i++) box(play, 1.1, 0.12, 0.4, mat.green, -2.8, 0.4 + i * 0.45, 2.3 + i * 0.05);

  // ---- Ceiling lamps, only shown while inside (the roof hides them otherwise) ----
  for (const [x, z] of [[-9, 2], [-4, 2], [-9, 7], [-4, 7], [1, 5], [7, 1], [-6, -6], [0, -6]]) {
    cyl(lamps, 0.03, 0.03, 1, mat.black, x, HEIGHT - 0.5, z);
    cyl(lamps, 0.35, 0.6, 0.45, mat.red, x, HEIGHT - 1.1, z);
    cyl(lamps, 0.45, 0.45, 0.05, mat.lamp, x, HEIGHT - 1.35, z);
  }
  lamps.visible = false;

  let inside = false;
  const fades = { back: 1, east: 1, west: 1, front: 1 };
  return {
    group: root,
    solids,
    staticGroups: [exterior, interior, roof, lamps],
    dynamic: doors.map((door) => door.mesh),
    // Roof off while the player is inside, and any wall between the camera and
    // the player turns see-through. Doors slide open when the player comes close.
    update(dt, local, cameraLocal) {
      const nowInside = local.x > minX && local.x < maxX && local.z > minZ && local.z < maxZ;
      if (nowInside !== inside) {
        inside = nowInside;
        roof.visible = !inside;
        lamps.visible = inside;
      }
      const blocking = {
        back: cameraLocal.z < minZ + 0.3,
        front: cameraLocal.z > maxZ - 0.3,
        west: cameraLocal.x < minX + 0.3,
        east: cameraLocal.x > maxX - 0.3,
      };
      for (const side of Object.keys(walls)) {
        fades[side] = THREE.MathUtils.damp(fades[side], inside && blocking[side] ? 0.18 : 1, 6, dt);
        for (const material of Object.values(walls[side])) {
          material.opacity = fades[side];
          material.depthWrite = fades[side] > 0.95;
        }
      }
      const near = Math.hypot(local.x, local.z - maxZ) < 7;
      for (const door of doors) {
        const target = door.closedX + (near ? door.side * (doorHalf - 0.1) : 0);
        door.mesh.position.x = THREE.MathUtils.damp(door.mesh.position.x, target, 6, dt);
      }
      return inside;
    },
  };
}
