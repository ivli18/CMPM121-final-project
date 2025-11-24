// src/main.ts
import { GLContext } from "./gl/GLContext.ts";
import { Engine } from "./core/Engine.ts";
import { Shader } from "./gl/Shader.ts";
import { mat4, vec3 } from "gl-matrix";
import { Input } from "./core/Input.ts";
// import { Time } from "./core/Time.ts"; // (not used yet)
// import { SceneManager } from "./core/SceneManager.ts"; // (not used yet)
// (I'm commenting these out until we need them so the code linter is happy)

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

// Helper to create VAO from interleaved position/color data
function createDrawable(
  gl: WebGL2RenderingContext,
  positions: number[],
  colors: number[],
  indices: number[],
  mode: number, // <--- NEW
): Drawable {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Failed to create VAO");

  gl.bindVertexArray(vao);

  // Interleave position and color into a single buffer
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
    mode, // <--- NEW
  };
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

  // --------- Geometry: cube (character placeholder) ---------
  // A unit cube centered at origin, we’ll scale/position via model matrix.
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
    // front
    0, 1, 2, 0, 2, 3,
    // right
    1, 5, 6, 1, 6, 2,
    // back
    5, 4, 7, 5, 7, 6,
    // left
    4, 0, 3, 4, 3, 7,
    // top
    3, 2, 6, 3, 6, 7,
    // bottom
    4, 5, 1, 4, 1, 0,
  ];

  const character = createDrawable(
    gl,
    cubePositions,
    cubeColors,
    cubeIndices,
    gl.TRIANGLES,
  );

  // Player position in world space
  const playerPos = vec3.fromValues(0, 0.5, 0);

  // Position the character above the floor at the origin
  mat4.fromTranslation(character.modelMatrix, playerPos);

  // --------- Geometry: win condition (small pyramid) ---------
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
    // base
    0, 1, 2, 0, 2, 3,
    // sides
    0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0,
  ];

  const wincon = createDrawable(
    gl,
    winconPositions,
    winconColors,
    winconIndices,
    gl.TRIANGLES,
  );
  const winconPos = vec3.fromValues(3, 0.3, -2); // position in world
  mat4.fromTranslation(wincon.modelMatrix, winconPos);

  let winconCollected = false;

  // --------- Geometry: floor grid (lines) ---------
  const gridSize = 10; // extent from center
  const divisions = 20; // number of cells per side
  const floorY = 0;

  const gridPositions: number[] = [];
  const gridColors: number[] = [];
  const gridIndices: number[] = [];

  // Build lines parallel to X (constant Z)
  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    // line from (-gridSize, floorY, t) to (gridSize, floorY, t)
    const baseIndex = gridPositions.length / 3;

    gridPositions.push(-gridSize, floorY, t, gridSize, floorY, t);

    // light gray lines
    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);

    gridIndices.push(baseIndex, baseIndex + 1);
  }

  // Build lines parallel to Z (constant X)
  for (let i = 0; i <= divisions; i++) {
    const t = -gridSize + (2 * gridSize * i) / divisions;
    const baseIndex = gridPositions.length / 3;

    gridPositions.push(t, floorY, -gridSize, t, floorY, gridSize);

    gridColors.push(0.8, 0.8, 0.8, 0.8, 0.8, 0.8);

    gridIndices.push(baseIndex, baseIndex + 1);
  }

  const floor = createDrawable(
    gl,
    gridPositions,
    gridColors,
    gridIndices,
    gl.LINES,
  );

  // --------- Camera setup ---------
  const projection = mat4.create();
  const view = mat4.create();
  const vp = mat4.create(); // view * projection
  const mvp = mat4.create();
  const tmp = mat4.create();

  function updateCamera() {
    const aspect = glctx.canvas.width / glctx.canvas.height;
    mat4.perspective(projection, (80 * Math.PI) / 180, aspect, 0.1, 100.0);

    const eye = vec3.fromValues(5, 5, 5);
    const center = playerPos;
    const up = vec3.fromValues(0, 1, 0);
    mat4.lookAt(view, eye, center, up);

    mat4.multiply(vp, projection, view);
  }

  updateCamera();

  let angle = 0;

  const engine = new Engine((dt: number) => {
    // Per-frame input housekeeping

    glctx.clear();

    // --- Player movement with arrow keys ---
    const speed = 3; // units per second

    if (Input.isKeyDown("ArrowUp")) {
      playerPos[2] -= speed * dt; // move forward (-Z)
    }
    if (Input.isKeyDown("ArrowDown")) {
      playerPos[2] += speed * dt; // move backward (+Z)
    }
    if (Input.isKeyDown("ArrowLeft")) {
      playerPos[0] -= speed * dt; // move left (-X)
    }
    if (Input.isKeyDown("ArrowRight")) {
      playerPos[0] += speed * dt; // move right (+X)
    }

    // Spin the character cube a bit
    angle += dt;

    // Build model matrix from updated playerPos
    mat4.fromTranslation(character.modelMatrix, playerPos);
    mat4.rotateY(character.modelMatrix, character.modelMatrix, angle);

    // --- Check for win condition collision ---
    if (!winconCollected) {
      const dist = vec3.distance(playerPos, winconPos);
      if (dist < 1.0) {
        // collision detection radius
        winconCollected = true;
        alert("You Win!");
      }
    }

    // Camera follows the player
    updateCamera();

    shader.use();

    // draw character
    gl.bindVertexArray(character.vao);
    mat4.multiply(tmp, vp, character.modelMatrix);
    mat4.copy(mvp, tmp);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.drawElements(gl.TRIANGLES, character.indexCount, gl.UNSIGNED_SHORT, 0);

    // draw floor
    gl.bindVertexArray(floor.vao);
    mat4.multiply(tmp, vp, floor.modelMatrix);
    mat4.copy(mvp, tmp);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.drawElements(gl.TRIANGLES, floor.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    // draw win condition (if not collected)
    if (!winconCollected) {
      gl.bindVertexArray(wincon.vao);
      mat4.multiply(tmp, vp, wincon.modelMatrix);
      mat4.copy(mvp, tmp);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.drawElements(gl.TRIANGLES, wincon.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // If you want to use wasKeyPressed/wasKeyReleased, clear them here:
    Input.update();
  });

  engine.start();
}

bootstrap();
