const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1445);

function createOutline(object, color = 0x000000, thickness = 0.1) {
  if (object.isMesh) {

    const outline = object.clone();
    outline.material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.BackSide
    });
    outline.scale.multiplyScalar(1 + thickness);
    object.add(outline);
  } else if (object.isGroup) {
    object.children.forEach(child => {
      if (child.isMesh) {
        const outline = new THREE.Mesh(child.geometry, new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.BackSide,
        }));
        outline.scale.copy(child.scale).multiplyScalar(1 + thickness);
        outline.position.set(0, 0, 0);
        outline.rotation.set(0, 0, 0);

        child.add(outline);
        child.userData.outline = outline;
      }
    });
  }
}


const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 150, 200);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 200, 100);
scene.add(directionalLight);

const tableWidth = 120;
const tableHeight = 220;
const tableThickness = 6;

const tableGeometry = new THREE.BoxGeometry(tableWidth, tableThickness, tableHeight);
const tableMaterial = new THREE.MeshToonMaterial({ color: 0x1a1a8b });
const table = new THREE.Mesh(tableGeometry, tableMaterial);
table.position.y = -tableThickness / 2;
scene.add(table);

const centerLineGeometry = new THREE.PlaneGeometry(tableWidth, 0.5);
const centerLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
centerLine.rotation.x = -Math.PI / 2;
centerLine.position.y = 0.01;
scene.add(centerLine);

const edgeHeight = 12;
const edgeThickness = 6;
const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0x202060, shininess: 100 });

const edges = [];
for (let i = -1; i <= 1; i += 2) {
  const goalWidth = 30;
  const sideLength = (tableWidth - goalWidth) / 2;

  const edgeLeft = new THREE.Mesh(
    new THREE.BoxGeometry(sideLength, edgeHeight, edgeThickness),
    edgeMaterial
  );
  edgeLeft.position.set(-(goalWidth / 2 + sideLength / 2), edgeHeight / 2 - tableThickness / 2, i * (tableHeight / 2 + edgeThickness / 2));
  scene.add(edgeLeft);
  edges.push(edgeLeft);

  const edgeRight = new THREE.Mesh(
    new THREE.BoxGeometry(sideLength, edgeHeight, edgeThickness),
    edgeMaterial
  );
  edgeRight.position.set(goalWidth / 2 + sideLength / 2, edgeHeight / 2 - tableThickness / 2, i * (tableHeight / 2 + edgeThickness / 2));
  scene.add(edgeRight);
  edges.push(edgeRight);
}



for (let i = -1; i <= 1; i += 2) {
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(edgeThickness, edgeHeight, tableHeight),
    edgeMaterial
  );
  edge.position.set(i * (tableWidth / 2 + edgeThickness / 2), edgeHeight / 2 - tableThickness / 2, 0);
  scene.add(edge);
  edges.push(edge);
}

edges.forEach(edge => {
  const edgeGeometry = new THREE.EdgesGeometry(edge.geometry);
  const edgeLines = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  edge.add(edgeLines);
});

function createMallet(color) {
  const group = new THREE.Group();

  const baseRadius = 12;
  const baseHeight = 4;
  const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
  const baseMaterial = new THREE.MeshToonMaterial({ color, shininess: 100 })
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = baseHeight / 2;
  group.add(base);

  const topRadius = 6;
  const topHeight = 8;
  const topGeometry = new THREE.CylinderGeometry(topRadius, topRadius, topHeight, 32);
  const top = new THREE.Mesh(topGeometry, baseMaterial);
  top.position.y = baseHeight + topHeight / 2;
  group.add(top);

  return group;
}

const player1 = createMallet(0x4263eb);
player1.position.set(0, 0, tableHeight / 2 - 25);
scene.add(player1);


const player2 = createMallet(0xeb4242);
player2.position.set(0, 0, -tableHeight / 2 + 25);
scene.add(player2);


const puckRadius = 9.6;
const puckHeight = 1.2;
const puckGeometry = new THREE.CylinderGeometry(puckRadius, puckRadius, puckHeight, 64);
const puckMaterial = new THREE.MeshToonMaterial({
  color: 0xffffff,
});
const puck = new THREE.Mesh(puckGeometry, puckMaterial);
puck.position.set(0, puckHeight / 2, 0);
scene.add(puck);
createOutline(player1, 0x000000, 0.09);
createOutline(player2, 0x000000, 0.09);
createOutline(puck, 0x000000, 0.1);

let player1Vel = new THREE.Vector3();
let player2Vel = new THREE.Vector3();
let puckVel = new THREE.Vector3();

const maxSpeed = 3.0;
const puckSpeedFactor = 5;
const friction = 0.92;
const puckFriction = 0.985;
const puckBounce = 0.98;

function createPowerUp(x, z) {
  const group = new THREE.Group();


  const circleGeo = new THREE.CircleGeometry(10, 32);

  const circleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const circle = new THREE.Mesh(circleGeo, circleMat);
  circle.rotation.x = -Math.PI / 2;
  group.add(circle);

  const circleEdges = new THREE.EdgesGeometry(circleGeo);
  const circleLine = new THREE.LineSegments(
    circleEdges,
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  circleLine.rotation.x = -Math.PI / 2;
  group.add(circleLine);

  const cubeGeo = new THREE.BoxGeometry(10, 10, 10);
  const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
  const cubeLine = new THREE.LineSegments(
    cubeEdges,
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  cubeLine.position.y = 20;
  console.log("Posição Y do cubo:", cubeLine.position.y);
  cubeLine.name = 'powerCube';
  
  group.add(cubeLine);

  group.position.set(x, 0, z);
  scene.add(group);

  return { group, cube: cubeLine };
}

const powerUps = [
  createPowerUp(-30, tableHeight / 4),  
  createPowerUp(30, tableHeight / 4),    
  createPowerUp(-30, -tableHeight / 4),  
  createPowerUp(30, -tableHeight / 4),   
];

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function getGamepadAxisValue(gamepad, axisIndex) {
  const val = gamepad?.axes[axisIndex] ?? 0;
  return Math.abs(val) < 0.15 ? 0 : val;
}

function updateGamepadInput() {
  const gamepads = navigator.getGamepads();

  // Gamepad 1: controla Jogador 1
  const gp1 = gamepads[0];
  if (gp1) {
    const leftX1 = getGamepadAxisValue(gp1, 0);
    const leftY1 = getGamepadAxisValue(gp1, 1);

    player1Vel.x += leftX1 * maxSpeed;
    player1Vel.z += leftY1 * maxSpeed; 
  }

  
  const gp2 = gamepads[1];
  if (gp2) {
    const leftX2 = getGamepadAxisValue(gp2, 0);
    const leftY2 = getGamepadAxisValue(gp2, 1);

    player2Vel.x += leftX2 * maxSpeed;
    player2Vel.z += leftY2 * maxSpeed; 
  }
}

function limitPlayerPos(player, maxX, minZ, maxZ) {
  player.position.x = Math.max(-maxX, Math.min(maxX, player.position.x));
  player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));
}

function checkPuckCollision() {
  [player1, player2].forEach((player, index) => {
    const dx = puck.position.x - player.position.x;
    const dz = puck.position.z - player.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const minDist = 12 + puckRadius;

    if (distance < minDist) {
      const isInCorner =
        (Math.abs(puck.position.x) > tableWidth / 2 - 10) &&
        (Math.abs(puck.position.z) > tableHeight / 2 - 10);

      const overlap = minDist - distance;

      const angle = Math.atan2(dz, dx);
      puck.position.x += Math.cos(angle) * overlap;
      puck.position.z += Math.sin(angle) * overlap;

      if (isInCorner) {

        const toCenter = new THREE.Vector3(0, 0, 0).sub(puck.position).normalize();
        puckVel.copy(toCenter.multiplyScalar(puckSpeedFactor));
      } else {
        const relativeSpeed = index === 0 ? player1Vel.clone() : player2Vel.clone();
        const impulse = relativeSpeed.clone().normalize().multiplyScalar(puckSpeedFactor);
        puckVel.copy(impulse);
      }
    }
  });

  if (Math.abs(puck.position.x) + puckRadius > tableWidth / 2) {
    puck.position.x = Math.sign(puck.position.x) * (tableWidth / 2 - puckRadius);
    puckVel.x *= -puckBounce;
  }

  if (Math.abs(puck.position.z) + puckRadius > tableHeight / 2) {
    puck.position.z = Math.sign(puck.position.z) * (tableHeight / 2 - puckRadius);
    puckVel.z *= -puckBounce;
  }
}

let score1 = 0;
let score2 = 0;

const initialPositions = {
  player1: new THREE.Vector3(0, 0, tableHeight / 2 - 25),
  player2: new THREE.Vector3(0, 0, -tableHeight / 2 + 25),
  puck: new THREE.Vector3(0, puckHeight / 2, 0),
};

function resetPositions() {
  player1.position.copy(initialPositions.player1);
  player2.position.copy(initialPositions.player2);
  puck.position.copy(initialPositions.puck);

  player1Vel.set(0, 0, 0);
  player2Vel.set(0, 0, 0);
  puckVel.set(0, 0, 0);
}

function checkGoal() {
  const scoreboard = document.getElementById("scoreboard");
  scoreboard.innerHTML = scoreboard.innerHTML.replace(/(\d+)(?=\s\|\sJogador)/, score1);
  scoreboard.innerHTML = scoreboard.innerHTML.replace(/(?<=:\s)(\d+)$/, score2);

  const goalWidth = 30;
  if (
    puck.position.z + puckRadius >= tableHeight / 2 &&
    Math.abs(puck.position.x) < goalWidth / 2
  ) {
    score2++;
    console.log("Gol do jogador vermelho! Placar: " + score1 + " x " + score2);
    
    resetPositions();
  }
  if (
    puck.position.z - puckRadius <= -tableHeight / 2 &&
    Math.abs(puck.position.x) < goalWidth / 2
  ) {
    score1++;
    
    console.log("Gol do jogador azul! Placar: " + score1 + " x " + score2);
    
    resetPositions();
  }
}

function checkScore() {
  if(score1 >= 10 || score2 >= 10){
    score1 = 0;
    score2 = 0;
    resetPositions();
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateGamepadInput();


  if (keys['w']) {
    player1Vel.z -= 0.2; 
  } else if (keys['s']) {
    player1Vel.z += 0.15; 
  }
  if (keys['a']) player1Vel.x -= 0.15;
  if (keys['d']) player1Vel.x += 0.15;

  if (keys['arrowup']) {
    player2Vel.z += 0.2; 
  } else if (keys['arrowdown']) {
    player2Vel.z -= 0.15; 
  }
  if (keys['arrowleft']) player2Vel.x -= 0.15;
  if (keys['arrowright']) player2Vel.x += 0.15;

  const windForce = 0.0002;

  player1Vel.x += windForce;
  player1Vel.z += windForce  * -1;
  player2Vel.x += windForce;
  player2Vel.z += windForce;
  puckVel.x += windForce * 0.2; 
  puckVel.z += windForce * 0.2;

  if (player1Vel.length() > maxSpeed) player1Vel.setLength(maxSpeed);
  if (player2Vel.length() > maxSpeed) player2Vel.setLength(maxSpeed);

  player1.position.add(player1Vel);
  player2.position.add(player2Vel);

  limitPlayerPos(player1, tableWidth / 2 - 12, 0, tableHeight / 2 - 12);
  limitPlayerPos(player2, tableWidth / 2 - 12, -tableHeight / 2 + 12, 0);

  player1Vel.multiplyScalar(friction);
  player2Vel.multiplyScalar(friction);

function checkPowerUpCollision(player, powerUp) {
  powerUp.cube.visible = false;
}

powerUps.forEach(pu => {
  checkPowerUpCollision(player1, pu);
  checkPowerUpCollision(player2, pu);
});



  puck.position.add(puckVel);
  checkPuckCollision(); 

  checkGoal(); 
  puckVel.multiplyScalar(puckFriction);

  checkPuckCollision();
  checkGoal();

  const cameraTargetX = (player1.position.x + player2.position.x) / 2;
  const currentX = camera.position.x;
  const lerpSpeed = 0.05;
  camera.position.x += (cameraTargetX - currentX) * lerpSpeed;
  camera.lookAt(0, 0, 0);

 
  powerUps.forEach(pu => {
    if (!pu.cube.visible) return;

    const time = performance.now() * 0.002;
    pu.cube.rotation.y = time;
    pu.cube.position.y = 8 + Math.sin(time * 2) * 0.5;
  });

  [player1, player2, puck].forEach(mesh => {
    const outline = mesh.userData.outline;
    if (outline) {
      outline.position.copy(mesh.position);
      outline.quaternion.copy(mesh.quaternion);
    }
  });

  renderer.render(scene, camera);
}
animate();
