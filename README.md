# fathannasrullah.github.io

Personal portfolio of Fathan Nasrullah, live at <https://fathannasrullah.github.io/>.

The landing page is one interactive scene, **Event Horizon**. A black hole bends the
starfield, the dot lattice and the name behind it through a WebGL gravitational-lens
shader. Four moons orbit it and act as the navigation: Projects, Career, How I work
and Contact.

## Interactions

| Input | Desktop | Phone |
| --- | --- | --- |
| Change the viewing angle (above, below, left, right) | Move the mouse | Tilt the phone |
| Move the black hole | Drag it | Drag it |
| Fly the ship | `WASD` / arrow keys | Hold a finger where it should go |
| Open a section | Click a moon or the top index, or fly the ship into a moon | Tap a moon or the top index |
| Gravitational wave | Press `G`, or wiggle the mouse left-right fast | Shake the phone |
| Close a panel | `Esc`, the close button, or a click outside | Close button or a tap outside |

If the ship falls into the hole, Contact opens with a note that the signal was lost.

Some phones never report their sensors, for example inside a sandboxed frame. On those,
a **view ↻** button cycles through set camera angles and a **shake** button sets off
the wave. iOS only reports tilt and motion after the visitor allows it, so there the
first button reads **enable tilt** and asks for that permission.

## Getting started

Requires Node 22 (the version CI uses).

```bash
npm install
npm run dev      # dev server with HMR
npm test         # unit tests (node:test, no extra dependencies)
npm run lint     # ESLint, zero warnings allowed
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Editing content

All text lives in [`src/utils/dummy.js`](src/utils/dummy.js):

- `about`: first name, last name and the one-line tagline under the name.
- `career`: newest first. `now: true` marks the current role, which also fills the eyebrow line above the name.
- `skills`: groups shown in the How I work marquee.
- `projects.commercial` / `projects.personal`: each project has a thumbnail.
  - `img` takes a real screenshot imported from `src/assets/images/`.
  - `thumb` names a drawn illustration instead: `cmms`, `qms` or `volcano` (see `thumbArt` in `Panels.jsx`), with `tone` set to `cyan` or `violet`.
  - A project with no `demo` URL renders as an "internal" row, not a link.

The moons themselves (labels, orbit sizes, colours) are defined in `MOONS` in
[`physics.js`](src/components/EventHorizon/physics.js).

## Project structure

```
src/
├── App.jsx
├── index.css                     design tokens: colours, type, radius, motion, elevation
├── utils/dummy.js                site content
└── components/EventHorizon/
    ├── EventHorizon.jsx          markup, panel dock, focus trap, wiring to the engine
    ├── Panels.jsx                Projects, Career, How I work, Contact
    ├── engine.js                 render loop, WebGL, input, ship, moons, camera, shake
    ├── shader.js                 lens + accretion-disk fragment shader
    ├── sky.js                    stars, lattice and the name painted into the lens texture
    ├── physics.js                pure maths (Kepler orbits, gravity, camera, detectors)
    ├── physics.test.js           unit tests for physics.js
    └── styles.scss
```

React owns the markup and the panel. `engine.js` owns the frames. `EventHorizon.jsx`
creates it in an effect and calls `destroy()` on unmount, so it survives React
StrictMode's double mount. `physics.js` has no DOM or WebGL code, which is what lets it
run under `node --test`.

## How the scene works

- **Lensing.** The sky (stars, dot lattice and the name) is painted once per resize into
  an offscreen canvas and uploaded as a texture. A fragment shader then resamples it
  through a point-mass thin lens, `β = θ (1 − θE² / θ²)`, so the background folds into
  an Einstein ring around the shadow.
- **The name.** The `<h1>` is real, selectable DOM text with transparent glyphs. Its
  pixels are painted into the texture at the measured positions, so the hole bends the
  name like everything else behind it.
- **Accretion disk.** Noise turns slowly in two layers, which reads as differential
  rotation without winding up. The side moving toward the camera is brighter and bluer
  (relativistic beaming). The far side of the disk is bent up over the shadow.
- **Camera.** Elevation and roll change the disk's flattening and tilt, the moons'
  orbits, and a parallax shift between the hole and the background.
- **Moons.** Periods follow Kepler's third law, `T ∝ a^1.5`, so the inner moon laps the
  outer ones.
- **Gravitational wave.** A shake sends out a ripple with "plus" polarisation: space
  stretches along one axis while it squeezes along the other.

## Performance

- The disk and ring maths only runs near the hole. Everywhere else the shader does one
  texture lookup.
- The lens renders at no more than 1.5× device pixel ratio and about 2.6 million pixels.
- **Adaptive resolution.** After about 90 slow frames, the lens renders at a lower
  resolution. Each step is 80% of the last, and it never goes below 60%.
- The loop stops while a panel is open, once the hole has slid aside, and while the tab
  is hidden. With reduced motion it only runs while something is moving.
- The ship layer clears only the area the ship and its trail last covered.
- The panel is opaque on purpose: a backdrop blur over a live WebGL canvas is expensive.

## Accessibility and fallbacks

- The moons and the top index are real buttons. Orbits pause on hover and on keyboard focus.
- Panels are modal dialogs. They trap focus, close on `Esc`, and return focus to
  whatever opened them.
- `prefers-reduced-motion` stops the ambient motion (orbits, disk rotation, marquee,
  screen shake).
- Without WebGL, the sky is drawn flat, the name shows as normal gradient text, and a
  CSS disc stands in for the hole.

## Deployment

Every push to `main` builds and deploys to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow copies
`index.html` to `404.html` so that unknown paths still load the app.
