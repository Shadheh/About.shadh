import * as THREE from 'three';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Page interactions
$('#year').textContent = new Date().getFullYear();
const progressBar = $('#progressBar');
function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const menuToggle = $('#menuToggle');
const mobileNav = $('#mobileNav');
function closeMenu() {
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  mobileNav.classList.remove('open');
}
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.classList.toggle('active', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  mobileNav.classList.toggle('open', isOpen);
});
$$('#mobileNav a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 620) closeMenu(); });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.13, rootMargin: '0px 0px -25px 0px' });
$$('.reveal').forEach(el => revealObserver.observe(el));

const projectInfo = {
  study: {
    kicker: 'PRODUCTIVITY · CONCEPT',
    title: 'Study Companion',
    text: 'A calm, student-friendly space for daily tasks, notes, reminders, and study sessions. The idea is to make planning feel lighter: a clear view of today, a little progress feedback, and tools that stay out of the way.',
    tags: ['Focus', 'Notes', 'Task planning', 'Student workflow']
  },
  personal: {
    kicker: 'WEB · VISUAL DESIGN',
    title: 'Personal Web Universe',
    text: 'A personal website that feels more like a small digital world than a conventional résumé. This page is an exploration of that direction: atmospheric visuals, clear writing, restrained motion, and a story that unfolds as you scroll.',
    tags: ['3D web', 'Interaction', 'Visual storytelling', 'Responsive design']
  },
  workflow: {
    kicker: 'WORKFLOW · EXPERIMENT',
    title: 'Everyday Tech Setup',
    text: 'A collection of ideas for making a student laptop feel like a welcoming daily workspace — a focused browser setup, useful shortcuts, small automations, and thoughtful visual details without unnecessary clutter.',
    tags: ['Personal computing', 'Productivity', 'Customization', 'Workflow']
  }
};
const projectModal = $('#projectModal');
$$('[data-project]').forEach(card => card.addEventListener('click', () => {
  const data = projectInfo[card.dataset.project];
  if (!data) return;
  $('#modalKicker').textContent = data.kicker;
  $('#modalTitle').textContent = data.title;
  $('#modalText').textContent = data.text;
  $('#modalTags').replaceChildren(...data.tags.map(tag => {
    const span = document.createElement('span'); span.textContent = tag; return span;
  }));
  projectModal.showModal();
  document.body.classList.add('modal-open');
}));
projectModal.addEventListener('close', () => document.body.classList.remove('modal-open'));
projectModal.addEventListener('click', event => {
  const rect = projectModal.getBoundingClientRect();
  const inside = rect.top <= event.clientY && event.clientY <= rect.bottom && rect.left <= event.clientX && event.clientX <= rect.right;
  if (!inside) projectModal.close();
});

const loader = $('#loader');
const loaderBar = $('#loaderBar');
let loadValue = 12;
const loadInterval = window.setInterval(() => {
  loadValue = Math.min(90, loadValue + (90 - loadValue) * 0.08 + 1.1);
  loaderBar.style.width = `${loadValue}%`;
}, 80);

// Three.js scene. The character is made from original primitive geometry; no reference-site assets are reused.
const canvas = $('#scene');
let renderer, scene, camera, avatar, headGroup, eyePupils = [], stars, orbitRing, glowOrb;
let targetPointerX = 0, targetPointerY = 0, pointerX = 0, pointerY = 0;
let scrollT = 0, smoothScrollT = 0, clock;
let sceneReady = false;

const material = (color, roughness = 0.48, metalness = 0.12, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
function addMesh(parent, geometry, mat, position, scale, name) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}
function makeCapsuleBetween(parent, start, end, radius, mat, radialSegments = 10) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  addMesh(parent, new THREE.SphereGeometry(radius, radialSegments, 8), mat, start, null);
  addMesh(parent, new THREE.SphereGeometry(radius, radialSegments, 8), mat, end, null);
  return mesh;
}
function buildAvatar() {
  const group = new THREE.Group();
  group.position.set(2.1, -0.35, 0.05);
  group.scale.setScalar(1.04);
  scene.add(group);
  const jacket = material('#29485e', 0.36, 0.32);
  const jacketLight = material('#527c91', 0.4, 0.25);
  const trousers = material('#142536', 0.62, 0.08);
  const skin = material('#d4aa91', 0.72, 0.02);
  const hair = material('#111b28', 0.75, 0.02);
  const sole = material('#07101a', 0.8, 0.02);
  const seam = material('#90d9d7', 0.36, 0.34, { emissive: '#1a696d', emissiveIntensity: 0.35 });
  const headMat = material('#dcb49c', 0.65, 0.02);

  // legs and simple sneakers
  makeCapsuleBetween(group, [-0.19, -0.76, 0.02], [-0.24, -1.48, 0.02], 0.115, trousers, 12);
  makeCapsuleBetween(group, [0.19, -0.76, 0.02], [0.24, -1.48, 0.02], 0.115, trousers, 12);
  addMesh(group, new THREE.BoxGeometry(0.26, 0.12, 0.37), sole, [-0.25, -1.55, 0.09], null).rotation.z = -0.04;
  addMesh(group, new THREE.BoxGeometry(0.26, 0.12, 0.37), sole, [0.25, -1.55, 0.09], null).rotation.z = 0.04;

  // torso: rounded body plus a subtle jacket panel
  addMesh(group, new THREE.CapsuleGeometry(0.36, 0.57, 5, 12), jacket, [0, -0.2, 0], [1.03, 1.04, 0.88]);
  addMesh(group, new THREE.BoxGeometry(0.055, 0.64, 0.025), seam, [0, -0.24, 0.318], null);
  addMesh(group, new THREE.BoxGeometry(0.21, 0.1, 0.035), jacketLight, [0.18, -0.28, 0.31], null);
  addMesh(group, new THREE.BoxGeometry(0.12, 0.09, 0.04), jacketLight, [-0.16, -0.4, 0.31], null);

  // arms, hands
  makeCapsuleBetween(group, [-0.34, -0.02, 0.0], [-0.51, -0.62, 0.04], 0.105, jacketLight, 10);
  makeCapsuleBetween(group, [0.34, -0.02, 0.0], [0.48, -0.6, 0.08], 0.105, jacketLight, 10);
  addMesh(group, new THREE.SphereGeometry(0.095, 12, 10), skin, [-0.51, -0.68, 0.05], [0.85, 1.1, 0.85]);
  addMesh(group, new THREE.SphereGeometry(0.095, 12, 10), skin, [0.48, -0.66, 0.09], [0.85, 1.1, 0.85]);

  // neck and head with a cursor-responsive gaze
  addMesh(group, new THREE.CylinderGeometry(0.11, 0.12, 0.18, 12), skin, [0, 0.28, 0]);
  headGroup = new THREE.Group();
  headGroup.position.set(0, 0.63, 0.025);
  group.add(headGroup);
  addMesh(headGroup, new THREE.SphereGeometry(0.29, 22, 16), headMat, [0, 0, 0], [0.9, 1.05, 0.84]);
  // Hair cap and side locks create a simple, original stylised silhouette.
  addMesh(headGroup, new THREE.SphereGeometry(0.295, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.49), hair, [0, 0.095, -0.018], [1.02, 1.03, 0.95]);
  addMesh(headGroup, new THREE.SphereGeometry(0.11, 12, 10), hair, [-0.22, 0.02, 0.02], [0.7, 1.15, 0.86]);
  addMesh(headGroup, new THREE.SphereGeometry(0.11, 12, 10), hair, [0.22, 0.02, 0.02], [0.7, 1.15, 0.86]);
  const eyeWhite = material('#f4f2e9', 0.3, 0.02);
  const pupilMat = material('#182535', 0.28, 0.06);
  for (const x of [-0.09, 0.09]) {
    addMesh(headGroup, new THREE.SphereGeometry(0.035, 10, 8), eyeWhite, [x, -0.015, 0.237], [1, 0.8, 0.45]);
    const pupil = addMesh(headGroup, new THREE.SphereGeometry(0.018, 10, 8), pupilMat, [x, -0.015, 0.254], [0.8, 1, 0.45]);
    eyePupils.push(pupil);
  }
  addMesh(headGroup, new THREE.SphereGeometry(0.026, 8, 6), skin, [0, -0.09, 0.248], [0.72, 1.25, 0.62]);
  addMesh(headGroup, new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI, 0, Math.PI), material('#9f5e61', 0.7, 0.01), [0, -0.16, 0.21], [1, 0.26, 0.3]);
  // Tiny reflective pin on the jacket.
  addMesh(group, new THREE.SphereGeometry(0.045, 10, 8), seam, [-0.22, -0.12, 0.33], [1, 1, 0.35]);

  avatar = group;
  return group;
}
function addStarField() {
  const count = 700;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 25;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = -2 - Math.random() * 14;
    sizes[i] = 0.4 + Math.random() * 1.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const pointsMaterial = new THREE.PointsMaterial({ color: '#8fbdd9', size: 0.022, transparent: true, opacity: 0.72, sizeAttenuation: true, depthWrite: false });
  stars = new THREE.Points(geometry, pointsMaterial);
  scene.add(stars);
}
function addSceneObjects() {
  // Floating orbital rings and a soft light source behind the avatar.
  orbitRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: '#70d9d3', transparent: true, opacity: 0.62 }));
  orbitRing.position.set(2.1, -0.35, -0.25);
  orbitRing.rotation.set(0.9, 0.25, -0.35);
  scene.add(orbitRing);
  const secondRing = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.006, 6, 120), new THREE.MeshBasicMaterial({ color: '#8999e7', transparent: true, opacity: 0.33 }));
  secondRing.position.set(2.1, -0.35, -0.35);
  secondRing.rotation.set(1.18, 0.25, 0.18);
  scene.add(secondRing);
  const orbGeo = new THREE.SphereGeometry(0.75, 24, 16);
  const orbMat = new THREE.MeshBasicMaterial({ color: '#2a91a8', transparent: true, opacity: 0.07, depthWrite: false });
  glowOrb = new THREE.Mesh(orbGeo, orbMat);
  glowOrb.position.set(2.1, -0.2, -1.25);
  scene.add(glowOrb);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 1.0, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#102638', metalness: 0.55, roughness: 0.36, emissive: '#07303b', emissiveIntensity: 0.3 }));
  pedestal.position.set(2.1, -1.67, 0.05);
  scene.add(pedestal);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.89, 0.012, 8, 90), new THREE.MeshBasicMaterial({ color: '#75dcd5', transparent: true, opacity: 0.8 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(2.1, -1.6, 0.05);
  scene.add(rim);

  // Technical-looking floating glass panels. They remain decorative and behind the text.
  const panelMat = new THREE.MeshPhysicalMaterial({ color: '#254559', roughness: 0.26, metalness: 0.35, transparent: true, opacity: 0.25, transmission: 0.12, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: '#83d9d8', transparent: true, opacity: 0.36 });
  const panels = [
    { x: 3.65, y: 0.8, z: -1.0, w: 0.72, h: 1.02, r: 0.16 },
    { x: 0.2, y: 0.55, z: -1.6, w: 0.55, h: 0.82, r: -0.22 },
    { x: 3.0, y: -0.05, z: 1.0, w: 0.42, h: 0.68, r: -0.17 }
  ];
  panels.forEach(({ x, y, z, w, h, r }, i) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const panel = new THREE.Mesh(geo, panelMat);
    panel.position.set(x, y, z); panel.rotation.z = r; panel.userData.baseY = y; panel.userData.phase = i * 1.7;
    scene.add(panel);
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    edge.position.copy(panel.position); edge.rotation.copy(panel.rotation); edge.userData.baseY = y; edge.userData.phase = i * 1.7;
    scene.add(edge);
  });
}
function initScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#080d16', 0.025);
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.9, 8.7);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  scene.add(new THREE.HemisphereLight('#c3e5ff', '#101b2b', 1.35));
  const keyLight = new THREE.DirectionalLight('#c5e7ff', 2.8); keyLight.position.set(-3, 4, 6); scene.add(keyLight);
  const rimLight = new THREE.PointLight('#55d8ce', 30, 10); rimLight.position.set(3, 1.3, 2.5); scene.add(rimLight);
  const fillLight = new THREE.PointLight('#8d8dff', 20, 11); fillLight.position.set(-2, 1.0, -1); scene.add(fillLight);
  addStarField();
  buildAvatar();
  addSceneObjects();
  clock = new THREE.Clock();
  sceneReady = true;
  loaderBar.style.width = '100%';
  window.clearInterval(loadInterval);
  window.setTimeout(() => loader.classList.add('loaded'), 280);
  animate();
}
function sectionScrollPosition() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollT = Math.min(1, Math.max(0, window.scrollY / maxScroll));
}
function animate() {
  if (!sceneReady) return;
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  sectionScrollPosition();
  smoothScrollT += (scrollT - smoothScrollT) * 0.035;
  pointerX += (targetPointerX - pointerX) * 0.035;
  pointerY += (targetPointerY - pointerY) * 0.035;
  const isMobile = window.innerWidth < 620;
  const scroll = smoothScrollT;
  if (avatar) {
    avatar.rotation.y = Math.sin(t * 0.33) * 0.13 + pointerX * 0.13;
    avatar.position.y = -0.35 + Math.sin(t * 0.78) * 0.04;
    avatar.position.x = (isMobile ? 1.0 : 2.1) + Math.sin(scroll * Math.PI * 2) * 0.26;
    avatar.scale.setScalar((isMobile ? 0.78 : 1.04) * (1 + scroll * 0.06));
  }
  if (headGroup) {
    headGroup.rotation.y = pointerX * 0.15;
    headGroup.rotation.x = -pointerY * 0.08;
  }
  eyePupils.forEach((pupil, i) => {
    pupil.position.x = (i === 0 ? -0.09 : 0.09) + pointerX * 0.007;
    pupil.position.y = -0.015 - pointerY * 0.005;
  });
  if (orbitRing) { orbitRing.rotation.z += 0.0009; orbitRing.rotation.x = 0.9 + Math.sin(t * 0.24) * 0.06; orbitRing.material.opacity = 0.4 + (1 - scroll) * 0.22; }
  if (glowOrb) { glowOrb.scale.setScalar(1 + Math.sin(t * 0.55) * 0.07); glowOrb.material.opacity = 0.06 + (1 - scroll) * 0.02; }
  if (stars) { stars.rotation.y = t * 0.006 + scroll * 0.13; stars.rotation.x = Math.sin(t * 0.07) * 0.02; }
  scene.children.forEach(object => {
    if (object.userData && object.userData.baseY !== undefined) object.position.y = object.userData.baseY + Math.sin(t * 0.65 + object.userData.phase) * 0.07;
  });
  const baseCamX = isMobile ? 0 : 0.05;
  camera.position.x += ((baseCamX + Math.sin(scroll * Math.PI * 2.0) * (isMobile ? 0.18 : 0.9) + pointerX * 0.28) - camera.position.x) * 0.025;
  camera.position.y += ((0.7 + Math.cos(scroll * Math.PI * 1.6) * 0.22 - pointerY * 0.14) - camera.position.y) * 0.025;
  camera.position.z += ((8.7 - Math.sin(scroll * Math.PI) * 0.75) - camera.position.z) * 0.025;
  const lookX = (isMobile ? 0.25 : 0.55) + Math.sin(scroll * Math.PI * 2.0) * 0.25;
  camera.lookAt(lookX, -0.18 + Math.cos(scroll * Math.PI) * 0.12, 0);
  renderer.render(scene, camera);
}
window.addEventListener('pointermove', event => {
  targetPointerX = (event.clientX / window.innerWidth - 0.5) * 2;
  targetPointerY = (event.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });
window.addEventListener('deviceorientation', event => {
  if (typeof event.gamma === 'number' && typeof event.beta === 'number') {
    targetPointerX = THREE.MathUtils.clamp(event.gamma / 45, -1, 1);
    targetPointerY = THREE.MathUtils.clamp((event.beta - 45) / 75, -1, 1);
  }
}, { passive: true });
window.addEventListener('resize', () => {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

try {
  initScene();
} catch (error) {
  console.error('3D scene could not be initialized; the page content remains available.', error);
  window.clearInterval(loadInterval);
  loader.classList.add('loaded');
}
