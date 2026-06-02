# Micro Pool 🎱

Micro Pool is a high-fidelity, interactive 2D pocket billiards simulator built using **React 19, TypeScript 6, Vite 8**, and high-performance **HTML5 Canvas** rendering. It features custom 2D physics computations, dynamic drag-and-shoot cue vector adjustments, and synthesizes retro wood-clack sound effects in real-time using the native browser **Web Audio API**.

---

### 🌐 [Live Deployment Link](https://micro-pool-u4iq.vercel.app/)

---

## Key Features

*   **Custom 2D Elastic Physics Engine:**
    *   **Elastic Collisions:** Momentum and velocity vectors transfer dynamically between balls during contact.
    *   **Cushion Bounces:** Boundary bounces damp energy realistically (restitution coefficients).
    *   **Rolling Deceleration:** Surface friction slows moving balls naturally over time.
    *   **Static Overlap Resolver:** Prevents ball overlaps/sticking on high-speed collisions.
    *   **Circular Pocket Intersections:** Balls sink realistically when their centers cross pocket thresholds, animated with smooth scaling and fading.
*   **Visual Drag & Shoot Guide:**
    *   **Interactive Cue Stick:** Tapered wooden cue stick rotates and pulls back based on mouse drag distance (simulating variable hitting power).
    *   **Aim Path Projector:** A dashed vector guide projects the target path from the cue ball, helping you execute trick shots.
*   **Procedural Sound Synthesis (Web Audio API):**
    *   Generates organic "clacks" (ball-on-ball), "thuds" (cushions), "swishes" (pockets), and "buzzes" (fouls) dynamically on the client without loading external `.mp3` assets.
*   **Multiple Game Modes:**
    *   **Practice (Solo):** Clear all 15 balls in as few shots as possible.
    *   **Local 2-Player (Pass & Play):** Compete head-to-head under standard 8-ball rules.
    *   **VS AI (Single Player):** Challenge a smart AI player that calculates shot paths, checks for obstacles, and aims dynamically.
*   **Visual Customization:**
    *   Tailor your table aesthetic with gorgeous felt designs: Classic Emerald, Championship Sapphire, Midnight Obsidian, or Royal Ruby.
*   **Premium Glassmorphic Interface:**
    *   A responsive sidebar configuration panel, dynamic turn tickers, foul trackers, and a visual tray displaying pocketed balls.

---

## Architecture & Code Structure

The project has been architected to separate layout representation, rendering loops, and physics calculations:

```
src/
├── types/
│   └── index.ts          # Strongly-typed models for Vectors, Balls, Pockets, and GameState
├── styles/
│   ├── variables.css     # CSS Variables for colors, shadows, glows, and glassmorphic designs
│   ├── global.css        # Typography configurations (Outfit & Inter fonts) and base body resets
│   └── App.css           # Styling for layout containers, winner modals, and dashboard elements
├── utils/
│   ├── physics.ts        # Pure 2D vector mathematics, elastic collision swaps, and table collision limits
│   └── audio.ts          # Synthesized AudioContext audio nodes (oscillators, noise generators, filters)
└── components/
    ├── GameCanvas.tsx    # Animation frame render loops, mouse drag events, and vector-based AI opponent logic
    ├── ScoreBoard.tsx    # Glassmorphic score card displaying active player, scores, target badges, and pocketed tray
    └── GameSettings.tsx  # Game controls panel for swapping felt colors, restarting, and selecting game modes
```

---

## 8-Ball Game Rules (Simulated)

1.  **Open Table:** At the beginning of the match, the table is "open". The first player to legally pocket an object ball (other than the 8-ball or cue ball) is assigned that group (Solids 1-7 or Stripes 9-15), and the opponent takes the other.
2.  **Turn Continuation:** Pocketing a ball of your assigned group allows you to keep shooting. Pocketing an opponent's ball or failing to pocket any target ball transfers the turn.
3.  **Foul (Scratch):**
    *   Sinking the white cue ball is a scratch.
    *   Scratching immediately transfers the turn and grants the opponent **Ball-in-Hand** placement (they can place the cue ball anywhere on the table).
4.  **The 8-Ball (Black):**
    *   Once a player pockets all 7 balls of their group, they must pocket the black 8-ball to win the match.
    *   Pocketing the 8-ball early (while target balls remain in your group) results in an **instant loss**.

---

## Local Setup & Development

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
*   npm (v9.0.0 or higher)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/kushalk118/Micro-pool.git
    cd Micro-pool
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the local dev server:
    ```bash
    npm run dev
    ```
4.  Compile and build the production bundle:
    ```bash
    npm run build
    ```

---

## Continuous Deployment

This repository uses **GitHub Actions** (`.github/workflows/deploy.yml`) to automatically compile and publish the project to GitHub Pages. Every commit pushed to the `main` or `master` branch triggers the builder:

1.  Checks out code.
2.  Installs dependencies.
3.  Runs `npm run build` with the Vite asset prefix base path configuration.
4.  Deploys the static folder to **GitHub Pages**.
