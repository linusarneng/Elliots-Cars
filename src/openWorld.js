import * as THREE from 'three';

// Free-roam map: copies of every level location (garage yard, ICA, McDonald's,
// roundabout) laid out on one big field and joined by roads. It lives far away
// from the level area so the two never show up in the same view.
const OFFSET_X = 3000;
const BOUNDS = { minX: -70, maxX: 195, minZ: -45, maxZ: 150 };
const TILE = 12.75; // asphalt texture size in metres, matching the levels

// Each location keeps its own layout; the back row is turned around so every
// entrance faces the main road in the middle.
const LOCATIONS = [
  { key: 'garage', x: 0, z: 0, turn: 0, pad: [-24, 30, -20, 45] },
  { key: 'store', x: 120, z: 0, turn: 0, pad: [94, 150, -18, 45] },
  { key: 'mcdonalds', x: 0, z: 110, turn: Math.PI, pad: [-30, 20, 55, 128] },
  { key: 'roundabout', x: 120, z: 110, turn: Math.PI, pad: [88, 142, 55, 128] },
];
const ROADS = [
  [-60, 185, 45, 55], // main road between the two rows
  [60, 70, -40, 140], // cross road
];

function worldPlane(parent, material, minX, maxX, minZ, maxZ, y) {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const geometry = new THREE.PlaneGeometry(width, depth);
  // UVs in world units so the asphalt grain has the same size everywhere.
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (minX + uv.getX(i) * width) / TILE, (minZ + uv.getY(i) * depth) / TILE);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((minX + maxX) / 2, y, (minZ + maxZ) / 2);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createOpenWorld({ environments, asphaltTexture, grassMaterial, lineMaterial, mergeStatic, random }) {
  const group = new THREE.Group();
  group.position.x = OFFSET_X;
  group.visible = false;

  const roadTexture = asphaltTexture.clone();
  roadTexture.repeat.set(1, 1);
  roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.needsUpdate = true;
  const road = new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.96, metalness: 0.02 });

  // Grass, roads and paved lots are merged into a few meshes once built.
  const paving = new THREE.Group();
  group.add(paving);
  worldPlane(paving, grassMaterial, BOUNDS.minX - 60, BOUNDS.maxX + 60, BOUNDS.minZ - 60, BOUNDS.maxZ + 60, -0.08);
  for (const [minX, maxX, minZ, maxZ] of ROADS) {
    worldPlane(paving, road, minX, maxX, minZ, maxZ, -0.03);
    // Dashed centre line
    const alongX = maxX - minX > maxZ - minZ;
    const length = alongX ? maxX - minX : maxZ - minZ;
    for (let t = 2; t < length - 2; t += 7) {
      const x = alongX ? minX + t : (minX + maxX) / 2;
      const z = alongX ? (minZ + maxZ) / 2 : minZ + t;
      worldPlane(paving, lineMaterial, alongX ? x : x - 0.08, alongX ? x + 3.5 : x + 0.08, alongX ? z - 0.08 : z, alongX ? z + 0.08 : z + 3.5, -0.02);
    }
  }
  for (const location of LOCATIONS) {
    const [minX, maxX, minZ, maxZ] = location.pad;
    worldPlane(paving, road, minX, maxX, minZ, maxZ, -0.035);
  }
  mergeStatic(paving);

  const boxes = [];
  const circles = [];
  const clones = [];
  for (const location of LOCATIONS) {
    const place = environments[location.key].clone(true);
    place.visible = true;
    // The fences only exist to mark the edge of a level; here you drive in and out freely.
    const fences = [];
    place.traverse((child) => { if (child.name === 'boundary') fences.push(child); });
    for (const fence of fences) fence.removeFromParent();
    place.position.set(location.x, 0, location.z);
    place.rotation.y = location.turn;
    group.add(place);
    clones.push(place);
  }
  group.updateMatrixWorld(true);

  // Anything standing on the ground and taller than a curb is solid.
  const bounds = new THREE.Box3();
  for (const place of clones) {
    place.traverse((mesh) => {
      if (!mesh.isMesh) return;
      bounds.setFromObject(mesh);
      if (bounds.min.y > 0.8 || bounds.max.y < 1.1) return;
      boxes.push({ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z });
    });
  }
  // The roundabout's round centre island.
  const roundabout = clones[LOCATIONS.findIndex((location) => location.key === 'roundabout')];
  const islandCenter = roundabout.localToWorld(new THREE.Vector3(5, 0, 4));
  circles.push({ x: islandCenter.x, z: islandCenter.z, r: 7.05 });
  for (const place of clones) mergeStatic(place);

  // Trees scattered over the grass, away from roads and locations.
  const paved = [...ROADS, ...LOCATIONS.map((location) => location.pad)];
  const onPaved = (x, z, margin) => paved.some(([minX, maxX, minZ, maxZ]) => x > minX - margin && x < maxX + margin && z > minZ - margin && z < maxZ + margin);
  const nearSolid = (x, z) => boxes.some((b) => x > b.minX - 3 && x < b.maxX + 3 && z > b.minZ - 3 && z < b.maxZ + 3);
  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.35, 3.6, 7);
  const crownGeometry = new THREE.SphereGeometry(1, 10, 7);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#5b4937', roughness: 1 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: '#4a743f', roughness: 1 });
  const treeSpots = [];
  for (let tries = 0; tries < 2000 && treeSpots.length < 170; tries++) {
    const x = BOUNDS.minX - 40 + random() * (BOUNDS.maxX - BOUNDS.minX + 80);
    const z = BOUNDS.minZ - 40 + random() * (BOUNDS.maxZ - BOUNDS.minZ + 80);
    if (onPaved(x, z, 4) || nearSolid(x + OFFSET_X, z)) continue;
    treeSpots.push([x, z, 0.7 + random() * 0.7]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, treeSpots.length);
  const dummy = new THREE.Object3D();
  treeSpots.forEach(([x, z, scale], index) => {
    dummy.position.set(x, 1.8 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 4.6 * scale;
    dummy.scale.set(2.5 * scale, 3.1 * scale, 2.4 * scale);
    dummy.updateMatrix();
    crowns.setMatrixAt(index, dummy.matrix);
    circles.push({ x: x + OFFSET_X, z, r: 0.4 * scale });
  });
  for (const mesh of [trunks, crowns]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  // How deep the vehicle would sink into something solid at this spot.
  // The Volvo is checked as three circles along its length, the bobby car as one.
  function penetration(x, z, heading, small) {
    const along = small ? [[0, 0.75]] : [[-1.9, 1.1], [0, 1.2], [1.9, 1.1]];
    let deepest = 0;
    const localX = x - OFFSET_X;
    deepest = Math.max(deepest, BOUNDS.minX - localX, localX - BOUNDS.maxX, BOUNDS.minZ - z, z - BOUNDS.maxZ);
    for (const [offset, radius] of along) {
      const cx = x + Math.sin(heading) * offset;
      const cz = z + Math.cos(heading) * offset;
      for (const b of boxes) {
        if (cx < b.minX - radius || cx > b.maxX + radius || cz < b.minZ - radius || cz > b.maxZ + radius) continue;
        const dx = cx - THREE.MathUtils.clamp(cx, b.minX, b.maxX);
        const dz = cz - THREE.MathUtils.clamp(cz, b.minZ, b.maxZ);
        deepest = Math.max(deepest, radius - Math.hypot(dx, dz));
      }
      for (const c of circles) {
        const reach = radius + c.r;
        const dx = cx - c.x;
        const dz = cz - c.z;
        if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
        deepest = Math.max(deepest, reach - Math.hypot(dx, dz));
      }
    }
    return deepest;
  }

  return {
    group,
    spawn: { x: OFFSET_X + 5, z: 38, heading: Math.PI },
    // Moving is blocked when it would push further into something; backing out of it is always allowed.
    blocks(fromX, fromZ, toX, toZ, heading, small) {
      const next = penetration(toX, toZ, heading, small);
      return next > 0 && next >= penetration(fromX, fromZ, heading, small) - 1e-4;
    },
  };
}
