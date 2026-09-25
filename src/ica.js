import * as THREE from 'three';

// An ICA supermarket you can drive into: checkouts by the entrance, fruit and
// vegetables, aisles of shelves, fridges along the back and shopping trolleys.
// Like the McDonald's, the roof hides and the wall facing the camera fades
// while the player is inside. Local coordinates: x -20..20, z -11..11, entrance on +z.
const SIZE = { minX: -20, maxX: 20, minZ: -11, maxZ: 11 };
const HEIGHT = 5.5;

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
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Shelf fronts: four rows of colourful packets, bottles and tins.
function shelfTexture(palette) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9e5dc';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      const top = row * 64;
      ctx.fillStyle = '#b8b2a6';
      ctx.fillRect(0, top + 58, w, 6);
      let x = 4;
      while (x < w - 10) {
        const kind = rand();
        const width = kind < 0.4 ? 22 : kind < 0.7 ? 16 : 30;
        const height = 26 + rand() * 26;
        const color = palette[Math.floor(rand() * palette.length)];
        ctx.fillStyle = color;
        if (kind >= 0.4 && kind < 0.7) {
          ctx.fillRect(x + 3, top + 58 - height, width - 6, height);
          ctx.fillRect(x + 6, top + 58 - height - 6, width - 12, 7);
        } else {
          ctx.fillRect(x, top + 58 - height, width - 2, height);
        }
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(x + 2, top + 58 - height * 0.6, width - 6, height * 0.2);
        x += width + 1;
      }
    }
  });
}
const shelfTextures = [
  shelfTexture(['#e74c3c', '#f1c40f', '#3498db', '#e67e22', '#2ecc71']),
  shelfTexture(['#8e44ad', '#e84393', '#fdcb6e', '#00b894', '#d63031']),
  shelfTexture(['#0984e3', '#fab1a0', '#6c5ce7', '#ffeaa7', '#55efc4']),
];
const fridgeTexture = canvasTexture(512, 256, (ctx, w, h) => {
  ctx.fillStyle = '#dff1f7';
  ctx.fillRect(0, 0, w, h);
  for (let row = 0; row < 3; row++) {
    const top = row * 84 + 10;
    ctx.fillStyle = '#9fc9d6';
    ctx.fillRect(0, top + 66, w, 5);
    for (let x = 6; x < w - 20; x += 24) {
      const milk = rand() < 0.6;
      ctx.fillStyle = milk ? '#ffffff' : ['#fdcb6e', '#fab1a0', '#74b9ff'][Math.floor(rand() * 3)];
      ctx.fillRect(x, top + 20, 20, 46);
      ctx.fillStyle = milk ? '#2e86de' : '#d63031';
      ctx.fillRect(x, top + 34, 20, 10);
      if (milk) { ctx.beginPath(); ctx.moveTo(x, top + 20); ctx.lineTo(x + 10, top + 10); ctx.lineTo(x + 20, top + 20); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
  }
});
function signTexture(text, background) {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}
const floorTexture = canvasTexture(128, 128, (ctx, w) => {
  ctx.fillStyle = '#e6e3dc';
  ctx.fillRect(0, 0, w, w);
  ctx.strokeStyle = 'rgba(90,80,70,.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, w - 2);
});
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(20, 11);

const m = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const mat = {
  wallOut: m('#f2f0ea', { roughness: 0.85, transparent: true }),
  wallIn: m('#faf8f3', { roughness: 0.9, transparent: true }),
  red: m('#e3000b', { roughness: 0.5 }),
  roof: m('#4b5157', { roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#a9cddb', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 }),
  frame: m('#3a3d42', { metalness: 0.5, roughness: 0.4 }),
  steel: m('#b9bec3', { metalness: 0.7, roughness: 0.3 }),
  belt: m('#1f2023', { roughness: 0.6 }),
  counter: m('#d9d6cf', { roughness: 0.4 }),
  wood: m('#b98a58'),
  crate: m('#9c7148'),
  shelf: m('#d7d2c8'),
  fridge: m('#e7eef1', { roughness: 0.3 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffbe8', emissiveIntensity: 1 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.5 }),
  skin: m('#e8c1a0'),
  cashier: m('#e3000b'),
  shoppers: ['#2e86de', '#27ae60', '#8e44ad'].map((c) => m(c)),
  trouser: m('#34495e'),
  shelves: shelfTextures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.8 })),
  fridgeFront: new THREE.MeshStandardMaterial({ map: fridgeTexture, roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.15 }),
  fruits: ['#d63031', '#e17055', '#f39c12', '#fdcb6e', '#6ab04c', '#badc58', '#6c3483'].map((c) => m(c, { roughness: 0.45 })),
  signs: [['FRUKT & GRÖNT', '#27ae60'], ['MEJERI', '#2e86de'], ['BRÖD', '#b9770e'], ['GODIS', '#e84393'], ['KASSA', '#e3000b']]
    .map(([text, color]) => new THREE.MeshBasicMaterial({ map: signTexture(text, color), side: THREE.DoubleSide })),
};

export function createIca({ signTexture: icaSign }) {
  const root = new THREE.Group();
  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  const roof = new THREE.Group();
  const lamps = new THREE.Group();
  root.add(exterior, interior, roof, lamps);
  const solids = [];
  function box(parent, w, h, d, material, x, y, z, solid = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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
  const { minX, maxX, minZ, maxZ } = SIZE;
  const t = 0.35;
  const wallY = HEIGHT / 2;
  const walls = {};
  for (const side of ['back', 'east', 'west', 'front']) walls[side] = { out: mat.wallOut.clone(), in: mat.wallIn.clone() };

  // ---- Shell ----
  box(exterior, maxX - minX, HEIGHT, t, walls.back.out, 0, wallY, minZ, true);
  box(interior, maxX - minX - 0.8, HEIGHT - 0.2, 0.1, walls.back.in, 0, wallY, minZ + 0.25);
  for (const [side, x] of [['west', minX], ['east', maxX]]) {
    box(exterior, t, HEIGHT, maxZ - minZ, walls[side].out, x, wallY, 0, true);
    box(interior, 0.1, HEIGHT - 0.2, maxZ - minZ - 0.8, walls[side].in, x - Math.sign(x) * 0.25, wallY, 0);
  }
  // Front: low wall with big windows, sliding doors in the middle
  const doorHalf = 2.2;
  for (const s of [-1, 1]) {
    const from = s < 0 ? minX : doorHalf;
    const to = s < 0 ? -doorHalf : maxX;
    const width = to - from;
    box(exterior, width, 1, t, walls.front.out, (from + to) / 2, 0.5, maxZ, true);
    box(exterior, width, 3.2, 0.12, mat.glass, (from + to) / 2, 2.6, maxZ);
    for (let x = from; x <= to + 0.01; x += width / 4) box(exterior, 0.3, HEIGHT, t + 0.05, walls.front.out, x, wallY, maxZ, true);
  }
  box(exterior, maxX - minX, 1.3, t, walls.front.out, 0, HEIGHT - 0.65, maxZ);
  // Red ICA band, sign and entrance canopy
  box(exterior, maxX - minX + 0.8, 1, 0.3, mat.red, 0, HEIGHT - 0.3, maxZ + 0.3);
  const sign = plane(exterior, 12, 3, new THREE.MeshBasicMaterial({ map: icaSign }), 0, HEIGHT + 1.2, maxZ + 0.2);
  sign.scale.set(0.9, 0.9, 1);
  box(exterior, 12.4, 3, 0.2, mat.red, 0, HEIGHT + 1.2, maxZ + 0.05);
  box(exterior, 8, 0.3, 2.6, mat.red, 0, 3.9, maxZ + 1.3);
  const doors = [];
  for (const s of [-1, 1]) {
    const door = box(exterior, doorHalf, 3.4, 0.1, mat.glass, s * doorHalf / 2, 1.75, maxZ);
    box(door, 0.08, 3.4, 0.14, mat.frame, s * doorHalf / 2, 0, 0);
    doors.push({ mesh: door, side: s, closedX: s * doorHalf / 2 });
  }
  box(exterior, doorHalf * 2 + 0.3, 0.3, t + 0.05, mat.frame, 0, 3.55, maxZ);

  // ---- Roof ----
  box(roof, maxX - minX + 0.8, 0.4, maxZ - minZ + 0.8, mat.roof, 0, HEIGHT + 0.2, 0);
  box(roof, 3, 1.2, 2, mat.steel, -10, HEIGHT + 1, -4);
  box(roof, 3, 1.2, 2, mat.steel, 8, HEIGHT + 1, -5);

  // ---- Floor ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX - 0.4, maxZ - minZ - 0.4), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;
  interior.add(floor);

  // ---- Checkouts on the west side of the entrance ----
  function person(x, z, facing, shirt) {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.rotation.y = facing;
    interior.add(p);
    for (const s of [-0.18, 0.18]) box(p, 0.25, 1.2, 0.3, mat.trouser, s, 0.6, 0);
    box(p, 0.85, 1.2, 0.5, shirt, 0, 1.8, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), mat.skin);
    head.position.y = 2.72;
    head.castShadow = true;
    p.add(head);
    box(p, 0.9, 2, 0.9, mat.frame, 0, 1, 0, true).userData.colliderOnly = true;
  }
  for (const [i, x] of [-15, -10.5, -6].entries()) {
    box(interior, 1.2, 1.1, 4, mat.counter, x, 0.55, 6.5, true);
    box(interior, 0.9, 0.06, 3.6, mat.belt, x, 1.13, 6.6);
    box(interior, 0.5, 0.5, 0.5, mat.frame, x - 0.2, 1.35, 4.8); // till
    box(interior, 0.8, 1.6, 0.6, mat.shelf, x - 1.3, 0.8, 8.7, true); // sweets rack
    plane(interior, 0.7, 1.2, mat.shelves[1], x - 1.3, 0.9, 9.01);
    person(x + 1.2, 5.2, -Math.PI / 2, mat.cashier);
    const kassa = plane(interior, 1.4, 0.35, mat.signs[4], x, 3.4, 6.5, Math.PI / 2);
    kassa.userData.index = i;
  }

  // ---- Fruit and vegetables east of the entrance ----
  const fruitGeometry = new THREE.SphereGeometry(0.16, 8, 6);
  const dummy = new THREE.Object3D();
  for (const [i, x] of [6, 10, 14, 18].entries()) {
    for (const [j, z] of [3, 7].entries()) {
      const stand = box(interior, 3.2, 1, 2.4, mat.crate, x, 0.5, z, true);
      stand.rotation.x = 0;
      const fruit = new THREE.InstancedMesh(fruitGeometry, mat.fruits[(i * 2 + j) % mat.fruits.length], 60);
      for (let k = 0; k < 60; k++) {
        dummy.position.set(x - 1.4 + (k % 10) * 0.31, 1.05 + (k % 3) * 0.05, z - 1 + Math.floor(k / 10) * 0.38);
        dummy.scale.set(1, (i + j) % 3 === 2 ? 0.55 : 1, (i + j) % 3 === 2 ? 2.2 : 1); // long shapes: bananas and cucumbers
        dummy.updateMatrix();
        fruit.setMatrixAt(k, dummy.matrix);
      }
      interior.add(fruit);
    }
  }
  plane(interior, 3.6, 0.9, mat.signs[0], 12, 3.6, 5, 0);

  // ---- Aisles of shelves ----
  for (const [i, x] of [-16, -10.5, -5, 0.5, 6].entries()) {
    // Room to ride round both ends: fridges behind, fruit stands in front.
    box(interior, 1.4, 2.6, 7, mat.shelf, x, 1.3, -3.9, true);
    for (const s of [-1, 1]) plane(interior, 7, 2.4, mat.shelves[(i + (s > 0 ? 1 : 0)) % 3], x + s * 0.71, 1.3, -3.9, s * Math.PI / 2);
    box(interior, 1.5, 0.1, 7.1, mat.red, x, 2.65, -3.9);
  }
  plane(interior, 3.2, 0.8, mat.signs[3], -13.2, 3.9, -1.2, 0);
  plane(interior, 3.2, 0.8, mat.signs[2], -2.2, 3.9, -1.2, 0);
  // Bread shelf on the east side
  box(interior, 1.2, 2.2, 6, mat.wood, 18.9, 1.1, -5, true);
  for (let k = 0; k < 12; k++) {
    const loaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), mat.fruits[1]);
    loaf.rotation.z = Math.PI / 2;
    loaf.position.set(18.3, 0.9 + (k % 3) * 0.6, -7.2 + Math.floor(k / 3) * 1.4);
    interior.add(loaf);
  }
  // Dairy fridges along the back wall
  box(interior, 30, 3, 1.2, mat.fridge, -3, 1.5, minZ + 0.9, true);
  plane(interior, 29.4, 2.6, mat.fridgeFront, -3, 1.5, minZ + 1.52);
  plane(interior, 4, 0.8, mat.signs[1], -3, 3.9, minZ + 1.6);

  // ---- Shoppers and trolleys ----
  function trolley(x, z, facing) {
    const tr = new THREE.Group();
    tr.position.set(x, 0, z);
    tr.rotation.y = facing;
    interior.add(tr);
    box(tr, 1, 0.8, 1.5, mat.steel, 0, 1, 0);
    box(tr, 1, 0.08, 0.1, mat.red, 0, 1.5, -0.8);
    for (const [wx, wz] of [[-0.4, -0.6], [0.4, -0.6], [-0.4, 0.6], [0.4, 0.6]]) box(tr, 0.1, 0.5, 0.1, mat.frame, wx, 0.3, wz);
    box(tr, 0.3, 0.3, 0.3, mat.fruits[3], 0.2, 1.4, 0.2);
    solids.push(tr.children[0]);
  }
  person(-13.2, -5.2, 0.4, mat.shoppers[0]);
  trolley(-13.4, -3.6, 0.4);
  person(3.2, -2, Math.PI, mat.shoppers[1]);
  trolley(3.2, -3.8, Math.PI);
  person(15, 0.5, -Math.PI / 2, mat.shoppers[2]);
  for (let k = 0; k < 4; k++) trolley(-18.6, 9.8 - k * 0.5, Math.PI / 2);

  // ---- Ceiling lights, only while inside ----
  for (const x of [-14, -7, 0, 7, 14]) {
    for (const z of [-6, 1, 7]) box(lamps, 3, 0.12, 0.5, mat.lamp, x, HEIGHT - 0.4, z);
  }
  lamps.visible = false;

  let inside = false;
  const fades = { back: 1, east: 1, west: 1, front: 1 };
  return {
    group: root,
    solids,
    staticGroups: [exterior, interior, roof, lamps],
    dynamic: doors.map((door) => door.mesh),
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
