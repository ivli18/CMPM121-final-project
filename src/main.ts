// src/main.ts
import { GLContext } from "./gl/GLContext.ts";
import { Engine } from "./core/Engine.ts";
import { Shader } from "./gl/Shader.ts";
import { mat4, vec3 } from "gl-matrix";
import { Input } from "./core/Input.ts";

// deno-lint-ignore no-explicit-any
declare const OIMO: any;

// Initialize Input system
Input.init();

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

interface Drawable {
  vao: WebGLVertexArrayObject | null;
  indexCount: number;
  modelMatrix: mat4;
  mode: number;
}

// Simple pairing of physics + graphics for objects that need both
interface PhysicsDrawable {
  // deno-lint-ignore no-explicit-any
  body: any;       // OIMO.Body
  drawable: Drawable;
}

// Helper to create VAO from interleaved position/color data
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

  // aPosition (location = 0)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, strideBytes, 0);

  // aColor (location = 1)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, strideBytes, 3 * 4);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    vao,
    indexCount: indices.length,
    modelMatrix: mat4.create(),
    mode,
  };
}

// Helper to create a box body in Oimo (used for player, floor, platforms)
function createBoxBody(opts: {
  // deno-lint-ignore no-explicit-any
  world: any;
  size: [number, number, number]; // [sx, sy, sz]
  pos: [number, number, number];  // [x, y, z]
  move: boolean;                  // true = dynamic, false = static
  density?: number;
}) {
  const { world, size, pos, move, density = 1 } = opts;

  // This matches the classic Oimo.js API (world.add)
  return world.add({
    type: "box",
    size,
    pos,
    rot: [0, 0, 0],
    move,
    density,
  });
}

function bootstrap() {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas element with id 'game' not found");
  }

  const glctx = new GLContext(canvas);
  const gl = glctx.gl;

  // Create shader program
  const shader = new Shader(gl, VERT_SRC, FRAG_SRC);
  const uMVP = shader.getUniformLocation("uMVP");
  if (!uMVP) throw new Error("Failed to get uMVP uniform");

  // ============= PHYSICS WORLD (Oimo) =============
  const world = new OIMO.World({
    timestep: 1 / 60,
    iterations: 8,
    broadphase: 2,
    worldscale: 1,
    random: true,
    info: false,
    gravity: [0, -9.8, 0],
  });

  // ============= GEOMETRY: PLAYER (cube) ==========
  const cubePositions = [
    // front
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // back
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ];
  const cubeColors = [
    // front (red-ish)
    1, 0, 0, 1, 0.3, 0.3, 1, 0.3, 0.3, 1, 0, 0,
    // back (orange-ish)
    1, 0.6, 0.2, 1, 0.8, 0.3, 1, 0.8, 0.3, 1, 0.6, 0.2,
  ];
  const cubeIndices = [
    0, 1, 2, 0, 2, 3, // front
    1, 5, 6, 1, 6, 2, // right
    5, 4, 7, 5, 7, 6, // back
    4, 0, 3, 4, 3, 7, // left
    3, 2, 6, 3, 6, 7, // top
    4, 5, 1, 4, 1, 0, // bottom
  ];

  const characterDrawable = createDrawable(
    gl,
    cubePositions,
    cubeColors,
    cubeIndices,
    gl.TRIANGLES,
  );

  // Player physics body (1x1x1 box, centered at y=0.5 on floor)
  const playerBody = createBoxBody({
    world,
    size: [1, 1, 1],
    pos: [0, 0.5, 0],
    move: true,
    density: 1,
  });

  const player: PhysicsDrawable = {
    body: playerBody,
    drawable: characterDrawable,
  };

  // Player position used for camera & simple collision distances
  const playerPos = vec3.fromValues(0, 0.5, 0);

  // ============= GEOMETRY: WIN CONDITION (pyramid) ==========
  const winconPositions = [
    // base
    -0.3, 0, -0.3, 0.3, 0, -0.3, 0.3, 0, 0.3, -0.3, 0, 0.3,
    // apex
    0, 0.6, 0,
  ];
  const winconColors = [
    // base (yellow)
    1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
    // apex (bright yellow)
    1, 1, 0.5,
  ];
  const winconIndices = [
    0, 1, 2, 0, 2, 3, // base
    0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0, // sides
  ];

  const wincon = createDrawable(
    gl,
    winconPositions,
    winconColors,
    winconIndices,
    gl.TRIANGLES,
  );
  const winconPos = vec3.fromValues(3, 0.3, -2);
  mat4.fromTranslation(wincon.modelMatrix, winconPos);
  let winconCollected = false;

  // ============= GEOMETRY: COLLECTIBLES (small cubes) ==========
  const collectiblePositions = [
    // front
    -0.2, -0.2, 0.2, 0.2, -0.2, 0.2, 0.2, 0.2, 0.2, -0.2, 0.2, 0.2,
    // back
    -0.2, -0.2, -0.2, 0.2, -0.2, -0.2, 0.2, 0.2, -0.2, -0.2, 0.2, -0.2,
  ];
  const collectibleColors = [
    // front (cyan)
    0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
    // back
    0, 0.8, 0.8, 0, 0.8, 0.8, 0, 0.8, 0.8, 0, 0.8, 0.8,
  ];
  const collectibleIndices = cubeIndices.slice();

  function makeCollectible(pos: vec3) {
    const d = createDrawable(
      gl,
      collectiblePositions,
      collectibleColors,
      collectibleIndices,
      gl.TRIANGLES,
    );
    mat4.fromTranslation(d.modelMatrix, pos);
    return d;
  }

  const collectible1Pos = vec3.fromValues(-3, 0.3, 2);
  const collectible2Pos = vec3.fromValues(4, 0.3, 3);
  const collectible3Pos = vec3.fromValues(-2, 0.3, -4);

  const collectible1 = makeCollectible(collectible1Pos);
  const collectible2 = makeCollectible(collectible2Pos);
  const collectible3 = makeCollectible(collectible3Pos);

  let collectible1Collected = false;
  let collectible2Collected = false;
  let collectible3Collected = false;

  // ============= GEOMETRY: FLOOR GRID (render only) ==========
  const gridSize = 10;
  const divisions = 20;
  const floorY = 0;

  const gridPositions: number[] = [];
  const gridColors: number[] = [];
  const gridIndices: number[] = [];

  // lines parallel to X
  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    const baseIndex = gridPositions.length / 3;
    gridPositions.push(-gridSize, floorY, t, gridSize, floorY, t);
    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);
    gridIndices.push(baseIndex, baseIndex + 1);
  }
  // lines parallel to Z
  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    const baseIndex = gridPositions.length / 3;
    gridPositions.push(t, floorY, -gridSize, t, floorY, gridSize);
    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);
    gridIndices.push(baseIndex, baseIndex + 1);
  }

  const floorDrawable = createDrawable(
    gl,
    gridPositions,
    gridColors,
    gridIndices,
    gl.LINES,
  );

  // Physics floor body (big static box just under the grid)
  const floorBody = createBoxBody({
    world,
    size: [gridSize * 2, 1, gridSize * 2],
    pos: [0, -0.5, 0],
    move: false,
  });
  void floorBody; // not used yet, but ready for collisions/platforms later

  // ============= CAMERA SETUP =============
  const projection = mat4.create();
  const view = mat4.create();
  const vp = mat4.create();
  const mvp = mat4.create();
  const tmp = mat4.create();

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

  updateCamera();

  let angle = 0;
  let physicsAccumulator = 0;
  const fixedTimeStep = 1 / 60;

  const engine = new Engine((dt: number) => {
    glctx.clear();

    // ============= INPUT → PHYSICS (PLAYER MOVEMENT) =============
    const moveSpeed = 5; // m/s
    const vel = player.body.getLinearVelocity();
    let vx = 0;
    let vz = 0;

    if (Input.isKeyDown("ArrowUp")) vz -= moveSpeed;
    if (Input.isKeyDown("ArrowDown")) vz += moveSpeed;
    if (Input.isKeyDown("ArrowLeft")) vx -= moveSpeed;
    if (Input.isKeyDown("ArrowRight")) vx += moveSpeed;

    // Keep y-velocity (for gravity / jumping later), only control x/z
    vel.x = vx;
    vel.z = vz;
    player.body.setLinearVelocity(vel);

    // Example of future jump hook:
    // if (Input.wasKeyPressed("Space") && isPlayerGrounded) {
    //   vel.y = 6; // jump velocity
    //   player.body.setLinearVelocity(vel);
    // }

    // ============= FIXED-STEP PHYSICS UPDATE =============
    physicsAccumulator += dt;
    while (physicsAccumulator >= fixedTimeStep) {
      world.step(); // uses world.timestep internally
      physicsAccumulator -= fixedTimeStep;
    }

    // Sync player graphics from physics
    const p = player.body.getPosition();
    vec3.set(playerPos, p.x, p.y, p.z);

    // Spin the character cube a bit
    angle += dt;

    mat4.fromTranslation(player.drawable.modelMatrix, playerPos);
    mat4.rotateY(
      player.drawable.modelMatrix,
      player.drawable.modelMatrix,
      angle,
    );

    // Spin collectibles if not collected
    if (!collectible1Collected) {
      mat4.fromTranslation(collectible1.modelMatrix, collectible1Pos);
      mat4.rotateY(
        collectible1.modelMatrix,
        collectible1.modelMatrix,
        angle * 2,
      );
    }
    if (!collectible2Collected) {
      mat4.fromTranslation(collectible2.modelMatrix, collectible2Pos);
      mat4.rotateY(
        collectible2.modelMatrix,
        collectible2.modelMatrix,
        angle * 2,
      );
    }
    if (!collectible3Collected) {
      mat4.fromTranslation(collectible3.modelMatrix, collectible3Pos);
      mat4.rotateY(
        collectible3.modelMatrix,
        collectible3.modelMatrix,
        angle * 2,
      );
    }

    // Spin win condition
    if (!winconCollected) {
      mat4.fromTranslation(wincon.modelMatrix, winconPos);
      mat4.rotateY(wincon.modelMatrix, wincon.modelMatrix, angle * 2);
    }

    // ============= SIMPLE DISTANCE COLLISIONS (COLLECTIBLES/WIN) =============
    if (!collectible1Collected) {
      const dist = vec3.distance(playerPos, collectible1Pos);
      if (dist < 1.0) {
        collectible1Collected = true;
        console.log("Collectible 1 found!");
      }
    }
    if (!collectible2Collected) {
      const dist = vec3.distance(playerPos, collectible2Pos);
      if (dist < 1.0) {
        collectible2Collected = true;
        console.log("Collectible 2 found!");
      }
    }
    if (!collectible3Collected) {
      const dist = vec3.distance(playerPos, collectible3Pos);
      if (dist < 1.0) {
        collectible3Collected = true;
        console.log("Collectible 3 found!");
      }
    }

    const allCollectiblesCollected =
      collectible1Collected && collectible2Collected && collectible3Collected;

    if (!winconCollected && allCollectiblesCollected) {
      const dist = vec3.distance(playerPos, winconPos);
      if (dist < 1.0) {
        winconCollected = true;
        alert("You Win!");
      }
    }

    // Camera follows physics-based player position
    updateCamera();

    shader.use();

    // Small helper to draw a drawable
    function draw(drawable: Drawable) {
      gl.bindVertexArray(drawable.vao);
      mat4.multiply(tmp, vp, drawable.modelMatrix);
      mat4.copy(mvp, tmp);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.drawElements(
        drawable.mode,
        drawable.indexCount,
        gl.UNSIGNED_SHORT,
        0,
      );
    }

    // Draw everything
    draw(player.drawable);
    draw(floorDrawable);

    if (!collectible1Collected) draw(collectible1);
    if (!collectible2Collected) draw(collectible2);
    if (!collectible3Collected) draw(collectible3);
    if (!winconCollected) draw(wincon);

    gl.bindVertexArray(null);

    // Clear edge-triggered input 
    Input.update();
  });

  engine.start();
}

bootstrap();
