<![CDATA[
CrowdControl
🚨 Anti-Stampede Prediction & Prevention System
   
A real-time crowd dynamics simulation built on a nonlinear degenerate advection-diffusion model — predicting and preventing stampede risk before it happens.
Launch Demo · Read the Paper · View Results

📌 Objective
Mass gatherings — festivals, stadiums, pilgrimages, concerts — remain some of the most dangerous environments on Earth. The Mina stampede (2015) killed over 2,400 people. The Love Parade disaster (2010) claimed 21 lives. The Itaewon crowd crush (2022) took 159.
These weren't random. They were predictable.
CrowdControl is an infrastructure-level stampede prevention system that simulates crowd dynamics using a nonlinear PDE-based model, identifies dangerous density buildups in real time, deploys autonomous AI-driven structural interventions, and provides actionable mitigation strategies — all before a stampede ever begins.
Goal: Shift crowd safety from reactive response to predictive prevention.

🔭 Project Overview
CrowdControl is a full-stack simulation platform implementing a closed-loop control system for crowd flow management:
Layer	Description
PDE Solver	A finite-volume upwind scheme solving nonlinear advection-diffusion with density-dependent mobility, sigmoidal pressure activation, and sub-stepping for CFL stability
Direction Field	Harmonic potential solver (Jacobi iteration on Laplace's equation) + BFS shortest-path to compute crowd navigation fields toward exits
Risk Assessment	A multi-factor risk functional combining density, exit proximity, velocity stagnation, pressure buildup, and social camaraderie
AI Mitigation Engine	Closed-loop control: detect compression/stagnation → score hazards → calculate structural interventions → validate placement with BFS reachability → re-solve direction field
Interactive Dashboard	React-based real-time visualization with canvas heatmaps, live telemetry charts, alert feeds, and an interactive layout builder
Batch Analysis Pipeline	Headless simulation runner generating publication-quality CSV reports, JSON metrics, and PNG figures

The Feedback Loop
This isn't a one-shot simulator. CrowdControl implements a true closed-loop control system:
Density → Risk → Hazard Detection → Intervention Calculation → Cell Grid Mutation
    ↑                                                                    │
    └──────── Direction Field Re-solve ◄─────────────────────────────────┘
Every 40 simulation steps, the AI mitigation engine scans for dangerous zones, computes structural interventions (guide walls, deflectors, metering gates), validates that they won't create dead-ends or block escape routes (full BFS reachability test), and then re-solves the entire navigation potential field — creating a dynamic, adaptive response to evolving crowd conditions.

🧮 The Math
The Core Problem
Crowd motion is inherently nonlinear. At low densities, people move freely. As density increases, mobility drops. Past a critical threshold, pressure waves propagate through the crowd — and that's when crushes happen.
Linear and purely diffusive models can't capture this phase transition from free flow to congested instability. CrowdControl uses a nonlinear degenerate advection-diffusion equation to model this.

1. Direction Field — Harmonic Potential Solver
Before simulating density, we need to know where people want to go. CrowdControl solves Laplace's equation to compute a smooth potential field that guides crowd flow toward exits:
$$\nabla^2 \varphi = 0$$
    • Boundary conditions: φ = 0 at EXIT cells (Dirichlet), ∂φ/∂n = 0 at walls (Neumann)
    • Solver: Jacobi/Gauss-Seidel iteration (up to 1200 iterations, convergence at maxΔ < 1e-8)
The velocity field is then extracted as the negative normalized gradient:
$$\mathbf{v}_{\text{base}} = -\frac{\nabla \varphi}{|\nabla \varphi|}$$
A complementary multi-source BFS from all exit cells computes shortest-path distances, used later in the risk functional.

2. Density Evolution PDE
The crowd density field ρ(x, t) evolves according to a nonlinear degenerate advection-diffusion equation. Each timestep integrates three flux terms:
$$\rho^{n+1} = \rho^n + \Delta t \left( \text{Advection} + \text{Diffusion} + \text{Compression} \right)$$
Advection (Upwind Scheme)
Crowd transport by the velocity field using first-order upwind differencing for numerical stability:
$$F_{\text{face}} = \begin{cases} \rho_{\text{upwind}} \cdot v_{\text{face}} & \text{if } v_{\text{face}} \geq 0 \ \rho_{\text{downwind}} \cdot v_{\text{face}} & \text{otherwise} \end{cases}$$
$$\text{Advection} = -\left(F_{\text{east}} - F_{\text{west}} + F_{\text{south}} - F_{\text{north}}\right)$$
Density-Dependent Mobility
People can't move freely in a packed crowd. Velocity is modulated by a mobility function that degrades as density approaches the physical maximum:
$$\mu(\rho) = \max!\left(0,; 1 - \frac{\rho}{\rho_{\max}}\right)^{!\beta}$$
$$\mathbf{v} = \mathbf{v}{\text{base}} \cdot \mu(\rho) \cdot \kappa{\text{push}}$$
Parameter	Default	Meaning
ρ_max	8.0 persons/m²	Physical maximum packing density
β	2.0	Velocity exponent (higher = sharper mobility cutoff)
κ_push	1.5	Velocity scaling factor

This is the "degenerate" part — when ρ → ρ_max, mobility → 0, and the PDE degenerates. This is precisely what happens in real crushes.
Diffusion (Discrete Laplacian)
Random crowd spreading modeled with the standard 4-neighbor Laplacian stencil:
$$\text{Diffusion} = D \left(\sum_{\text{neighbors}} \rho_k - 4\rho_{\text{center}}\right)$$
Out-of-bounds and blocked neighbors use the center value (Neumann boundary condition).
Nonlinear Pressure Law
As density approaches the critical threshold, a sigmoidal activation function switches on pressure-driven repulsion:
$$\sigma(\rho) = \frac{1}{1 + e^{-a(\rho - \rho_{\text{crit}})}}$$
$$P(\rho) = k \cdot \left(\frac{\rho}{\rho_{\text{crit}}}\right)^n \cdot \sigma(\rho)$$
The compression flux uses the same upwind structure as advection but with −∇P as the velocity:
$$\text{Compression} = -\left(P_{\text{east}} - P_{\text{west}} + P_{\text{south}} - P_{\text{north}}\right)$$
Parameter	Default	Meaning
ρ_crit	4.0 persons/m²	Critical density (danger threshold)
k	1.0	Pressure coefficient
n	3.0	Pressure exponent
a	5.0	Sigmoid steepness (sharper = more abrupt activation)
D	0.02	Diffusion coefficient

CFL-Stable Sub-Stepping
To maintain numerical stability, the solver employs adaptive sub-stepping:
$$\Delta t_{\text{stable}} = \min(\Delta t, 0.01), \quad N_{\text{sub}} = \lceil \Delta t / \Delta t_{\text{stable}} \rceil$$
Ping-pong scratch buffers are used for intermediate sub-steps.

3. Multi-Factor Risk Functional
CrowdControl doesn't just track density — it evaluates a multi-factor risk functional at every cell combining five distinct hazard signals:
$$R(x,t) = \text{clamp}{[0,1]}!\left[; \alpha \cdot \frac{\rho}{\rho{\max}} ;+; \delta \cdot \frac{1}{d + \varepsilon} ;+; \gamma \cdot \frac{1}{|\mathbf{v}| + \varepsilon} ;+; \eta \cdot \Psi(\rho) ;-; c(x,t) ;\right]$$
Term	Weight	What It Captures
Density — α · (ρ/ρ_max)	0.5	How packed the area is (normalized to max)
Exit proximity — δ · 1/(d + ε)	0.1	Inverse distance to nearest exit (congestion near exits)
Stagnation — γ · 1/(	v	+ ε)
Pressure/Psi — η · Ψ(ρ)	0.3	Super-critical compression penalty
Camaraderie — c(x,t)	subtractive	Social cohesion (reduces risk)

*γ defaults to 0.0 but is available for tuning
Pressure Penalty (Ψ)
Activates only when density exceeds the critical threshold:
$$\Psi(\rho) = \begin{cases} \left(\frac{\rho - \rho_{\text{crit}}}{\rho_{\max}}\right)^2 & \text{if } \rho \geq \rho_{\text{crit}} \ 0 & \text{otherwise} \end{cases}$$
Camaraderie Term (c)
Social cohesion reduces risk — groups look out for each other. But this effect diminishes as crowding increases:
$$c(x,t) = \frac{G}{N_{\text{local}}} \cdot (1 - I) \cdot \left(1 - \frac{\rho}{\rho_{\max}}\right)^m$$
Parameter	Default	Meaning
G	0.5	Group cohesion strength
I	0.2	Individual independence factor
m	2.0	Crowding degradation exponent
N_local	—	Count of non-blocked cells in 3×3 neighborhood


4. Hazard Detection — Composite Danger Score
The analytics engine scans the grid with a sliding 5×5 window, computing a composite danger score:
$$S_{\text{danger}} = 0.45 \cdot S_{\text{density}} + 0.25 \cdot S_{\text{compression}} + 0.20 \cdot S_{\text{stagnation}} + 0.10 \cdot S_{\text{pressure}}$$
A cell is flagged as dangerous when S_danger > 0.6 and at least one individual factor exceeds its threshold.

🏗️ Code Architecture
crowd-sim/
├── src/
│   ├── backend/engine/           # ← Simulation Core
│   │   ├── types.ts              # CellType enum, SimParams, SimulatorState, HazardAlert
│   │   ├── density.ts            # stepDensityV3() — PDE solver + computeRiskV3() — risk functional
│   │   ├── solver.ts             # Laplace equation solver + BFS distance field
│   │   ├── simulator.ts          # CrowdSimulator class — orchestrates the simulation loop
│   │   ├── analytics.ts          # detectHazards() — sliding window danger scoring
│   │   ├── mitigation.ts         # Closed-loop intervention system (974 lines)
│   │   ├── metrics.ts            # Headless runner + comprehensive metrics collection
│   │   ├── colormap.ts           # Bilinear upsampling + Gaussian blur + spectral color mapping
│   │   ├── scenarios.ts          # Festival Bottleneck & Stadium Rush configurations
│   │   ├── density.invariants.test.ts  # Property-based tests (mass conservation, bounds, symmetry)
│   │   └── risk.test.ts          # Risk computation unit tests
│   │
│   ├── frontend/                 # ← React Dashboard
│   │   ├── App.tsx               # Root component — simulation state + canvas rendering + event caching
│   │   ├── main.tsx              # React 19 entry point
│   │   ├── components/
│   │   │   ├── Hero.tsx                  # Landing page with CTA
│   │   │   ├── FormulaShowcase.tsx       # KaTeX math formula cards
│   │   │   ├── Header.tsx               # Fixed navigation bar
│   │   │   ├── Sidebar.tsx              # Configuration panel (20+ parameters)
│   │   │   ├── SimulationCanvas.tsx      # Canvas wrapper with status indicators
│   │   │   ├── AnalyticsCards.tsx        # 6 real-time metric cards
│   │   │   ├── LiveTelemetryCharts.tsx   # 4 pure-SVG time-series charts
│   │   │   ├── AlertsPanel.tsx          # Severity-coded threat log
│   │   │   ├── FloatingPlaybackDock.tsx  # Floating toolbar controls
│   │   │   ├── ControlPanel.tsx         # Play/Pause/Reset + step counter
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── utils/
│   │   │   ├── gsapAnimations.ts         # Page transitions + magnetic hover + button ripples
│   │   │   ├── mockData.ts              # LaTeX formulas + demo data
│   │   │   └── simulationEventCache.ts   # Ring buffer + last-value cache (React perf)
│   │   ├── index.css             # Design system (glassmorphism, animations, tokens)
│   │   ├── dashboard-theme.css   # Dashboard color tokens & layout
│   │   └── settings.json        # CSS lint config
│   │
│   └── shared/
│       └── simParams.ts          # Default physics parameters (shared between FE/BE)
│
├── scripts/
│   ├── generate-results.ts       # Batch runner → CSV, JSON, PNG
│   ├── compare-overshoot.ts      # Numerical stability benchmark (multi-dt comparison)
│   └── inspect-overshoot.ts      # Single-run diagnostic probe
│
├── results/                      # Generated simulation outputs
│   ├── figures/                  # 14 PNG heatmaps & charts
│   ├── results.csv               # Aggregate metrics per scenario
│   ├── summary-table.md          # Markdown results table
│   └── simulation-metrics.json   # Full time-series data (5.7 MB)
│
└── public/                       # Static assets (favicon, icons)
How the Simulation Runs
                                    ┌─────────────────────────┐
                                    │    Scenario Builder      │
                                    │  (scenarios.ts)          │
                                    │  → cell grid, entries,   │
                                    │    exits, obstacles      │
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │   Harmonic Potential     │
                                    │   Solver (solver.ts)     │
                                    │  → ∇²φ = 0 (Jacobi)     │
                                    │  → v = -∇φ/|∇φ|         │
                                    │  → BFS distance field    │
                                    └────────────┬────────────┘
                                                 │
                            ┌────────────────────▼────────────────────┐
                            │        CrowdSimulator (simulator.ts)    │
                            │  ┌─────────────────────────────────┐    │
                            │  │  Every step (×8 inner substeps) │    │
                            │  │  ├─ stepDensityV3()             │    │
                            │  │  │   ├─ Upwind advection        │    │
                            │  │  │   ├─ Laplacian diffusion     │    │
                            │  │  │   ├─ Pressure compression    │    │
                            │  │  │   └─ Entry/exit handling     │    │
                            │  │  └─ computeRiskV3()             │    │
                            │  └─────────────────────────────────┘    │
                            │                                         │
                            │  ┌─ Every 20 steps ─────────────────┐   │
                            │  │  detectHazards() → Alert merging │   │
                            │  └──────────────────────────────────┘   │
                            │                                         │
                            │  ┌─ Every 40 steps (if AI enabled) ─┐   │
                            │  │  detectMitigationHazards()        │   │
                            │  │  calculateIntervention()          │   │
                            │  │  applyInterventions()             │   │
                            │  │  RE-SOLVE direction field ←──────┼───┘
                            │  └──────────────────────────────────┘
                            └────────────────────┬────────────────────┘
                                                 │
                            ┌────────────────────▼────────────────────┐
                            │          Frontend (App.tsx)              │
                            │  ├─ Canvas rendering (heatmaps)         │
                            │  ├─ Event cache → batch React updates   │
                            │  ├─ LiveTelemetryCharts (SVG)           │
                            │  └─ AlertsPanel + AnalyticsCards        │
                            └─────────────────────────────────────────┘
Performance Architecture
The simulation runs on the main thread using requestAnimationFrame, but React state updates are decoupled from the simulation loop:
Mechanism	Purpose
SimulationEventCache	Circular ring buffer (2400 events max) that batches telemetry points, flushing to React state every 100ms
SimulationLatestValueCache	Last-write-wins cache for step counter + alerts, preventing render thrashing
WeakMap buffer caching	Scratch Float64Arrays cached per density array to avoid per-frame allocation
Off-screen background canvas	10,000×10,000px pre-rendered cell layout composited under the live heatmap
Bilinear upsampling + Gaussian blur	Grid data smoothly interpolated to canvas resolution for fluid visuals

Result: React re-renders ~10 times/second regardless of simulation tick rate, keeping the UI responsive at 60+ fps.

🧪 Pre-Built Scenarios
Festival Bottleneck
Models a crowd funneled through a narrow passage between two obstacle walls — inspired by the Love Parade 2010 disaster.
    • 100×100 grid with outer boundary walls
    • Central vertical dividing wall with a bottleneck gap at rows 42%–58%
    • Entry zone on the left side, exit zone on the right
    • Obstacle pillar near the exit to create additional turbulence
Stadium Rush
Models converging crowd flows toward a central exit — inspired by the Hillsborough 1989 disaster.
    • 100×100 grid with outer boundary walls
    • Two horizontal barriers at rows 33% and 67% with central gaps
    • 6 distributed entry points around the perimeter
    • Single central exit corridor

🛡️ AI Mitigation Engine
CrowdControl isn't just a simulator — it's a closed-loop control system. When enabled, the AI mitigation engine autonomously deploys structural interventions:
Detection
The engine scans for hazards using statistical thresholds:
densityFloor = max(ρ_crit × 0.45,  meanDensity + stdDensity × 0.35,  ρ_max × 0.12)

severity = localRisk × 0.48 + densityScore × 0.34 + pressureScore × 0.12 + stagnationScore × 0.06
Intervention Strategies
Strategy	What It Does	How It Works
🔀 Metering Gate	Small diagonal guide upstream	1-step forward, ±1 orthogonal span — gently redirects flow
🚧 Deflector Line	Linear wall perpendicular to flow	Length proportional to aggression parameter — breaks up dangerous convergence
↔️ Side Guide	Lateral flow redirector	Deploys when density > 70% and responsiveness ≥ 1.2

Validation
Every proposed intervention is rigorously validated:
    • ✅ Cell must be EMPTY
    • ✅ Not too close to exits or entries (Chebyshev distance check)
    • ✅ Won't create ≥3 blocked cardinal neighbors (prevents dead-ends)
    • ✅ Won't form 2×2 solid blocks
    • ✅ Full BFS reachability test — verifies all entries remain reachable from exits
After placement, the entire direction field is re-solved (Laplace + BFS), adapting crowd navigation to the new geometry.

⚙️ Tech Stack
Core
Technology	Version	Purpose
TypeScript	5.5	Type-safe language for both engine and frontend
React	19	UI component framework
Vite	5	Build tool and dev server
Node.js	≥ 18	Runtime

Frontend Libraries
Library	Purpose
Framer Motion	Component animations & transitions
GSAP	Page transitions, magnetic hover, button ripples
KaTeX / react-katex	LaTeX math formula rendering
Zustand	Lightweight state management
Lucide React	Icon library
TailwindCSS 3.4	Utility-first CSS framework

Development & Tooling
Tool	Purpose
ESLint 10	Code linting with React hooks & refresh plugins
PostCSS + Autoprefixer	CSS processing
tsx	TypeScript execution for CLI scripts
@napi-rs/canvas	Server-side PNG rendering for batch results
Node.js Test Runner	Built-in unit & invariant testing

Design System
Element	Details
Fonts	Inter (body), Space Grotesk (display), JetBrains Mono (code)
Theme	Dark mode — near-black backgrounds (#020203), glassmorphism with backdrop-blur(24px), cursor-following spotlight effects
Color Palette	Custom hazard scale: 🟢 Low → 🟡 Mid → 🟠 High → 🔴 Critical
Animations	GSAP entrance sequences, magnetic hover on buttons, click ripple effects, GSAP-tweened counter labels
Accessibility	prefers-reduced-motion support, aria-label on interactive elements


🚀 Getting Started
Prerequisites
    • Node.js ≥ 18
    • npm ≥ 9
Installation
# Clone the repository
git clone https://github.com/CtrlAltYash/CrowdControl.git
cd CrowdControl/crowd-sim

# Install dependencies
npm install
Running the Development Server
npm run dev
Open http://localhost:5173 in your browser. You'll see a landing page — click "Launch Simulation" to enter the interactive dashboard.
Building for Production
npm run build
npm run preview
Running Tests
npm test
Runs property-based invariant tests (mass conservation, density bounds, determinism, symmetry) and risk computation unit tests using Node.js built-in test runner.
Generating Batch Results
npm run generate:results
Runs all scenarios headlessly and outputs to results/:
    • results.csv — Aggregate metrics per scenario
    • summary-table.md — Markdown formatted results
    • simulation-metrics.json — Full time-series data
    • figures/*.png — 14 publication-quality heatmaps and charts
Linting
npm run lint

📊 Simulation Results
Results from the batch analysis pipeline (15,000 timesteps per scenario):
Scenario	Peak Density	Peak Risk	High-Risk Area %	Avg Velocity	Runtime
Festival Bottleneck	4.18 persons/m²	1.000	0.88%	1.343 m/s	41.9s
Stadium Rush	3.84 persons/m²	1.000	0.23%	1.410 m/s	42.8s

Note: A peak risk of 1.000 validates that the model successfully captures conditions where stampede risk reaches maximum — the critical density transition is working.
Generated Figures
The batch pipeline generates 7 figures per scenario (14 total):
Figure	Description
Initial Density Heatmap	Crowd distribution at t=0
Final Density Heatmap	Crowd distribution at t=150s
Risk Heatmap	Spatial risk distribution at peak danger
Velocity Magnitude Map	Speed distribution across the grid
Peak Density vs Time	Temporal evolution of maximum density
Mean Risk vs Time	Risk trend over the full simulation
High-Risk Area vs Time	Growth and decay of danger zones


🧩 Key Design Decisions
Decision	Rationale
Flat typed arrays	Float64Array and Uint8Array for all grid data instead of nested arrays — cache-friendly, zero GC pressure, 2-5× faster iteration
Upwind advection scheme	Prevents numerical oscillations that plague central-difference advection in convection-dominated flows
Sigmoidal pressure activation	More physically realistic than a hard threshold — pressure ramps up smoothly as density approaches ρ_crit
8 inner sub-steps per frame	Temporal refinement for physics accuracy while keeping rendering at display refresh rate
Ring buffer event cache	Decouples simulation tick rate from React re-render rate — UI stays at ~10Hz while physics runs at 60+ fps
Direction field re-solve on intervention	Ensures crowd navigation adapts to new geometry after AI places structural barriers
BFS reachability validation	Every proposed intervention is checked to ensure it doesn't trap people or block escape routes
Canvas pixel rendering	Direct ImageData manipulation with bilinear upsampling + Gaussian blur — faster than SVG/DOM for 10,000-cell heatmaps


🔬 Testing Philosophy
CrowdControl uses property-based invariant testing — testing physical properties rather than specific values:
Invariant	What It Verifies
Mass Conservation	Total crowd mass is conserved (within 1e-10 relative tolerance) in a closed system
Density Bounds	ρ stays in [0, ρ_max] at every cell, every timestep (tolerance 1e-12)
Obstacle Enforcement	Density remains exactly 0 at wall cells
Pressure Diffusion	A density spike with only pressure active must decrease at center, increase at neighbors
Determinism	Two identical runs produce bitwise-identical results
Symmetry	Symmetric initial conditions produce symmetric evolution
Risk Monotonicity	Risk increases with density, decreases with speed, responds correctly to distance


📚 References
    • Research Paper: A Nonlinear Degenerate Advection-Diffusion Model for Crowd Instability and Stampede Risk Prediction — The mathematical foundation for this project.
    • Helbing, D., Johansson, A., & Al-Abideen, H. Z. (2007). Dynamics of crowd disasters: An empirical study. Physical Review E.
    • Hughes, R. L. (2003). The flow of human crowds. Annual Review of Fluid Mechanics.
    • Bellomo, N., & Dogbe, C. (2011). On the modeling of traffic and crowds: A survey of models, speculations, and perspectives. SIAM Review.

🤝 Contributing
Contributions are welcome! Here's how:
    1. Fork the repository
    2. Create a feature branch (git checkout -b feature/your-feature)
    3. Commit your changes (git commit -m 'Add your feature')
    4. Push to the branch (git push origin feature/your-feature)
    5. Open a Pull Request
Please make sure all tests pass (npm test) and code is linted (npm run lint) before submitting.

📝 License
This project is open source and available under the MIT License.

Built with ❤️ and differential equations.
Because crowds are predictable — and stampedes are preventable.
]]> 