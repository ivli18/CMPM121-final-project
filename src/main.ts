// src/main.ts
import { GLContext } from "./gl/GLContext.ts";
import { Engine } from "./core/Engine.ts";
import { Shader } from "./gl/Shader.ts";
import { mat4, vec3 } from "gl-matrix";
import { Input } from "./core/Input.ts";

// OIMO Setup
declare const OIMO: {
  World: new (config: {
    timestep: number;
    iterations: number;
    broadphase: number;
    worldscale: number;
    random: boolean;
    info: boolean;
    gravity: [number, number, number];
  }) => OIMOWorld;
};

interface OIMOWorld {
  addRigidBody(body: OIMOBody): void;
  step(): void;
}

interface OIMOPhysicsWorld {
  add(config: unknown): OIMOBody;
}

interface OIMOBody {
  getLinearVelocity?(): { x: number; y: number; z: number };
  setLinearVelocity?(v: { x: number; y: number; z: number }): void;
  getPosition(): { x: number; y: number; z: number };
  linearVelocity: { x: number; y: number; z: number }; // fallback
}

// =======================
// Shader sources
// =======================
const VERT_SRC = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;

uniform mat4 uMVP;

out vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

// =======================
// Basic rendering types
// =======================
interface Drawable {
  vao: WebGLVertexArrayObject | null;
  indexCount: number;
  mode: number;
}

// Transform = position/rotation/scale + cached matrix
interface Transform {
  position: vec3;
  rotation: vec3; // Euler radians [x,y,z]
  scale: vec3;
  matrix: mat4;
}

interface Renderable {
  drawable: Drawable;
}

interface PhysicsBody {
  body: OIMOBody;
}

interface Collectible {
  collected: boolean;
  radius: number;
}

interface WinCondition {
  completed: boolean;
  radius: number;
}

interface Platform {
  topY: number; // top surface height in world space
}

// =======================
// ECS Registry
// =======================
type Entity = number;

class ECS {
  private nextEntity: number = 1;

  transforms = new Map<Entity, Transform>();
  renderables = new Map<Entity, Renderable>();
  physicsBodies = new Map<Entity, PhysicsBody>();
  collectibles = new Map<Entity, Collectible>();
  winConditions = new Map<Entity, WinCondition>();
  platforms = new Map<Entity, Platform>();
  players = new Set<Entity>(); // tags

  createEntity(): Entity {
    return this.nextEntity++;
  }
}

// =======================
// Scene config
// =======================
interface PlatformConfig {
  pos: [number, number, number];
  size: [number, number, number];
}

interface SceneConfig {
  playerStart: [number, number, number];
  winconPos: [number, number, number];
  collectibles: [number, number, number][];
  platforms: PlatformConfig[];
}

// Example scene (we can make more later)
const testScene: SceneConfig = {
  playerStart: [0, 0.5, 0],
  winconPos: [0, 7.5, -1],
  collectibles: [
    [0, 3.5, -3],
    [0, 1.5, 3],
    [0, 5.5, -8],
  ],
  platforms: [
    { pos: [0, 3.0, -3], size: [3, 0.5, 3] },
    { pos: [0, 1.0, 3], size: [3, 0.5, 3] },
    { pos: [0, 5.0, -8], size: [3, 0.5, 3] },
    { pos: [0, 7.0, -1], size: [3, 0.5, 3] },
  ],
};

const scene2: SceneConfig = {
  playerStart: [0, 0.5, 0],
  winconPos: [0, 9.5, -12],
  collectibles: [
    [4, 2.5, -2],
    [-4, 4.5, -5],
    [3, 6.5, -9],
    [-3, 8.5, -11],
  ],
  platforms: [
    { pos: [0, 2.0, -2], size: [6, 0.5, 4] },
    { pos: [-4, 4.0, -5], size: [3, 0.5, 3] },
    { pos: [3, 6.0, -9], size: [4, 0.5, 4] },
    { pos: [-3, 8.0, -11], size: [3, 0.5, 3] },
    { pos: [0, 9.0, -12], size: [3, 0.5, 3] },
  ],
};

// =======================
// Helpers
// =======================

// Build VAO from positions/colors/indices
function createDrawable(
  gl: WebGL2RenderingContext,
  positions: number[],
  colors: number[],
  indices: number[],
  mode: number,
): Drawable {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Failed to create VAO");

  gl.bindVertexArray(vao);

  const vertexCount = positions.length / 3;
  const stride = 6; // 3 pos + 3 color
  const vertexData = new Float32Array(vertexCount * stride);

  for (let i = 0; i < vertexCount; i++) {
    vertexData[i * stride + 0] = positions[i * 3 + 0];
    vertexData[i * stride + 1] = positions[i * 3 + 1];
    vertexData[i * stride + 2] = positions[i * 3 + 2];

    vertexData[i * stride + 3] = colors[i * 3 + 0];
    vertexData[i * stride + 4] = colors[i * 3 + 1];
    vertexData[i * stride + 5] = colors[i * 3 + 2];
  }

  const vbo = gl.createBuffer();
  if (!vbo) throw new Error("Failed to create VBO");

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const ibo = gl.createBuffer();
  if (!ibo) throw new Error("Failed to create IBO");

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  const strideBytes = stride * 4;

  // aPosition
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, strideBytes, 0);

  // aColor
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, strideBytes, 3 * 4);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    vao,
    indexCount: indices.length,
    mode,
  };
}

// Create an Oimo box body
function createBoxBody(opts: {
  world: OIMOPhysicsWorld;
  size: [number, number, number];
  pos: [number, number, number];
  move: boolean;
  density?: number;
}) {
  const { world, size, pos, move, density = 1 } = opts;
  return world.add({
    type: "box",
    size,
    pos,
    rot: [0, 0, 0],
    move,
    density,
  });
}

// Update transform.matrix from position/rotation/scale
function updateTransformMatrix(t: Transform) {
  const m = t.matrix;
  mat4.identity(m);
  mat4.translate(m, m, t.position);
  mat4.rotateX(m, m, t.rotation[0]);
  mat4.rotateY(m, m, t.rotation[1]);
  mat4.rotateZ(m, m, t.rotation[2]);
  mat4.scale(m, m, t.scale);
}

// =======================
// Scene building
// =======================
interface SharedMeshes {
  playerCube: Drawable;
  collectibleCube: Drawable;
  platformCube: Drawable;
  winPyramid: Drawable;
  floorGrid: Drawable;
}

interface SceneBuildResult {
  playerEntity: Entity;
}

function buildScene(
  _gl: WebGL2RenderingContext,
  world: OIMOPhysicsWorld,
  ecs: ECS,
  meshes: SharedMeshes,
  config: SceneConfig,
  gridSize: number,
): SceneBuildResult {
  // ----- Player -----
  const playerE = ecs.createEntity();

  const playerTransform: Transform = {
    position: vec3.fromValues(
      config.playerStart[0],
      config.playerStart[1],
      config.playerStart[2],
    ),
    rotation: vec3.fromValues(0, 0, 0),
    scale: vec3.fromValues(1, 1, 1),
    matrix: mat4.create(),
  };
  updateTransformMatrix(playerTransform);

  ecs.transforms.set(playerE, playerTransform);
  ecs.renderables.set(playerE, { drawable: meshes.playerCube });

  const playerBody = createBoxBody({
    world,
    size: [1, 1, 1],
    pos: config.playerStart,
    move: true,
    density: 1,
  });
  ecs.physicsBodies.set(playerE, { body: playerBody });
  ecs.players.add(playerE);

  // ----- Floor (grid render + static platform physics) -----
  const floorE = ecs.createEntity();
  const floorTransform: Transform = {
    position: vec3.fromValues(0, 0, 0),
    rotation: vec3.fromValues(0, 0, 0),
    scale: vec3.fromValues(1, 1, 1),
    matrix: mat4.create(),
  };
  updateTransformMatrix(floorTransform);

  ecs.transforms.set(floorE, floorTransform);
  ecs.renderables.set(floorE, { drawable: meshes.floorGrid });

  const floorBody = createBoxBody({
    world,
    size: [gridSize * 2, 1, gridSize * 2],
    pos: [0, -0.5, 0],
    move: false,
  });
  ecs.physicsBodies.set(floorE, { body: floorBody });
  ecs.platforms.set(floorE, { topY: 0 }); // top of floor at y = 0

  // ----- Win condition -----
  const winE = ecs.createEntity();
  const winTransform: Transform = {
    position: vec3.fromValues(
      config.winconPos[0],
      config.winconPos[1],
      config.winconPos[2],
    ),
    rotation: vec3.fromValues(0, 0, 0),
    scale: vec3.fromValues(1, 1, 1),
    matrix: mat4.create(),
  };
  updateTransformMatrix(winTransform);

  ecs.transforms.set(winE, winTransform);
  ecs.renderables.set(winE, { drawable: meshes.winPyramid });
  ecs.winConditions.set(winE, { completed: false, radius: 1.0 });

  // ----- Collectibles -----
  for (const pos of config.collectibles) {
    const cE = ecs.createEntity();
    const t: Transform = {
      position: vec3.fromValues(pos[0], pos[1], pos[2]),
      rotation: vec3.fromValues(0, 0, 0),
      scale: vec3.fromValues(1, 1, 1),
      matrix: mat4.create(),
    };
    updateTransformMatrix(t);

    ecs.transforms.set(cE, t);
    ecs.renderables.set(cE, { drawable: meshes.collectibleCube });
    ecs.collectibles.set(cE, { collected: false, radius: 1.0 });
  }

  // ----- Raised Platforms -----
  for (const platform of config.platforms) {
    const [px, py, pz] = platform.pos;
    const [sx, sy, sz] = platform.size;

    const pE = ecs.createEntity();
    const t: Transform = {
      position: vec3.fromValues(px, py, pz),
      rotation: vec3.fromValues(0, 0, 0),
      scale: vec3.fromValues(sx, sy, sz),
      matrix: mat4.create(),
    };
    updateTransformMatrix(t);

    ecs.transforms.set(pE, t);
    ecs.renderables.set(pE, { drawable: meshes.platformCube });

    const body = createBoxBody({
      world,
      size: [sx, sy, sz],
      pos: [px, py, pz],
      move: false,
    });
    ecs.physicsBodies.set(pE, { body });

    const topY = py + sy / 2;
    ecs.platforms.set(pE, { topY });
  }

  return { playerEntity: playerE };
}

// =======================
// Main bootstrap
// =======================
function bootstrap() {
  Input.init();

  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas element with id 'game' not found");
  }

  const glctx = new GLContext(canvas);
  const gl = glctx.gl;

  const shader = new Shader(gl, VERT_SRC, FRAG_SRC);
  const uMVP = shader.getUniformLocation("uMVP");
  if (!uMVP) throw new Error("Failed to get uMVP uniform");

  // ---------- Physics World ----------
  let world = new OIMO.World({
    timestep: 1 / 60,
    iterations: 8,
    broadphase: 2,
    worldscale: 1,
    random: true,
    info: false,
    gravity: [0, -9.8, 0],
  });

  const ecs = new ECS();
  let currentSceneIndex = 0;
  const scenes = [testScene, scene2];
  let playerEntity: Entity;

  // ---------- Shared Geometry ----------
  // Cube geometry shared by player/platforms/collectibles
  const cubePositions = [
    // front
    -0.5,
    -0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    // back
    -0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
  ];
  const cubeIndices = [
    0,
    1,
    2,
    0,
    2,
    3, // front
    1,
    5,
    6,
    1,
    6,
    2, // right
    5,
    4,
    7,
    5,
    7,
    6, // back
    4,
    0,
    3,
    4,
    3,
    7, // left
    3,
    2,
    6,
    3,
    6,
    7, // top
    4,
    5,
    1,
    4,
    1,
    0, // bottom
  ];

  // Player colors
  const playerCubeColors = [
    // front (red-ish)
    1,
    0,
    0,
    1,
    0.3,
    0.3,
    1,
    0.3,
    0.3,
    1,
    0,
    0,
    // back (orange-ish)
    1,
    0.6,
    0.2,
    1,
    0.8,
    0.3,
    1,
    0.8,
    0.3,
    1,
    0.6,
    0.2,
  ];

  // Collectible colors (cyan)
  const collectibleCubeColors = [
    // front
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    // back
    0,
    0.8,
    0.8,
    0,
    0.8,
    0.8,
    0,
    0.8,
    0.8,
    0,
    0.8,
    0.8,
  ];

  // Platform colors (gray)
  const platformCubeColors = [
    // front
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    // back
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
  ];

  const playerCube = createDrawable(
    gl,
    cubePositions,
    playerCubeColors,
    cubeIndices,
    gl.TRIANGLES,
  );
  const collectibleCube = createDrawable(
    gl,
    cubePositions,
    collectibleCubeColors,
    cubeIndices,
    gl.TRIANGLES,
  );
  const platformCube = createDrawable(
    gl,
    cubePositions,
    platformCubeColors,
    cubeIndices,
    gl.TRIANGLES,
  );

  // Win condition pyramid
  const winconPositions = [
    // base
    -0.3,
    0,
    -0.3,
    0.3,
    0,
    -0.3,
    0.3,
    0,
    0.3,
    -0.3,
    0,
    0.3,
    // apex
    0,
    0.6,
    0,
  ];
  const winconColors = [
    // base (yellow)
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    // apex
    1,
    1,
    0.5,
  ];
  const winconIndices = [
    0,
    1,
    2,
    0,
    2,
    3, // base
    0,
    4,
    1,
    1,
    4,
    2,
    2,
    4,
    3,
    3,
    4,
    0, // sides
  ];
  const winPyramid = createDrawable(
    gl,
    winconPositions,
    winconColors,
    winconIndices,
    gl.TRIANGLES,
  );

  // Floor grid lines
  const gridSize = 10;
  const divisions = 20;
  const floorY = 0;

  const gridPositions: number[] = [];
  const gridColors: number[] = [];
  const gridIndices: number[] = [];

  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    const baseIndex = gridPositions.length / 3;

    // lines parallel to X
    gridPositions.push(-gridSize, floorY, t, gridSize, floorY, t);
    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);
    gridIndices.push(baseIndex, baseIndex + 1);
  }
  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    const baseIndex = gridPositions.length / 3;

    // lines parallel to Z
    gridPositions.push(t, floorY, -gridSize, t, floorY, gridSize);
    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);
    gridIndices.push(baseIndex, baseIndex + 1);
  }

  const floorGrid = createDrawable(
    gl,
    gridPositions,
    gridColors,
    gridIndices,
    gl.LINES,
  );

  const meshes: SharedMeshes = {
    playerCube,
    collectibleCube,
    platformCube,
    winPyramid,
    floorGrid,
  };

  world = loadScene(currentSceneIndex);

  function loadScene(sceneIndex: number) {
    // Clear ECS
    ecs.transforms.clear();
    ecs.renderables.clear();
    ecs.physicsBodies.clear();
    ecs.collectibles.clear();
    ecs.winConditions.clear();
    ecs.platforms.clear();
    ecs.players.clear();

    // Reset physics world (recreate it)
    const newWorld = new OIMO.World({
      timestep: 1 / 60,
      iterations: 8,
      broadphase: 2,
      worldscale: 1,
      random: true,
      info: false,
      gravity: [0, -9.8, 0],
    });

    // Build the new scene
    const result = buildScene(
      gl,
      newWorld as unknown as OIMOPhysicsWorld,
      ecs,
      meshes,
      scenes[sceneIndex],
      gridSize,
    );

    playerEntity = result.playerEntity;

    return newWorld;
  }

  // =======================
  // Camera setup
  // =======================
  const projection = mat4.create();
  const view = mat4.create();
  const vp = mat4.create();
  const mvp = mat4.create();
  const tmp = mat4.create();

  const playerPos = vec3.create();

  function updateCamera() {
    const aspect = glctx.canvas.width / glctx.canvas.height;
    mat4.perspective(projection, (80 * Math.PI) / 180, aspect, 0.1, 100.0);

    const eye = vec3.fromValues(
      playerPos[0] + 5,
      playerPos[1] + 5,
      playerPos[2] + 5,
    );
    const center = playerPos;
    const up = vec3.fromValues(0, 1, 0);
    mat4.lookAt(view, eye, center, up);

    mat4.multiply(vp, projection, view);
  }

  // =======================
  // Game loop (Engine)
  // =======================
  let physicsAccumulator = 0;
  const fixedTimeStep = 1 / 60;
  const moveSpeed = 5;
  const jumpSpeed = 6;
  const playerHalfHeight = 0.5;
  let playerGrounded = false;

  const engine = new Engine((dt: number) => {
    glctx.clear();

    const playerPhys = ecs.physicsBodies.get(playerEntity);
    if (!playerPhys) return;

    // ---------- INPUT → Physics (movement & jump) ----------
    const body = playerPhys.body;
    const vel = typeof body.getLinearVelocity === "function"
      ? body.getLinearVelocity()
      : body.linearVelocity;
    let vx = 0;
    let vz = 0;

    if (Input.isKeyDown("ArrowUp") || Input.isKeyDown("KeyW")) vz -= moveSpeed;
    if (Input.isKeyDown("ArrowDown") || Input.isKeyDown("KeyS")) {
      vz += moveSpeed;
    }
    if (Input.isKeyDown("ArrowLeft") || Input.isKeyDown("KeyA")) {
      vx -= moveSpeed;
    }
    if (Input.isKeyDown("ArrowRight") || Input.isKeyDown("KeyD")) {
      vx += moveSpeed;
    }

    vel.x = vx;
    vel.z = vz;

    if (Input.wasKeyPressed("Space") && playerGrounded) {
      vel.y = jumpSpeed;
    }

    if (typeof body.setLinearVelocity === "function") {
      body.setLinearVelocity(vel);
    } else {
      body.linearVelocity = vel;
    }

    // ---------- Fixed-step physics ----------
    physicsAccumulator += dt;
    while (physicsAccumulator >= fixedTimeStep) {
      world.step();
      physicsAccumulator -= fixedTimeStep;
    }

    // ---------- Sync transforms from physics ----------
    for (const [e, phys] of ecs.physicsBodies) {
      const t = ecs.transforms.get(e);
      if (!t) continue;
      const p = phys.body.getPosition();
      vec3.set(t.position, p.x, p.y, p.z);
      // keep rotation/scale as-is; just update position
      updateTransformMatrix(t);
    }

    // ---------- Player world position ----------
    const playerTransform = ecs.transforms.get(playerEntity);
    if (playerTransform) {
      vec3.copy(playerPos, playerTransform.position);
    }

    // ---------- Ground check (floor + platforms) ----------
    playerGrounded = false;
    if (playerTransform && playerPhys) {
      const body = playerPhys.body;
      const vel2 = typeof body.getLinearVelocity === "function"
        ? body.getLinearVelocity()
        : body.linearVelocity;
      const velY = vel2.y;

      for (const [, platform] of ecs.platforms) {
        const expectedCenterY = platform.topY + playerHalfHeight;
        if (
          Math.abs(playerTransform.position[1] - expectedCenterY) < 0.05 &&
          velY <= 0.1
        ) {
          playerGrounded = true;
          break;
        }
      }
    }

    // ---------- Rotate collectibles & win condition ----------

    for (const [e, coll] of ecs.collectibles) {
      if (coll.collected) continue;
      const t = ecs.transforms.get(e);
      if (!t) continue;
      t.rotation[1] += 2 * dt;
      updateTransformMatrix(t);
    }

    for (const [e, win] of ecs.winConditions) {
      if (win.completed) continue;
      const t = ecs.transforms.get(e);
      if (!t) continue;
      t.rotation[1] += 2 * dt;
      updateTransformMatrix(t);
    }

    // ---------- Collectible pickup ----------
    let allCollected = true;
    for (const [, coll] of ecs.collectibles) {
      if (!coll.collected) {
        allCollected = false;
        break;
      }
    }

    for (const [e, coll] of ecs.collectibles) {
      if (coll.collected) continue;
      const t = ecs.transforms.get(e);
      if (!t) continue;
      const dist = vec3.distance(playerPos, t.position);
      if (dist < coll.radius) {
        coll.collected = true;
        console.log("Collectible picked up:", e);
      }
    }

    // ---------- Win condition check ----------
    if (allCollected) {
      for (const [e, win] of ecs.winConditions) {
        if (win.completed) continue;
        const t = ecs.transforms.get(e);
        if (!t) continue;
        const dist = vec3.distance(playerPos, t.position);
        if (dist < win.radius) {
          win.completed = true;
          currentSceneIndex++;

          if (currentSceneIndex < scenes.length) {
            console.log(`Loading scene ${currentSceneIndex + 1}...`);
            world = loadScene(currentSceneIndex);
            physicsAccumulator = 0;
          } else {
            alert("You Win!");
          }
        }
      }
    }

    // ---------- Camera ----------
    updateCamera();
    shader.use();

    // ---------- Render ----------
    for (const [e, rend] of ecs.renderables) {
      const t = ecs.transforms.get(e);
      if (!t) continue;

      const coll = ecs.collectibles.get(e);
      if (coll && coll.collected) continue;

      const win = ecs.winConditions.get(e);
      if (win && win.completed) continue;

      gl.bindVertexArray(rend.drawable.vao);
      mat4.multiply(tmp, vp, t.matrix);
      mat4.copy(mvp, tmp);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.drawElements(
        rend.drawable.mode,
        rend.drawable.indexCount,
        gl.UNSIGNED_SHORT,
        0,
      );
    }

    gl.bindVertexArray(null);

    // Edge-triggered input bookkeeping
    Input.update();
  });

  engine.start();
}

bootstrap();
