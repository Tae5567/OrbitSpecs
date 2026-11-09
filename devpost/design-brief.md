---
status: approved
---

# Design brief: Orbit: Among the Stars

## The one spatial moment
While sitting at a desk to prepare for a coding interview or work on a meaningful project, the user glances up and sees a calm celestial universe suspended in their real workspace. They select one manageable task, start a 25-minute focus session, then return to see its star brighten and join the constellation of completed work.

## Why it belongs on glasses
- Uses: draws in the world; leaves your body free.
- Why it's better than the phone or laptop version: The user's goals and progress take spatial form in the workspace, where they can glance at them without opening a conventional to-do list. During focus, Orbit reduces to the selected task and timer so the user can look away and work normally.

## Product or overlay
- Type: product: the virtual celestial universe is the experience.
- What the real version would sense: nothing.
- Stand-in for the preview: a virtual celestial installation placed in front of the user; the real room remains visible through transparent areas. No real desk recognition or anchoring is needed.

## Where things live
- Where the user is looking during the main task: seated at a desk, glancing slightly up toward the celestial universe and back to their work.
- Celestial universe: centered ahead of the seated user, approximately 1.1 m away and slightly below eye level (default); keep all important objects within the narrow view. Use centimeters for scene scale and leave enough space between selectable objects.
- Sun: central visual anchor, labeled “Build the Future I Imagine,” with a soft golden glow (default size: about 18 cm across).
- Sample universe:
  - Career Growth: Solve a coding challenge (complete one algorithm or data structures problem); Update my portfolio (improve one project description or README); Prepare for interviews (practise explaining a technical concept).
  - Personal Projects: Build a feature (implement one feature in a personal software project); Review progress (test and improve something already built); Explore an idea (research a new product or technical concept).
  - Learning: Study for 30 minutes (learn a new technical concept); Read documentation (explore a framework or tool); Practise a new skill (complete a small practical exercise).
  - Keep this initial set small and visually uncluttered. Each task has a short description and status; show an estimated duration only where one is provided.
- Planets: three planets arranged around the sun, each representing one area of focus; labels are minimal and appear only as needed (default size: about 10 cm across each).
- Task stars: smaller, individually selectable stars arranged near their planet (default size: about 4 cm across); completed stars brighten and move into a visible constellation.
- Task details panel: appears beside the selected planet or star, approximately 0.8–1.1 m from the user and slightly below eye level (default); keep it compact and readable (default: about 24 x 16 cm).
- Orbital structure: a subtle luminous circular orbit or horizon below and around the celestial objects; no opaque virtual room or furniture.

## Hands and input
- Select a planet: click it in preview (SIK pinch interaction); highlight it subtly and show its tasks.
- Select a task star: click it; highlight it and show its name, short description, status, estimated duration if provided, and actions.
- Start focus: click the Start Focus button to begin a functional 25-minute countdown (default).
- Pause or resume: click the timer control, which changes between Pause and Resume.
- Complete a task: click Complete Task; stop the timer, update the task status for the current open session, and animate the star brightening and joining the constellation.
- Navigate: provide clear Back/Close and Progress controls. Clicking empty space can deselect an object.
- Targets are big and highlight when aimed at. Use minimal, readable panels and clear button feedback.
- Voice: none.

## When things show
- Main universe: sun, planets, task stars, and a subtle progress constellation are visible on the home view; keep labels minimal.
- Selected planet: its project/area and associated tasks appear in a compact panel; hide the panel when deselected or when returning home.
- Selected task: show its name, short description, status, and actions in a panel near the task star.
- Focus session: keep the selected task name, countdown, and Pause/Resume control visible. Hide or greatly soften other details and progress information.
- Task completion: briefly show the star brightening and moving into the completed constellation, then return to the main celestial view.
- Progress view: open only when the user chooses the Progress control; show completed tasks as a constellation.
- If something needs attention out of view: none; keep the task and controls within view.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. The transparent celestial scene renders with a central sun, three selectable planets, task stars, and restrained glow, depth, and movement while the real preview environment remains visible.
2. Clicking a planet reveals its tasks; clicking a task reveals its name, description, status, and available actions.
3. Start Focus begins a 25-minute countdown; Pause stops the countdown and Resume continues it.
4. Complete Task stops the timer, updates the selected task to completed, and animates its star into the completed constellation.
5. Completed tasks remain complete and visible in the constellation while navigating between planets, home, and progress views during the open Lens session.

## Out of scope
- Recognition or anchoring to the user's real desk or objects.
- Persistence after closing and reopening the Lens; progress is session-only.
- External APIs, accounts, backend storage, voice recognition, or physical Spectacles hardware.
- A detailed virtual office, walls, furniture, or opaque dark background.
- Complex task management beyond the sample universe and its session progress.

## Risks and open questions
- Progress across planets and views is required for the open Lens session; progress after closing and reopening is intentionally out of scope.
- The calm, comfortable feel, real-world readability, and actual display comfort remain unproven without physical Spectacles.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources

