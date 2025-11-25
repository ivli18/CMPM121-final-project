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

### 2. Use a third-party 3D rendering library.

### 3. Use a third-party physics simulation library.

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
