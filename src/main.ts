// src/main.ts
import { GLContext } from "./gl/GLContext.ts";
import { Engine } from "./core/Engine.ts";
import { Shader } from "./gl/Shader.ts";
import { mat4, vec3 } from "gl-matrix";
import { Input } from "./core/Input.ts";

// Touch Screen Controller Class
class TouchController {
  private canvas: HTMLCanvasElement;
  private jumpButton: HTMLButtonElement;
  private interactButton: HTMLButtonElement;
  private upButton: HTMLButtonElement;
  private downButton: HTMLButtonElement;
  private leftButton: HTMLButtonElement;
  private rightButton: HTMLButtonElement;

  private activeDirections = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create directional buttons
    this.upButton = this.createButton("↑", "9rem", "4rem", "none");
    this.downButton = this.createButton("↓", "3rem", "4rem", "none");
    this.leftButton = this.createButton("←", "6rem", "1rem", "none");
    this.rightButton = this.createButton("→", "6rem", "7rem", "none");

    // Create jump button
    this.jumpButton = document.createElement("button");
    this.jumpButton.textContent = "↑";
    this.jumpButton.style.cssText = `
      position: fixed;
      bottom: 6rem;
      right: 2rem;
      width: 70px;
      height: 70px;
      font-size: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      background: rgba(100,100,100,0.7);
      color: white;
      z-index: 1000;
      touch-action: none;
    `;
    document.body.appendChild(this.jumpButton);

    // Create interact button
    this.interactButton = document.createElement("button");
    this.interactButton.textContent = "E";
    this.interactButton.style.cssText = `
      position: fixed;
      bottom: 6rem;
      right: 6rem;
      width: 70px;
      height: 70px;
      font-size: 24px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      background: rgba(100,100,200,0.7);
      color: white;
      z-index: 1000;
      touch-action: none;
    `;
    document.body.appendChild(this.interactButton);

    this.setupListeners();
  }

  private createButton(
    text: string,
    bottom: string,
    left: string,
    transform: string,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
      position: fixed;
      bottom: ${bottom};
      left: ${left};
      transform: ${transform};
      width: 60px;
      height: 60px;
      font-size: 28px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      background: rgba(100,100,100,0.7);
      color: white;
      z-index: 1000;
      touch-action: none;
    `;
    document.body.appendChild(button);
    return button;
  }

  private setupListeners() {
    // Directional buttons
    this.setupDirectionButton(this.upButton, "up");
    this.setupDirectionButton(this.downButton, "down");
    this.setupDirectionButton(this.leftButton, "left");
    this.setupDirectionButton(this.rightButton, "right");

    // Jump button
    this.jumpButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      Input.simulateKeyPress("Space");
    });

    // Interact button
    this.interactButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      Input.simulateKeyPress("KeyE");
    });
  }

  private setupDirectionButton(
    button: HTMLButtonElement,
    direction: "up" | "down" | "left" | "right",
  ) {
    button.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.activeDirections[direction] = true;
    });

    button.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.activeDirections[direction] = false;
    });

    button.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      this.activeDirections[direction] = false;
    });
  }

  getMovementVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.activeDirections.up) z -= 1;
    if (this.activeDirections.down) z += 1;
    if (this.activeDirections.left) x -= 1;
    if (this.activeDirections.right) x += 1;

    // Normalize diagonal movement
    if (x !== 0 && z !== 0) {
      const length = Math.sqrt(x * x + z * z);
      x /= length;
      z /= length;
    }

    return { x, z };
  }

  updateButtonTheme(theme: Theme) {
    const bgColor = theme === "dark"
      ? "rgba(100,100,100,0.7)"
      : "rgba(150,150,150,0.7)";
    this.jumpButton.style.background = bgColor;
    this.upButton.style.background = bgColor;
    this.downButton.style.background = bgColor;
    this.leftButton.style.background = bgColor;
    this.rightButton.style.background = bgColor;

    const interactBg = theme === "dark"
      ? "rgba(100,100,200,0.7)"
      : "rgba(120,120,220,0.7)";
    this.interactButton.style.background = interactBg;
  }
}

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

// ======================
// Language (i18n + l10n) Handler
// =====================
const button = document.createElement("button");
button.id = "langBtn";
button.textContent = "Language";
document.body.appendChild(button);

// Basic layout/styling that doesn't depend on theme
button.style.position = "fixed";
button.style.top = "1rem";
button.style.left = "1rem";
button.style.padding = "0.4rem 0.8rem";
button.style.borderRadius = "0.4rem";
button.style.border = "none";
button.style.cursor = "pointer";
button.style.fontFamily = "system-ui, sans-serif";
button.style.zIndex = "10";

// Theme-aware styling
function applyButtonTheme(theme: Theme) {
  if (theme === "dark") {
    button.style.backgroundColor = "#222222dd";
    button.style.color = "#f5f5f5";
    button.style.boxShadow = "0 0 8px rgba(0, 0, 0, 0.7)";
  } else {
    button.style.backgroundColor = "#ffffffdd";
    button.style.color = "#111111";
    button.style.boxShadow = "0 0 8px rgba(0, 0, 0, 0.15)";
  }
}

let currentButtonTheme: Theme = getPreferredTheme();
applyButtonTheme(currentButtonTheme);

let touchController: TouchController | null = null;

// React to OS/browser theme changes
if (window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  const handleThemeChange = (ev: MediaQueryListEvent | MediaQueryList) => {
    currentButtonTheme = ev.matches ? "dark" : "light";
    applyButtonTheme(currentButtonTheme);
    if (touchController) {
      touchController.updateButtonTheme(currentButtonTheme);
    }
  };

  // sync and listen
  handleThemeChange(mq);
  if (mq.addEventListener) {
    mq.addEventListener(
      "change",
      handleThemeChange as (e: MediaQueryListEvent) => void,
    );
  } else {
    // older browsers
    mq.addListener(handleThemeChange as (e: MediaQueryListEvent) => void);
  }
}

const translations = {
  en: {
    button: "Language",
    interact: "Press 'E' to interact",
    doorNeedKey: "You need a {color} key",
    doorOpen: "Opened {color} door",
    winMessage: "You Win!",
    keyPickup: "Picked up {color} key",
  },
  zh: {
    button: "语言",
    interact: "按 'E' 进行互动",
    doorNeedKey: "你需要一把{color}钥匙",
    doorOpen: "打开了{color}门",
    winMessage: "你赢了！",
    keyPickup: "捡起了{color}钥匙",
  },
  ar: {
    button: "اللغة",
    interact: "اضغط 'E' للتفاعل",
    doorNeedKey: "تحتاج إلى مفتاح {color}",
    doorOpen: "تم فتح باب {color}",
    winMessage: "لقد فزت!",
    keyPickup: "التقطت مفتاح {color}",
  },
};

function updateText(lang: string) {
  const t = translations[lang as keyof typeof translations] || translations.en;
  document.getElementById("langBtn")!.textContent = t.button;
}

// Language change button
document.getElementById("langBtn")!.addEventListener("click", () => {
  const html = document.documentElement;
  if (html.lang === "en") {
    html.lang = "zh";
  } else if (html.lang === "zh") {
    html.lang = "ar";
    html.dir = "rtl";
  } else {
    html.lang = "en";
    html.dir = "ltr";
  }
  updateText(html.lang);
});

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

uniform vec3 uAmbientColor;

void main() {
  // Simple "lighting": base color modulated by ambient theme color
  vec3 litColor = vColor * uAmbientColor;
  outColor = vec4(litColor, 1.0);
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

interface Platform {
  topY: number; // top surface height in world space
}

// Objects with proximity triggers
interface ProximityTrigger {
  triggerRadius: number;
}

interface Interactable extends ProximityTrigger {
  onInteract(): void;
}

interface Collectible extends ProximityTrigger {
  isCollected: boolean;
}

type KeyColor = "red" | "green" | "blue";
interface Key extends Interactable {
  color: KeyColor;
  collect(): void;
}

type DoorColor = "red" | "green" | "blue";
interface Door extends Interactable {
  color: DoorColor;
  isOpen: boolean;
  open(): void;
}

interface WinCondition extends ProximityTrigger {
  completed: boolean;
}

// Persistent Global State
interface GlobalKeyState {
  color: KeyColor;
  collected: boolean;
}

interface GlobalDoorState {
  color: DoorColor;
  isOpen: boolean;
}

const globalState = {
  inventory: {
    held: null as KeyColor | null,
  },
  keys: new Map<string, GlobalKeyState>(),
  doors: new Map<string, GlobalDoorState>(),
};

// Persistent Inventory
const inventory: { held: KeyColor | null } = {
  held: null,
};

// Light and Dark Theme Types
type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (
    globalThis.matchMedia &&
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
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
  interactables = new Map<Entity, Interactable>();
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
  keys?: { id: string; color: KeyColor; pos: [number, number, number] }[];
  doors?: {
    id: string;
    color: DoorColor;
    pos: [number, number, number];
    size: [number, number, number];
  }[];
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
  keys: [{ id: "keyRed1", color: "red", pos: [0, 1, -5] }],
  doors: [],
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
    { pos: [1, 2.0, -2], size: [4, 0.5, 4] },
    { pos: [-4, 4.0, -5], size: [3, 0.5, 3] },
    { pos: [3, 5.0, -9], size: [4, 0.5, 4] },
    { pos: [-3, 8.0, -11], size: [3, 0.5, 3] },
    { pos: [0, 9.0, -12], size: [3, 0.5, 3] },
  ],
  keys: [],
  doors: [
    { id: "doorRed1", color: "red", pos: [-0.5, 3, -2], size: [0.5, 2.5, 3.9] },
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

function onInteract(obj: Key | Door) {
  const t =
    translations[document.documentElement.lang as keyof typeof translations] ||
    translations.en;

  if ("collect" in obj) {
    // Key
    obj.collect();
    inventory.held = obj.color;
    showUIMessage(t.keyPickup.replace("{color}", obj.color), 1.5);
  } else if ("open" in obj) {
    // Door
    if (inventory.held === obj.color) {
      showUIMessage(t.doorOpen.replace("{color}", obj.color), 1.5);
      obj.isOpen = true;
    } else {
      showUIMessage(t.doorNeedKey.replace("{color}", obj.color), 1.5);
    }
  }
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
  keyTriangle: Drawable;
  doorRedCube: Drawable;
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
  ecs.winConditions.set(winE, { completed: false, triggerRadius: 1.0 });

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
    ecs.collectibles.set(cE, { isCollected: false, triggerRadius: 1.0 });
  }

  // ----- Keys -----
  for (const keyData of config.keys ?? []) {
    if (!globalState.keys.has(keyData.id)) {
      globalState.keys.set(keyData.id, {
        color: keyData.color,
        collected: false,
      });
    }

    const keyState = globalState.keys.get(keyData.id)!;
    if (keyState.collected) continue;

    const keyE = ecs.createEntity();
    const t: Transform = {
      position: vec3.fromValues(...keyData.pos),
      rotation: vec3.fromValues(0, 0, 0),
      scale: vec3.fromValues(1, 1, 1),
      matrix: mat4.create(),
    };
    updateTransformMatrix(t);

    ecs.transforms.set(keyE, t);
    ecs.renderables.set(keyE, { drawable: meshes.keyTriangle });

    ecs.interactables.set(keyE, {
      triggerRadius: 1.0,
      color: keyState.color,
      collect() {
        keyState.collected = true;
        globalState.inventory.held = keyState.color;
        const t = translations[
          document.documentElement.lang as keyof typeof translations
        ] || translations.en;
        showUIMessage(t.keyPickup.replace("{color}", keyState.color), 1.5);
        ecs.renderables.delete(keyE);
        ecs.interactables.delete(keyE);
      },
      onInteract() {
        onInteract(this);
      },
    } as Key);
  }

  // ----- Doors -----
  for (const doorData of config.doors ?? []) {
    if (!globalState.doors.has(doorData.id)) {
      globalState.doors.set(doorData.id, {
        color: doorData.color,
        isOpen: false,
      });
    }

    const doorState = globalState.doors.get(doorData.id)!;
    if (doorState.isOpen) continue;

    const doorE = ecs.createEntity();
    const t: Transform = {
      position: vec3.fromValues(...doorData.pos),
      rotation: vec3.fromValues(0, 0, 0),
      scale: vec3.fromValues(...doorData.size),
      matrix: mat4.create(),
    };
    updateTransformMatrix(t);

    ecs.transforms.set(doorE, t);
    ecs.renderables.set(doorE, { drawable: meshes.doorRedCube });

    // --- Add physics ---
    const doorBody = createBoxBody({
      world,
      size: doorData.size,
      pos: doorData.pos,
      move: false, // static
    });
    ecs.physicsBodies.set(doorE, { body: doorBody });

    ecs.interactables.set(doorE, {
      triggerRadius: 2.0,
      color: doorState.color,
      isOpen: doorState.isOpen,
      open() {
        doorState.isOpen = true;
        const t = translations[
          document.documentElement.lang as keyof typeof translations
        ] || translations.en;
        showUIMessage(t.doorOpen.replace("{color}", doorState.color), 1.5);

        // Remove door from ECS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (world as any).removeRigidBody(doorBody);
        ecs.renderables.delete(doorE);
        ecs.physicsBodies.delete(doorE);
        ecs.interactables.delete(doorE);
      },
      onInteract() {
        const t = translations[
          document.documentElement.lang as keyof typeof translations
        ] || translations.en;

        if (inventory.held === this.color && !this.isOpen) {
          this.open();
        } else if (inventory.held !== this.color) {
          showUIMessage(t.doorNeedKey.replace("{color}", this.color), 1.5);
        }
      },
    } as Door);
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

let uiMessage: string | null = null;
let uiTimer = 0;
function showUIMessage(msg: string, duration = 0.5) {
  uiMessage = msg;
  uiTimer = duration;
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

  // Prevent default touch behaviors on canvas
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  touchController = new TouchController(canvas);
  const uiCanvas = document.getElementById("ui") as HTMLCanvasElement;
  const uiCtx = uiCanvas.getContext("2d")!;

  function renderUI(dt: number) {
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    if (uiMessage) {
      uiCtx.font = "20px Arial";
      uiCtx.fillStyle = uiTextColor;
      uiCtx.textAlign = "center";
      uiCtx.fillText(uiMessage, uiCanvas.width / 2, uiCanvas.height - 50);
      uiTimer -= dt;
      if (uiTimer <= 0) {
        uiMessage = null;
      }
    }
  }

  const glctx = new GLContext(canvas);
  const gl = glctx.gl;

  const shader = new Shader(gl, VERT_SRC, FRAG_SRC);
  const uMVP = shader.getUniformLocation("uMVP");
  if (!uMVP) throw new Error("Failed to get uMVP uniform");
  const uAmbientColor = shader.getUniformLocation("uAmbientColor");
  if (!uAmbientColor) throw new Error("Failed to get uAmbientColor uniform");

  // === Theme & Lighting Setup =====
  let currentTheme: Theme = getPreferredTheme();

  function getAmbientThemeColor(theme: Theme): [number, number, number] {
    return theme === "dark"
      ? [0.6, 0.6, 0.7] // Dark theme
      : [1.0, 1.0, 1.0]; // Light theme
  }

  function getClearThemeColor(theme: Theme): [number, number, number, number] {
    return theme === "dark"
      ? [0.1, 0.1, 0.15, 1.0] // Dark theme
      : [0.9, 0.9, 1.0, 1.0]; // Light theme
  }

  function getUIForegroundColor(theme: Theme): string {
    return theme === "dark"
      ? "#ffffff" // Dark theme
      : "#111111"; // Light theme
  }

  let uiTextColor = getUIForegroundColor(currentTheme);

  // React to system theme changes in real-time
  if (globalThis.matchMedia) {
    const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const themeChangeHandler = (e: MediaQueryListEvent) => {
      currentTheme = e.matches ? "dark" : "light";
      uiTextColor = getUIForegroundColor(currentTheme);
    };

    // Initial sync
    themeChangeHandler(mq as unknown as MediaQueryListEvent);

    // Listen for changes
    mq.addEventListener("change", themeChangeHandler);
  }

  function clearWithTheme() {
    const [r, g, b, a] = getClearThemeColor(currentTheme);
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

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

  // Interactables

  const doorRedColors = [
    // front
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    // back
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
  ];

  const doorRedCube = createDrawable(
    gl,
    cubePositions,
    doorRedColors,
    cubeIndices,
    gl.TRIANGLES,
  );

  const keyPositions = [
    0,
    0.5,
    0, // top
    -0.5,
    -0.5,
    0, // bottom left
    0.5,
    -0.5,
    0, // bottom right
  ];

  const keyColors = [
    1,
    0,
    0, // top vertex (red)
    1,
    0,
    0, // bottom left (red)
    1,
    0,
    0, // bottom right (red)
  ];

  const keyIndices = [0, 1, 2];

  const keyTriangle = createDrawable(
    gl,
    keyPositions,
    keyColors,
    keyIndices,
    gl.TRIANGLES,
  );

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
    keyTriangle,
    doorRedCube,
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
    clearWithTheme();

    const playerPhys = ecs.physicsBodies.get(playerEntity);
    if (!playerPhys) return;

    // ---------- INPUT → Physics (movement & jump) ----------
    const body = playerPhys.body;
    const vel = typeof body.getLinearVelocity === "function"
      ? body.getLinearVelocity()
      : body.linearVelocity;
    const touchMovement = touchController?.getMovementVector() ??
      { x: 0, z: 0 };
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

    vx += touchMovement.x * moveSpeed;
    vz += touchMovement.z * moveSpeed;

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
      if (coll.isCollected) continue;
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
      if (!coll.isCollected) {
        allCollected = false;
        break;
      }
    }

    for (const [e, coll] of ecs.collectibles) {
      if (coll.isCollected) continue;
      const t = ecs.transforms.get(e);
      if (!t) continue;
      const dist = vec3.distance(playerPos, t.position);
      if (dist < coll.triggerRadius) {
        coll.isCollected = true;
        console.log("Collectible picked up:", e);
      }
    }

    // ---------- Interactable check (Keys / Doors) ----------
    for (const [e, obj] of ecs.interactables) {
      const t = ecs.transforms.get(e);
      if (!t) continue;

      const dist = vec3.distance(playerPos, t.position);
      if (dist < obj.triggerRadius) {
        if (uiTimer <= 0) {
          const t = translations[
            document.documentElement.lang as keyof typeof translations
          ] || translations["en"];
          showUIMessage(t.interact, 0.5);
        }

        // handle input
        if (Input.wasKeyPressed("KeyE")) {
          obj.onInteract();
        }
      }
    }

    // ---------- Win condition check ----------
    if (allCollected) {
      for (const [e, win] of ecs.winConditions) {
        if (win.completed) continue;
        const t = ecs.transforms.get(e);
        if (!t) continue;
        const dist = vec3.distance(playerPos, t.position);
        if (dist < win.triggerRadius) {
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
    const [ar, ag, ab] = getAmbientThemeColor(currentTheme);
    gl.uniform3f(uAmbientColor, ar, ag, ab);

    // ---------- Render ----------
    for (const [e, rend] of ecs.renderables) {
      const t = ecs.transforms.get(e);
      if (!t) continue;

      const coll = ecs.collectibles.get(e);
      if (coll && coll.isCollected) continue;

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

    // ---------- UI ----------
    renderUI(dt);
    // Edge-triggered input bookkeeping
    Input.update();
  });

  engine.start();
}

bootstrap();
