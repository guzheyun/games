import * as THREE from './three.module.js';

const ROOT2 = Math.SQRT2;
const HALF_STEP = ROOT2 / 2;
const DEPTH = 1;
const MAX_PIECES = 48;
const JOIN_DISTANCE = .72;
const FLOOR_Y = -DEPTH / 2 - .045;
const HOVER_CLEARANCE = .14;
const RENDER_SCALE = .8;
const SAVE_KEY = 'magic-ruler-workshop-v7';
const GUN_TEMPLATE_TURNS = [0, 0, 0, 0, -1, 0, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1, 0, 2, 0, 1, 0, 0, -1];

const palettes = {
  classic: { name: '经典绿白', colors: ['#72e21d', '#f4f5f0'] },
  rainbow: { name: '彩虹', colors: ['#ff5b22', '#ef174d', '#ffd900', '#39d927', '#08c6df', '#0868b9', '#7d3fc0'] },
  coral: { name: '珊瑚', colors: ['#ef6a5b', '#ffc9a4'] },
  ocean: { name: '海洋', colors: ['#397ebc', '#a9dbe5'] },
  lime: { name: '青柠', colors: ['#709d56', '#dce99d'] },
  plum: { name: '梅子', colors: ['#825a91', '#dfbdd8'] },
  mono: { name: '黑白', colors: ['#3e4148', '#d8d3c9'] }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clone = value => JSON.parse(JSON.stringify(value));

let state = {
  rulers: [], selectedId: null, nextId: 1, palette: 'classic', joins: 0, mode: 'twist'
};
let undoStack = [];
let redoStack = [];
let interaction = null;
let selectedPiece = null;
let joinCandidate = null;
let toastTimer = null;
let saveTimer = null;

const canvas = $('#threeCanvas');
const workspace = $('#workspace');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  precision: 'mediump'
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.setClearColor(0xf2ece3, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2ece3);
const camera = new THREE.PerspectiveCamera(40, 1, .1, 250);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x9a806e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(-6, 12, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xd7efff, 1.1);
fillLight.position.set(7, 5, -8);
scene.add(fillLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshLambertMaterial({ color: 0xeee7dc })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y;
scene.add(floor);
const grid = new THREE.GridHelper(160, 80, 0xcfc3b5, 0xded5c9);
grid.position.y = floor.position.y + .006;
grid.material.opacity = .28;
grid.material.transparent = true;
scene.add(grid);

const rulersRoot = new THREE.Group();
scene.add(rulersRoot);
let interactiveObjects = [];
const pieceGroups = new Map();
const pieceVisuals = new Map();
const endpointMarkers = new Map();
let joinRing = null;
let lowDetailInteraction = false;

const view = { target: new THREE.Vector3(), azimuth: -.62, elevation: .96, distance: 18 };
let renderPending = false;

function createPieces(pieceCount, palette, zOffset = 0) {
  const totalLength = (pieceCount + 1) * HALF_STEP;
  const startX = -totalLength / 2;
  const colors = palettes[palette]?.colors || palettes.classic.colors;
  return Array.from({ length: pieceCount }, (_, index) => {
    const matrix = new THREE.Matrix4().makeTranslation(startX + index * HALF_STEP, 0, zOffset - ROOT2 / 4);
    return {
      matrix: matrix.toArray(),
      type: index % 2,
      forward: true,
      palette,
      colorIndex: index % colors.length
    };
  });
}

function rulerPieceCount(ruler) {
  return ruler.pieces.length;
}

function selected() {
  return state.rulers.find(ruler => ruler.id === state.selectedId) || null;
}

function endpoint(ruler, end) {
  const piece = end === 'start' ? ruler.pieces[0] : ruler.pieces.at(-1);
  if (!piece) return new THREE.Vector3();
  const forwardEnd = end === 'end' ? piece.forward !== false : piece.forward === false;
  const local = forwardEnd
    ? new THREE.Vector3(3 * ROOT2 / 4, 0, ROOT2 / 4)
    : new THREE.Vector3(ROOT2 / 4, 0, ROOT2 / 4);
  return local.applyMatrix4(new THREE.Matrix4().fromArray(piece.matrix));
}

function pieceMatrix(piece) {
  return new THREE.Matrix4().fromArray(piece.matrix);
}

function makePrismGeometry(type) {
  const shape = new THREE.Shape();
  if (type === 0) {
    shape.moveTo(0, 0);
    shape.lineTo(ROOT2, 0);
    shape.lineTo(ROOT2 / 2, ROOT2 / 2);
  } else {
    shape.moveTo(0, ROOT2 / 2);
    shape.lineTo(ROOT2, ROOT2 / 2);
    shape.lineTo(ROOT2 / 2, 0);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: .025,
    bevelThickness: .025
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, DEPTH / 2, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

const prismGeometries = [makePrismGeometry(0), makePrismGeometry(1)];
const edgeGeometries = prismGeometries.map(geometry => new THREE.EdgesGeometry(geometry, 25));
const materialCache = new Map();
const edgeMaterials = {
  normal: new THREE.LineBasicMaterial({ color: 0x596257, transparent: true, opacity: .5 }),
  active: new THREE.LineBasicMaterial({ color: 0xe75e4c, transparent: true, opacity: .95 })
};
const endpointMaterials = {
  start: new THREE.MeshLambertMaterial({ color: 0x5b9b8a, emissive: 0x173b32, emissiveIntensity: .35 }),
  end: new THREE.MeshLambertMaterial({ color: 0xea6657, emissive: 0x4a1713, emissiveIntensity: .35 })
};
const endpointGeometry = new THREE.SphereGeometry(.13, 18, 12);

function pieceMaterials(color, active = false) {
  const key = `${color}-${active}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const topColor = new THREE.Color(color);
  const sideColor = topColor.clone().multiplyScalar(color.toLowerCase() === '#f4f5f0' ? .84 : .68);
  const cap = new THREE.MeshLambertMaterial({
    color: topColor,
    emissive: active ? 0x4a2715 : 0x000000,
    emissiveIntensity: active ? .28 : 0
  });
  const side = new THREE.MeshLambertMaterial({ color: sideColor });
  const result = [cap, side];
  materialCache.set(key, result);
  return result;
}

function colorFor(piece) {
  const colors = palettes[piece.palette]?.colors || palettes.classic.colors;
  return colors[piece.colorIndex % colors.length];
}

function clearRulersRoot() {
  while (rulersRoot.children.length) rulersRoot.remove(rulersRoot.children[0]);
  interactiveObjects = [];
  pieceGroups.clear();
  pieceVisuals.clear();
  endpointMarkers.clear();
}

function refreshPieceSelection() {
  pieceVisuals.forEach(({ mesh, edge, rulerId, pieceIndex }) => {
    const ruler = state.rulers.find(item => item.id === rulerId);
    const piece = ruler?.pieces[pieceIndex];
    if (!piece) return;
    const active = selectedPiece?.rulerId === rulerId && selectedPiece?.pieceIndex === pieceIndex;
    mesh.material = pieceMaterials(colorFor(piece), active);
    edge.material = active ? edgeMaterials.active : edgeMaterials.normal;
  });
  requestRender();
}

function setLowDetailInteraction(active) {
  if (lowDetailInteraction === active) return;
  lowDetailInteraction = active;
  pieceVisuals.forEach(({ edge }) => { edge.visible = !active; });
  requestRender();
}

function updateJoinIndicator() {
  const target = joinCandidate && state.rulers.find(ruler => ruler.id === joinCandidate.targetId);
  if (!target) {
    if (joinRing?.parent) joinRing.parent.remove(joinRing);
    return;
  }
  if (!joinRing) {
    joinRing = new THREE.Mesh(
      new THREE.TorusGeometry(.2, .035, 10, 30),
      new THREE.MeshBasicMaterial({ color: 0x42aa8e, depthTest: false })
    );
    joinRing.renderOrder = 10;
  }
  joinRing.position.copy(endpoint(target, joinCandidate.targetEnd));
  joinRing.quaternion.copy(camera.quaternion);
  if (joinRing.parent !== rulersRoot) rulersRoot.add(joinRing);
}

function syncRulerVisual(ruler) {
  ruler.pieces.forEach((piece, pieceIndex) => {
    const group = pieceGroups.get(`${ruler.id}:${pieceIndex}`);
    if (group) {
      group.matrix.copy(pieceMatrix(piece));
      group.matrixWorldNeedsUpdate = true;
    }
  });
  ['start', 'end'].forEach(end => {
    endpointMarkers.get(`${ruler.id}:${end}`)?.position.copy(endpoint(ruler, end));
  });
  requestRender();
}

function buildScene(save = true) {
  clearRulersRoot();
  state.rulers.forEach(ruler => {
    ruler.pieces.forEach((piece, pieceIndex) => {
      const pieceGroup = new THREE.Group();
      pieceGroup.matrixAutoUpdate = false;
      pieceGroup.matrix.copy(pieceMatrix(piece));
      pieceGroups.set(`${ruler.id}:${pieceIndex}`, pieceGroup);
      const active = selectedPiece && selectedPiece.rulerId === ruler.id && selectedPiece.pieceIndex === pieceIndex;
      const mesh = new THREE.Mesh(prismGeometries[piece.type], pieceMaterials(colorFor(piece), active));
      mesh.userData = { type: 'piece', rulerId: ruler.id, pieceIndex, pieceNumber: pieceIndex + 1 };
      pieceGroup.add(mesh);
      interactiveObjects.push(mesh);
      const edge = new THREE.LineSegments(
        edgeGeometries[piece.type],
        active ? edgeMaterials.active : edgeMaterials.normal
      );
      edge.renderOrder = 3;
      pieceGroup.add(edge);
      pieceVisuals.set(`${ruler.id}:${pieceIndex}`, { mesh, edge, rulerId: ruler.id, pieceIndex });
      rulersRoot.add(pieceGroup);
    });

    if (ruler.id === state.selectedId) {
      ['start', 'end'].forEach(end => {
        const marker = new THREE.Mesh(endpointGeometry, endpointMaterials[end]);
        marker.position.copy(endpoint(ruler, end));
        marker.userData = { type: 'endpoint', rulerId: ruler.id, end };
        rulersRoot.add(marker);
        endpointMarkers.set(`${ruler.id}:${end}`, marker);
        interactiveObjects.push(marker);
      });
    }
  });

  updateJoinIndicator();
  updatePanels();
  if (save) scheduleSave();
  requestRender();
}

function updateCamera() {
  const horizontal = Math.cos(view.elevation) * view.distance;
  camera.position.set(
    view.target.x + Math.sin(view.azimuth) * horizontal,
    view.target.y + Math.sin(view.elevation) * view.distance,
    view.target.z + Math.cos(view.azimuth) * horizontal
  );
  camera.lookAt(view.target);
}

function resize() {
  const rect = workspace.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setSize(Math.max(1, Math.round(width * RENDER_SCALE)), Math.max(1, Math.round(height * RENDER_SCALE)), false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  requestRender();
}

function requestRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(renderFrame);
}

function renderFrame() {
  renderPending = false;
  updateCamera();
  if (joinRing?.parent) joinRing.quaternion.copy(camera.quaternion);
  renderer.render(scene, camera);
}

function checkpoint(snapshot = clone(state)) {
  undoStack.push(snapshot);
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(clone(state));
  state = undoStack.pop();
  selectedPiece = null;
  joinCandidate = null;
  buildScene();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(clone(state));
  state = redoStack.pop();
  selectedPiece = null;
  joinCandidate = null;
  buildScene();
}

function addRuler() {
  checkpoint();
  const id = state.nextId++;
  const offset = state.rulers.length ? (Math.ceil(state.rulers.length / 2) * 1.55) * (state.rulers.length % 2 ? 1 : -1) : 0;
  const ruler = { id, name: `魔尺${id}`, palette: state.palette, pieces: createPieces(24, state.palette, offset) };
  keepRulerFloating(ruler);
  state.rulers.push(ruler);
  state.selectedId = id;
  selectedPiece = null;
  buildScene();
  fitView();
  showToast('新魔尺已放到工作台');
}

function applyGunTemplate() {
  checkpoint();
  let ruler = selected();
  if (!ruler) {
    const id = state.nextId++;
    ruler = { id, name: `魔尺${id}`, palette: state.palette, pieces: [] };
    state.rulers.push(ruler);
    state.selectedId = id;
  }
  ruler.pieces = createPieces(24, ruler.palette);
  GUN_TEMPLATE_TURNS.forEach((turn, pieceIndex) => {
    if (!turn) return;
    applyFoldAngle({ rulerId: ruler.id, pieceIndex, pieceNumber: pieceIndex + 1, side: 'after' }, turn * Math.PI / 2);
  });
  const center = ruler.pieces.reduce((sum, piece) => sum.add(pieceCenter(piece)), new THREE.Vector3()).multiplyScalar(1 / ruler.pieces.length);
  const faceForward = new THREE.Matrix4().set(
    -.96731592, .24546712, -.06360664, 0,
    -.18751899, -.52360909, .83106567, 0,
    .17069428, .81583051, .55252516, 0,
    0, 0, 0, 1
  ).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  ruler.pieces.forEach(piece => { piece.matrix = faceForward.clone().multiply(pieceMatrix(piece)).toArray(); });
  keepRulerFloating(ruler);
  selectedPiece = null;
  view.azimuth = 0;
  view.elevation = .12;
  buildScene();
  fitView();
  showToast('枪模板已应用，可继续用 A / D 调整');
}

function adjacentPiece(neighbor, direction, palette) {
  const matrix = pieceMatrix(neighbor);
  const traversal = neighbor.forward === false ? -1 : 1;
  matrix.multiply(new THREE.Matrix4().makeTranslation(direction * traversal * HALF_STEP, 0, 0));
  const colors = palettes[palette]?.colors || palettes.classic.colors;
  const samePalette = neighbor.palette === palette;
  return {
    matrix: matrix.toArray(),
    type: 1 - neighbor.type,
    forward: neighbor.forward !== false,
    palette,
    colorIndex: samePalette ? (neighbor.colorIndex + direction + colors.length) % colors.length : 0
  };
}

function changePieces(end, delta) {
  const ruler = selected();
  if (!ruler) return;
  const count = rulerPieceCount(ruler);
  if (delta < 0 && count <= 1) return showToast('至少保留 1 阶');
  if (delta > 0 && count >= MAX_PIECES) return showToast(`每条魔尺最多 ${MAX_PIECES} 阶`);
  checkpoint();
  if (end === 'start' && delta < 0) {
    ruler.pieces.shift();
  } else if (end === 'end' && delta < 0) {
    ruler.pieces.pop();
  } else if (end === 'start' && delta > 0) {
    ruler.pieces.unshift(adjacentPiece(ruler.pieces[0], -1, ruler.palette));
  } else if (end === 'end' && delta > 0) {
    ruler.pieces.push(adjacentPiece(ruler.pieces.at(-1), 1, ruler.palette));
  }
  selectedPiece = null;
  keepRulerFloating(ruler);
  buildScene();
}

function deleteSelected() {
  if (!selected()) return;
  checkpoint();
  state.rulers = state.rulers.filter(ruler => ruler.id !== state.selectedId);
  state.selectedId = state.rulers.at(-1)?.id || null;
  selectedPiece = null;
  buildScene();
  showToast('魔尺已删除');
}

function foldFrame(data) {
  const ruler = state.rulers.find(item => item.id === data.rulerId);
  if (!ruler || ruler.pieces.length < 2) return null;
  const selectedIndex = Math.max(0, Math.min(data.pieceIndex, ruler.pieces.length - 1));
  const rotateAfter = data.side ? data.side === 'after' : selectedIndex < ruler.pieces.length - 1;
  if ((rotateAfter && selectedIndex >= ruler.pieces.length - 1) || (!rotateAfter && selectedIndex <= 0)) return null;
  const pivotIndex = rotateAfter ? selectedIndex : selectedIndex - 1;
  const probeIndex = rotateAfter ? selectedIndex + 1 : selectedIndex - 1;
  const affectedIndices = rotateAfter
    ? Array.from({ length: ruler.pieces.length - selectedIndex - 1 }, (_, index) => selectedIndex + index + 1)
    : Array.from({ length: selectedIndex }, (_, index) => index);
  const pivotPiece = ruler.pieces[pivotIndex];
  const pivotMatrix = pieceMatrix(pivotPiece);
  const forward = pivotPiece.forward !== false;
  const localAxis = new THREE.Vector3(
    forward ? ROOT2 / 2 : -ROOT2 / 2,
    0,
    pivotPiece.type === 0 ? ROOT2 / 2 : -ROOT2 / 2
  ).normalize();
  const localPivot = new THREE.Vector3(
    forward ? 3 * ROOT2 / 4 : ROOT2 / 4,
    0,
    ROOT2 / 4
  );
  return {
    pivot: localPivot.applyMatrix4(pivotMatrix),
    axis: localAxis.transformDirection(pivotMatrix),
    ruler,
    selectedIndex,
    probeIndex,
    affectedIndices
  };
}

function pieceCenter(piece) {
  return prismGeometries[piece.type].boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(pieceMatrix(piece));
}

function focusSelectedPiece() {
  if (!selectedPiece) return;
  const ruler = state.rulers.find(item => item.id === selectedPiece.rulerId);
  const piece = ruler?.pieces[selectedPiece.pieceIndex];
  if (!piece) return;
  view.target.copy(pieceCenter(piece));
  requestRender();
}

function applyFoldAngle(data, angle, originalMatrices) {
  const ruler = state.rulers.find(item => item.id === data.rulerId);
  if (!ruler) return;
  if (originalMatrices) {
    ruler.pieces.forEach((piece, index) => { piece.matrix = clone(originalMatrices[index]); });
  }
  const frame = foldFrame(data);
  if (!frame) return;
  const worldRotation = new THREE.Matrix4()
    .makeTranslation(frame.pivot.x, frame.pivot.y, frame.pivot.z)
    .multiply(new THREE.Matrix4().makeRotationAxis(frame.axis, angle))
    .multiply(new THREE.Matrix4().makeTranslation(-frame.pivot.x, -frame.pivot.y, -frame.pivot.z));
  frame.affectedIndices.forEach(index => {
    ruler.pieces[index].matrix = worldRotation.clone().multiply(pieceMatrix(ruler.pieces[index])).toArray();
  });
  keepRulerFloating(ruler);
  selectedPiece = data;
  state.selectedId = ruler.id;
  focusSelectedPiece();
  return frame.selectedIndex;
}

function projectedPoint(point) {
  const rect = canvas.getBoundingClientRect();
  const projected = point.clone().project(camera);
  return new THREE.Vector2(
    (projected.x + 1) * rect.width / 2,
    (1 - projected.y) * rect.height / 2
  );
}

function foldScreenDirection(data, hitPoint) {
  const frame = foldFrame(data);
  if (!frame) return new THREE.Vector2(1, 0);
  let probe = pieceCenter(frame.ruler.pieces[frame.probeIndex]);
  const radial = probe.clone().sub(frame.pivot)
    .addScaledVector(frame.axis, -probe.clone().sub(frame.pivot).dot(frame.axis));
  if (radial.lengthSq() < .01) {
    probe = hitPoint.clone();
  }
  const rotated = probe.clone().sub(frame.pivot).applyAxisAngle(frame.axis, .12).add(frame.pivot);
  const direction = projectedPoint(rotated).sub(projectedPoint(probe));
  return direction.lengthSq() > .0001 ? direction.normalize() : new THREE.Vector2(1, 0);
}

function pointerNdc(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
  pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;
  return pointer;
}

function hitObject(event) {
  raycaster.setFromCamera(pointerNdc(event), camera);
  return raycaster.intersectObjects(interactiveObjects, false)[0] || null;
}

function groundPoint(event) {
  raycaster.setFromCamera(pointerNdc(event), camera);
  const result = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, result) ? result : null;
}

function findJoinCandidate(moving) {
  let best = null;
  ['start', 'end'].forEach(movingEnd => {
    const movingPoint = endpoint(moving, movingEnd);
    state.rulers.filter(ruler => ruler.id !== moving.id).forEach(target => {
      ['start', 'end'].forEach(targetEnd => {
        const distance = movingPoint.distanceTo(endpoint(target, targetEnd));
        if (distance <= JOIN_DISTANCE && (!best || distance < best.distance)) {
          best = { movingId: moving.id, movingEnd, targetId: target.id, targetEnd, distance };
        }
      });
    });
  });
  return best;
}

function reversedPieces(pieces) {
  return clone(pieces).reverse().map(piece => ({ ...piece, forward: piece.forward === false }));
}

function translateRuler(ruler, delta) {
  const translation = new THREE.Matrix4().makeTranslation(delta.x, delta.y, delta.z);
  ruler.pieces.forEach(piece => { piece.matrix = translation.clone().multiply(pieceMatrix(piece)).toArray(); });
}

function keepRulerFloating(ruler) {
  if (!ruler?.pieces.length) return;
  const bounds = new THREE.Box3();
  ruler.pieces.forEach(piece => {
    const localBounds = prismGeometries[piece.type].boundingBox;
    if (localBounds) bounds.union(localBounds.clone().applyMatrix4(pieceMatrix(piece)));
  });
  if (bounds.isEmpty()) return;
  const lift = FLOOR_Y + HOVER_CLEARANCE - bounds.min.y;
  if (Math.abs(lift) > .0001) translateRuler(ruler, new THREE.Vector3(0, lift, 0));
}

function mergeCandidate(candidate) {
  if (!candidate) return;
  const moving = state.rulers.find(ruler => ruler.id === candidate.movingId);
  const target = state.rulers.find(ruler => ruler.id === candidate.targetId);
  if (!moving || !target) return;
  translateRuler(moving, endpoint(target, candidate.targetEnd).sub(endpoint(moving, candidate.movingEnd)));
  const first = candidate.movingEnd === 'start' ? reversedPieces(moving.pieces) : clone(moving.pieces);
  const second = candidate.targetEnd === 'end' ? reversedPieces(target.pieces) : clone(target.pieces);
  moving.pieces = first.concat(second);
  keepRulerFloating(moving);
  state.rulers = state.rulers.filter(ruler => ruler.id !== target.id);
  state.selectedId = moving.id;
  state.joins++;
  selectedPiece = null;
  showToast(`拼接成功，现在有 ${rulerPieceCount(moving)} 阶！`);
}

function onPointerDown(event) {
  if (![0, 1, 2].includes(event.button)) return;
  event.preventDefault();
  updateCamera();
  camera.updateMatrixWorld();
  const hit = hitObject(event);
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('grabbing');
  if (event.button !== 0 || event.shiftKey) {
    interaction = {
      type: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      target: view.target.clone(),
      right: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
      up: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    };
    setLowDetailInteraction(true);
    return;
  }
  if (hit && (hit.object.userData.type === 'piece' || hit.object.userData.type === 'endpoint')) {
    const data = hit.object.userData;
    const rulerChanged = state.selectedId !== data.rulerId;
    state.selectedId = data.rulerId;
    if (state.mode === 'twist' && data.type === 'piece') {
      selectedPiece = { rulerId: data.rulerId, pieceIndex: data.pieceIndex, pieceNumber: data.pieceNumber };
      const ruler = selected();
      focusSelectedPiece();
      updateCamera();
      camera.updateMatrixWorld();
      interaction = {
        type: 'twist', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
        data: clone(selectedPiece), before: clone(state), original: ruler.pieces.map(piece => clone(piece.matrix)),
        screenDirection: foldScreenDirection(selectedPiece, hit.point), angle: 0, moved: false
      };
      $('#gestureCue').classList.add('show');
      if (rulerChanged) buildScene();
      else {
        refreshPieceSelection();
        updatePanels();
      }
    } else if (state.mode === 'move') {
      const ruler = selected();
      const start = groundPoint(event);
      if (!ruler || !start) return;
      interaction = { type: 'move', pointerId: event.pointerId, start, before: clone(state), original: ruler.pieces.map(piece => clone(piece.matrix)), rulerId: ruler.id, moved: false };
      if (rulerChanged) buildScene();
      else updatePanels();
      setLowDetailInteraction(true);
    }
  } else {
    interaction = { type: 'orbit', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, azimuth: view.azimuth, elevation: view.elevation };
    setLowDetailInteraction(true);
  }
}

function onPointerMove(event) {
  if (!interaction || interaction.pointerId !== event.pointerId) {
    const hit = hitObject(event);
    canvas.classList.toggle('piece-hover', Boolean(hit));
    return;
  }
  if (interaction.type === 'orbit') {
    view.azimuth = interaction.azimuth - (event.clientX - interaction.startX) * .008;
    view.elevation = Math.max(-1.52, Math.min(1.52, interaction.elevation + (event.clientY - interaction.startY) * .006));
    requestRender();
  } else if (interaction.type === 'pan') {
    const dx = event.clientX - interaction.startX, dy = event.clientY - interaction.startY;
    const worldPerPixel = 2 * view.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, canvas.clientHeight);
    view.target.copy(interaction.target)
      .addScaledVector(interaction.right, -dx * worldPerPixel)
      .addScaledVector(interaction.up, dy * worldPerPixel);
    requestRender();
  } else if (interaction.type === 'twist') {
    const dx = event.clientX - interaction.startX, dy = event.clientY - interaction.startY;
    const gesture = dx * interaction.screenDirection.x + dy * interaction.screenDirection.y;
    const angle = Math.abs(gesture) < 16 ? 0 : Math.sign(gesture) * Math.PI / 2;
    const cue = $('#gestureCue');
    interaction.moved = angle !== 0;
    if (angle !== interaction.angle) {
      interaction.angle = angle;
      applyFoldAngle(interaction.data, angle, interaction.original);
      syncRulerVisual(state.rulers.find(ruler => ruler.id === interaction.data.rulerId));
      cue.querySelector('b').textContent = angle ? `旋转 ${angle > 0 ? '+' : '−'}90°` : '向任一侧拖动';
      cue.querySelector('span').textContent = angle ? '松手完成这次扭转' : '每次扭转固定为 90°';
    }
  } else if (interaction.type === 'move') {
    const current = groundPoint(event);
    const ruler = state.rulers.find(item => item.id === interaction.rulerId);
    if (!current || !ruler) return;
    const delta = current.clone().sub(interaction.start);
    interaction.moved ||= delta.length() > .03;
    const translation = new THREE.Matrix4().makeTranslation(delta.x, delta.y, delta.z);
    ruler.pieces.forEach((piece, index) => { piece.matrix = translation.clone().multiply(new THREE.Matrix4().fromArray(interaction.original[index])).toArray(); });
    keepRulerFloating(ruler);
    joinCandidate = findJoinCandidate(ruler);
    syncRulerVisual(ruler);
    updateJoinIndicator();
    if (joinCandidate) {
      const cue = $('#gestureCue');
      cue.querySelector('b').textContent = '可以拼接';
      cue.querySelector('span').textContent = '松手连接两个端点';
      cue.classList.add('show');
    }
  }
}

function onPointerUp(event) {
  if (!interaction || interaction.pointerId !== event.pointerId) return;
  let rebuild = false;
  let stateChanged = false;
  if (interaction.type === 'twist') {
    if (interaction.moved) {
      checkpoint(interaction.before);
      const degrees = Math.round(interaction.angle * 180 / Math.PI);
      showToast(`关节已旋转 ${degrees}°`);
      stateChanged = true;
    }
  } else if (interaction.type === 'move' && interaction.moved) {
    checkpoint(interaction.before);
    if (joinCandidate) {
      mergeCandidate(joinCandidate);
      rebuild = true;
    } else {
      stateChanged = true;
    }
  }
  interaction = null;
  joinCandidate = null;
  updateJoinIndicator();
  setLowDetailInteraction(false);
  canvas.classList.remove('grabbing');
  const cue = $('#gestureCue');
  cue.classList.remove('show');
  cue.querySelector('b').textContent = '抓住一个三角块';
  cue.querySelector('span').textContent = '每次拖动固定旋转 90°';
  if (rebuild) {
    buildScene();
  } else {
    if (stateChanged) {
      scheduleSave();
      updatePanels();
    }
    requestRender();
  }
}

function setMode(mode) {
  state.mode = mode;
  $$('.edit-modes button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  showToast(mode === 'twist' ? '扭转模式：每次旋转 90°' : '移动模式：拖动整条魔尺并拼接');
  scheduleSave();
}

function rotateSelectedStep(side, direction, key) {
  if (!selectedPiece) return showToast('请先点击一个三角块');
  const ruler = state.rulers.find(item => item.id === selectedPiece.rulerId);
  if (!ruler || ruler.pieces.length < 2) return showToast('至少需要两个三角块才能旋转');
  const rotationData = { ...selectedPiece, side };
  if (!foldFrame(rotationData)) return showToast(side === 'before' ? '选中块左侧没有可旋转部分' : '选中块右侧没有可旋转部分');
  const before = clone(state);
  const original = ruler.pieces.map(piece => clone(piece.matrix));
  applyFoldAngle(rotationData, direction * Math.PI / 2, original);
  checkpoint(before);
  syncRulerVisual(ruler);
  refreshPieceSelection();
  updatePanels();
  scheduleSave();
  showToast(`${key}：${side === 'before' ? '左段' : '右段'}旋转 ${direction < 0 ? '−' : '+'}90°`);
}

function fitView() {
  const points = state.rulers.flatMap(ruler => ruler.pieces.flatMap(piece => {
    const matrix = pieceMatrix(piece);
    return [
      new THREE.Vector3(0, 0, 0).applyMatrix4(matrix),
      new THREE.Vector3(ROOT2, DEPTH, ROOT2 / 2).applyMatrix4(matrix)
    ];
  }));
  if (!points.length) {
    view.target.set(0, 0, 0);
    view.distance = 12;
    return;
  }
  const box = new THREE.Box3().setFromPoints(points);
  box.getCenter(view.target);
  const size = box.getSize(new THREE.Vector3());
  view.distance = Math.max(7, Math.max(size.x, size.y, size.z) * 1.55 + 2.5);
  updateZoomLabel();
  requestRender();
}

function updateZoomLabel() {
  $('#zoomLabel').textContent = `${Math.round(1800 / view.distance)}%`;
}

function updatePanels() {
  const ruler = selected();
  $('#rulerCount').textContent = state.rulers.length;
  $('#pieceCount').textContent = state.rulers.reduce((sum, item) => sum + rulerPieceCount(item), 0);
  $('#joinCount').textContent = state.joins;
  $('#selectionEmpty').style.display = ruler ? 'none' : 'block';
  $('#selectionTools').style.display = ruler ? 'block' : 'none';
  if (ruler) {
    $('#selectedName').textContent = ruler.name;
    $('#selectedPieces').textContent = rulerPieceCount(ruler);
    $('#selectedSwatch').style.background = palettes[ruler.palette]?.colors[0] || palettes.classic.colors[0];
  }
  $('#emptyState').classList.toggle('show', !state.rulers.length);
  $('#undoBtn').disabled = !undoStack.length;
  $('#redoBtn').disabled = !redoStack.length;
  $$('.palette button').forEach(button => button.classList.toggle('active', button.dataset.palette === state.palette));
  $$('.edit-modes button').forEach(button => button.classList.toggle('active', button.dataset.mode === state.mode));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(SAVE_KEY, JSON.stringify(state)), 250);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved?.rulers && Array.isArray(saved.rulers) && saved.rulers.every(ruler => Array.isArray(ruler.pieces))) {
      state = { ...state, ...saved };
      state.rulers.forEach(ruler => { ruler.name = `魔尺${ruler.id}`; });
      return;
    }
  } catch (_) {
    localStorage.removeItem(SAVE_KEY);
  }
  state.rulers = [{ id: 1, name: '魔尺1', palette: 'classic', pieces: createPieces(24, 'classic') }];
  state.selectedId = 1;
  state.nextId = 2;
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = Math.max(3, Math.min(90, view.distance * (event.deltaY > 0 ? 1.08 : .92)));
  updateZoomLabel();
  requestRender();
}, { passive: false });

$('#newRulerBtn').addEventListener('click', addRuler);
$('#emptyNewBtn').addEventListener('click', addRuler);
$('#gunTemplateBtn').addEventListener('click', applyGunTemplate);
$('#deleteBtn').addEventListener('click', deleteSelected);
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
$('#zoomIn').addEventListener('click', () => { view.distance = Math.max(3, view.distance * .86); updateZoomLabel(); requestRender(); });
$('#zoomOut').addEventListener('click', () => { view.distance = Math.min(90, view.distance * 1.16); updateZoomLabel(); requestRender(); });
$('#fitBtn').addEventListener('click', fitView);
$$('.edit-modes button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$$('.end-editor button').forEach(button => button.addEventListener('click', () => {
  const [action, end] = button.dataset.action.split('-');
  changePieces(end, action === 'add' ? 1 : -1);
}));
$$('.palette button').forEach(button => button.addEventListener('click', () => {
  state.palette = button.dataset.palette;
  updatePanels();
  scheduleSave();
}));

const modal = $('#helpModal');
function setHelp(open) {
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
}
$('#helpBtn').addEventListener('click', () => setHelp(true));
$('#closeHelp').addEventListener('click', () => setHelp(false));
$('#startPlaying').addEventListener('click', () => setHelp(false));
modal.addEventListener('click', event => { if (event.target === modal) setHelp(false); });

document.addEventListener('keydown', event => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  else if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
  else if ((event.key === 'Delete' || event.key === 'Backspace') && !event.target.matches('input,textarea')) { event.preventDefault(); deleteSelected(); }
  else if (!modifier && !event.repeat && event.key.toLowerCase() === 'a' && !modal.classList.contains('open')) { event.preventDefault(); rotateSelectedStep('before', event.shiftKey ? 1 : -1, event.shiftKey ? 'Shift+A' : 'A'); }
  else if (!modifier && !event.repeat && event.key.toLowerCase() === 'd' && !modal.classList.contains('open')) { event.preventDefault(); rotateSelectedStep('after', event.shiftKey ? -1 : 1, event.shiftKey ? 'Shift+D' : 'D'); }
  else if (event.key.toLowerCase() === 'm') setMode(state.mode === 'twist' ? 'move' : 'twist');
  else if (event.key === 'Escape') setHelp(false);
});

window.addEventListener('resize', resize);
load();
state.rulers.forEach(keepRulerFloating);
resize();
buildScene();
fitView();
