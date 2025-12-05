## Introducing the team

### Engine Lead: Bryce

Bryce is leading our technical architecture, researching engine options, and guiding how we structure our codebase. He’ll help the team get up to speed with whatever platform we choose and aim to shield us from unnecessary complexity. He’ll also define and maintain the project’s core subsystems—like rendering, input, and asset pipelines—so the rest of the team can build features on a stable and consistent foundation.

### Design Lead: Shawn

Shawn is driving the creative vision — shaping the game’s look, feel, and player experience. He’ll be prototyping visual ideas and helping align our code and assets around a cohesive design language.

### Tools & Testing Lead: Ivan

Ivan is overseeing our development tooling (like Git, GitHub, and editor setup), ensuring smooth collaboration. He’ll also lead testing efforts — both automated checks and organizing playtests — to keep quality high.

Since we’re a small team, we’ll stay flexible: everyone will contribute ideas across domains and support each other wherever needed.

## Tools and materials

### Engine

We’re starting with the **baseline web browser platform**, using **WebGL** directly for rendering. This choice best aligns with F1’s requirement that we avoid engines with built-in high-level 3D rendering and physics systems. Since we’ve been working with WebGL throughout the course (e.g., in Dx assignments), we already have foundational familiarity, which reduces initial ramp-up time. It also gives us full control to implement core game development patterns—like rendering pipelines, scene management, and later physics—from scratch.

🔗 [WebGL on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

### Language

Our primary language will be **TypeScript**, with JavaScript modules where needed. TypeScript’s type safety improves code clarity and maintainability, especially in a team setting. For data representation, we’ll use **JSON** to configure game assets like levels, UI layouts, or entity properties. This combination integrates smoothly with Deno and Vite, supports modern tooling (like LSP and autocomplete), and fits naturally within browser-based workflows.

🔗 [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

We’ll use **GitHub** for version control and collaboration, with **VS Code** as our main IDE (or GitHub Codespaces for consistent environments). For 2D art, we’re planning to use **Krita** and **Pixelorama**—both accessible, open-source tools well-suited for pixel and concept art. If 3D assets are needed, **Blender** is our likely choice due to its flexibility, strong community, and widespread use in indie development. We’ll organize code using Vite’s module system and rely on Deno for tooling scripts when appropriate.

🔗 [VS Code](https://code.visualstudio.com/) | [Krita](https://krita.org/) | [Pixelorama](https://orama-interactive.itch.io/pixelorama) | [Blender](https://www.blender.org/)

### Generative AI

We plan to use generative AI tools—like GitHub Copilot—as **optional assistants** for code completion and idea exploration, but not as autonomous agents making unreviewed changes. Use will be opt-in per team member, and all generated code will be treated as untrusted until reviewed. Our focus remains on understanding every part of the system we build, so we’ll lean on AI for boilerplate or clarity, not complex logic or architecture decisions.

## Outlook

We’re not trying to build anything super technical—our focus is more on the game’s design and making sure it feels fun and intuitive. We think keeping things simple helps us stay on track and actually finish what we start.

Right now, the hardest part is probably going to be scope and timing. We don’t have every detail locked down yet, and since we’re a new team, we’re still figuring out how to work together smoothly. We’re using GitHub to help, but we know it’ll take some practice to get everyone on the same page.

As for learning, we’re hoping to get more comfortable with DOM manipulation in TypeScript—building things in code instead of just writing HTML. And honestly, just learning how to collaborate better as a team is a big part of why we’re doing this.

---

## F1 Devlog

## How we satisfied the software requirements

### 1. Build using a platform that does not already provide support for 3D rendering and physics simulation.

For this project, We intentionally chose to develop on the web platform using raw WebGL 2.0, which provides only low-level GPU access and no built-in 3D rendering pipeline or physics simulation. This decision forced us to understand the complete 3D pipeline—buffers, VAOs, shaders, matrix transforms, and camera math—without relying on a higher-level engine.

### 2. Use a third-party 3D rendering library.

While the rendering is done with WebGL directly, the project uses gl-matrix, a widely used third-party math and matrix library for JavaScript/TypeScript 3D applications.

gl-matrix provides fast, SIMD-optimized functions for:

- mat4 transformation matrices
- vec3 vector operations
- matrix composition (translation, rotation, scale)
- camera calculations (e.g., mat4.lookAt, mat4.perspective)

Because WebGL does not provide any matrix utilities out of the box, gl-matrix serves as the third-party rendering support library required by the assignment.

### 3. Use a third-party physics simulation library.

Right now we are using manual collisions but plan on implementing Oimo.js which handles collision detection, rigid body behavior, and movement resolution.It fits the scope of the project because our current world is made of cubes, grids, and simple geometric obstacles—exactly the domain Oimo.js excels at.

### 4. Present a playable prototype with a simple physics-based puzzle.

The prototype is playable (the player can use the arrow keys to move their character), and the current version of the puzzle is more of a demonstration of the mechanics, navigating the player character to pick up the collectables before reaching the pyramid.

### 5. Allow the player to exert control over the simulation to succeed or fail at the puzzle.

The player exerts control over the outcome of the puzzle, as player input is the only way to progress toward pikcing up the required collectables and reaching the pyramid.

### 6. Detect success or failure and report it back to the player using the game's graphics.

The win condition requires the player to pick up all the collectables before collecting the pyramid, which informs the player that they have won and also shows this feedback graphiclly by collecting the pyramid.

### 7. Include before-commit automation that helps developers.

The codebase includes basic checks for both linting and autoformatting using ESLint and Prettier, respectively. The package.json defines the scripts that run these checks, and a Husky pre-commit hook ensures they execute automatically before any commit. This setup blocks commits that fail the checks, satisfying the requirement for before-commit automation.

### 8. Include post-push automation that helps developers.

For post-push automation, the project includes an automated deployment workflow and a basic Playwright setup. GitHub Pages automatically rebuilds and deploys the project whenever changes are pushed, keeping the live version consistently updated. In addition, we currently have Playwright scripts that can generate screenshots and run simple interaction sequences, demonstrating that our codebase supports automated post-push checks even if these scripts remain minimal at this stage.

## Reflection

I think the biggest change we plan on making in the future is how we distribute work. The roles we have picked out are helpful, but there is a lot to do outside of those areas, and they often required a volunteer to step up to make sure they got done. Something we are considering is breaking down everything that needs to be done before the next milestone right away and tasking them based on the our roles and intuitive order the tasks should be done in. Otherwise, I think our team is on track.

---

## F2 Devlog

## How we satisfied the software requirements

### 1. The game uses the same 3D rendering and physics simulation identified by the team for F1 or suitable replacements that still satisfy the F1 requirements.

The 3D rendering and physics simulation still fulfill the F1 requirements and function properly, primarily using OIMO for the physics handling.

### 2. The game must allow the player to move between scenes (e.g. rooms)

There exist two rooms/scenes within the game and it is currently set up to transition to the second scene when the objective is met in the first room. It will also be mentioned later but player based values can be transferred between scenes (and more added in if necessary), and this is primarily important for allowing various things to carry over between scenes.

### 3. The game must allow the player to select specific objects in a scene for interaction

There exists two objects, a door and a key, that can each be interacted with using the 'e' key. When within range of interaction, a text prompt appears to show that the object is interactable, and in the case of doors, they can also provide feedback depending on a successful or failed interaction. The Key object can be picked up and stored in an inventory.

### 4. The game maintains an inventory system allowing the player to carry objects so that what happens in one scene has an impact on what is possible in another scene.

The inventory allows players to hold keys (currently only one), and they are transferable between scenes and can be used for interaction in other scenes via doors. In our current implementation, there exists a Key in the first scene which is necessary to open a Door in the second scene that blocks the path to the goal.

### 5. The game contains at least one physics-based puzzle that is relevant to the player's progress in the game.

An addition to the platforming is a door/wall structure that can be removed/opened if the player has the correct type of key. It is also set up to be color coded, meaning that each unique color of door could only be opened by its respective colored key, but this is not currently utilized much in the actual game.

### 6. The player can succeed or fail at the physics-based puzzle on the basis of their skill and/or reasoning (rather than luck).

The final goal of the puzzle is blocked by a color door, which requires the player to have a specific colored key to open. Without the key, the platforming to the final goal would not be possible, so if they lack a key they either fail or reset.

### 7. Via play, the game can reach at least one conclusive ending.

The final end goal of the game is located at the end of the second scene after all the platforming, and the conclusive ending is victory.

## Reflection

There are some potential issues with how we decided to approach the requirements for F1, mainly being the ambiguity of the definition of a puzzle. Another case of this is with the interactables, which are functional as standalone features, but do not interact with other features. This can all be resolved if necessary, but it depends how we would want to approach it.

---

## F3 Devlog

## Selected requirements

### 1. Language Support (i18n + l10n)

We chose this requirement because it seemed like a simple little challenge to implement, easy enough to implement but also a bit tricky to get fully and properly functional.

### 2. Visual Themes

Changing the theme of the game seemed simple enough with how we handle the graphics side of things, and having it adapt to the host environment didn't seem too difficult either.

### 3. Touchscreen

Implementing a touchscreen sounded simple enough, especially since we already worked with a bit of mobile/touch controls with the D3 assignment.

### 4. abc

xyz

## How we satisfied the software requirements

### 1. Language Support (i18n + l10n)

Language swapping was implemented via a UI button that can be clicked to cycle through the three different languages. This is done using a translation table that provides the text for whichever language it's currently set to, which is most likely the simplest way for a project of this scope. The right to left script was also just a very simple formatting adjustment which gets updated as the languages cycle.

### 2. Visual Themes

We first query the host environment's visual preferences, which we use to adjust the game's visual mappings to match the mode. This affects not only UI elements but also in-game objects and environments, including lighting, textures, and ambiance. All changes are applied on load, based on the polled preference, so the visuals get updated immediately.

### 3. Touchscreen

The game listens for both mouse and touch events on the canvas, and touch input is basically treated as a click at the same spot, so tapping works just like clicking. We use a simple button layout for all inputs, which keeps the UI consistent between desktop and mobile.

### 4. abc

## Reflection

Not much of the design has been changed in F2, so some of the same concerns still persist, but can be worked around a bit easier thanks to some of the additions made in F2. The features implemented in F2 served well as resources for altering the game, but that still means that said alterations needed to be implemented, which is just some simple design.
