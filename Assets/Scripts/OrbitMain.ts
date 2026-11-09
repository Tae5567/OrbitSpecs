import {OrbitUI} from "./OrbitUI"
import {Interactable, TargetingPriority} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

interface TaskEntry {
  area: number
  index: number
  name: string
  description: string
  object: SceneObject | null
  completed: boolean
  target: vec3 | null
  basePosition: vec3
}

const AREAS = ["Career Growth", "Personal Projects", "Learning"]
const TASKS: Array<Array<{name: string, description: string}>> = [
  [
    {name: "Solve a coding challenge", description: "Complete one algorithm or data structures problem."},
    {name: "Update my portfolio", description: "Improve one project description or README."},
    {name: "Prepare for interviews", description: "Practise explaining a technical concept."},
  ],
  [
    {name: "Build a feature", description: "Implement one feature in a personal software project."},
    {name: "Review progress", description: "Test and improve something already built."},
    {name: "Explore an idea", description: "Research a new product or technical concept."},
  ],
  [
    {name: "Study for 30 minutes", description: "Learn a new technical concept."},
    {name: "Read documentation", description: "Explore a framework or tool."},
    {name: "Practise a new skill", description: "Complete a small practical exercise."},
  ],
]
const AREA_POSITIONS = [new vec3(-20, 4, 0), new vec3(20, 4, 0), new vec3(0, -15, 0)]
const AREA_COLORS = [new vec4(0.28, 0.62, 1.0, 1), new vec4(0.42, 0.95, 0.78, 1), new vec4(0.73, 0.55, 1.0, 1)]
const TASK_OFFSETS = [new vec3(-9, 4, 12), new vec3(9, 4, 12), new vec3(0, -9, 10)]
const COMPLETED_STAR_COLOR = new vec4(1, 0.69, 0.16, 1)
const CONSTELLATION_SLOTS = [
  new vec3(-24, -29, 2), new vec3(-17, -25, 2), new vec3(-9, -24, 2),
  new vec3(-1, -27, 2), new vec3(7, -29, 2), new vec3(14, -28, 2),
  new vec3(21, -26, 2), new vec3(20, -33, 2), new vec3(14, -35, 2),
]

@component
export class OrbitMain extends BaseScriptComponent {
  @input
  material: Material

  @input
  ui: OrbitUI

  private tasks: TaskEntry[] = []
  private selectedArea = -1
  private selectedTask: TaskEntry | null = null
  private secondsRemaining = 25 * 60
  private timerRunning = false
  private timerStarted = false
  private subsecond = 0
  private spin = 0
  private planetObjects: SceneObject[] = []
  private planetBaseRotations: number[] = []
  private interactionBindings: Array<() => void> = []
  private buttonBindings: Array<() => void> = []
  private starHitTargets: SceneObject[] = []
  private starHitTargetsHidden = false
  private starObjects: SceneObject[] = []

  onAwake(): void {
    this.buildUniverse()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    this.createEvent("OnStartEvent").bind(() => {
      for (const bindInteraction of this.interactionBindings) bindInteraction()
      for (const bindButton of this.buttonBindings) bindButton()
      this.ui.bind(this)
      this.ui.showHome(this.completedCount())
    })
  }

  private buildUniverse(): void {
    this.addStarfield()
    const sun = this.addSphere("Orbit-Sun", 8.8, new vec3(0, 0, 0), new vec4(1.0, 0.66, 0.25, 1))
    sun.getTransform().setLocalScale(new vec3(1, 1, 1))
    const core = this.addSphere("Orbit-SunCore", 6.2, new vec3(0, 0, 1.3), new vec4(1.0, 0.88, 0.55, 1))
    core.getTransform().setLocalScale(new vec3(1, 1, 1))

    for (let area = 0; area < AREAS.length; area++) {
      const planet = this.addSphere("Orbit-Planet-" + area, 4.8, AREA_POSITIONS[area], AREA_COLORS[area])
      this.planetObjects.push(planet)
      this.planetBaseRotations.push(0)
      this.addClickableCollider(planet, 6.5, () => this.selectArea(area),
        () => planet.getTransform().setLocalScale(new vec3(1.14, 1.14, 1.14)),
        () => planet.getTransform().setLocalScale(new vec3(this.selectedArea === area ? 1.14 : 1, this.selectedArea === area ? 1.14 : 1, this.selectedArea === area ? 1.14 : 1)))

      for (let taskIndex = 0; taskIndex < TASKS[area].length; taskIndex++) {
        const data = TASKS[area][taskIndex]
        const pos = AREA_POSITIONS[area].add(TASK_OFFSETS[taskIndex])
        const task = {
          area,
          index: taskIndex,
          name: data.name,
          description: data.description,
          object: null as SceneObject | null,
          completed: false,
          target: null as vec3 | null,
          basePosition: pos,
        }
        const star = this.addStar("Orbit-TaskStar-" + area + "-" + taskIndex, 1.15, pos, new vec4(0.9, 0.94, 1, 1))
        star.enabled = true
        task.object = star
        this.tasks.push(task)
        this.starObjects.push(star)
        this.addStarHitTarget(star, area, taskIndex)
      }
    }
  }

  private addSphere(name: string, radius: number, position: vec3, color: vec4): SceneObject {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.sceneObject)
    obj.getTransform().setLocalPosition(position)
    const visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = this.createSphereMesh(radius, color)
    visual.mainMaterial = this.material
    return obj
  }

  private addWorkspaceDesk(): void {
    const vertices = [
      // Angled desktop surface: far edge, right-front, left-front.
      -39, -24, -12, 0.16, 0.19, 0.23, 1,
       39, -24, -12, 0.16, 0.19, 0.23, 1,
       51, -40,  14, 0.11, 0.15, 0.19, 1,
      -51, -40,  14, 0.11, 0.15, 0.19, 1,
      // Thin, warm front lip.
      -51, -40, 14.1, 0.48, 0.36, 0.22, 1,
       51, -40, 14.1, 0.48, 0.36, 0.22, 1,
       51, -42, 13.8, 0.27, 0.22, 0.16, 1,
      -51, -42, 13.8, 0.27, 0.22, 0.16, 1,
    ]
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    // Reverse winding on the top to face the viewer and expose a subtle top surface.
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices([0, 2, 3, 0, 1, 2, 4, 6, 5, 4, 7, 6])
    builder.updateMesh()
    const desk = global.scene.createSceneObject("Orbit-WorkspaceDesk")
    desk.setParent(this.sceneObject)
    desk.getTransform().setLocalPosition(new vec3(0, 0, 9))
    const visual = desk.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = builder.getMesh()
    visual.mainMaterial = this.material

    const notebook = this.createSimpleQuadMesh(
      [-31, -30, 10.5, 0.25, 0.27, 0.32, 1,
       -18, -30, 10.5, 0.25, 0.27, 0.32, 1,
       -18, -36, 15, 0.17, 0.2, 0.25, 1,
       -31, -36, 15, 0.17, 0.2, 0.25, 1],
      [0, 2, 3, 0, 1, 2]
    )
    const book = global.scene.createSceneObject("Orbit-Notebook")
    book.setParent(this.sceneObject)
    book.getTransform().setLocalPosition(new vec3(0, 0, 9))
    const bookVisual = book.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    bookVisual.mesh = notebook
    bookVisual.mainMaterial = this.material
  }

  private createSimpleQuadMesh(vertices: number[], indices: number[]): RenderMesh {
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    return builder.getMesh()
  }

  private createSphereMesh(radius: number, color: vec4): RenderMesh {
    const latitudes = 20
    const longitudes = 28
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    const vertices: number[] = []
    const indices: number[] = []
    for (let lat = 0; lat <= latitudes; lat++) {
      const theta = Math.PI * lat / latitudes
      const sy = Math.cos(theta)
      const sr = Math.sin(theta)
      for (let lon = 0; lon <= longitudes; lon++) {
        const phi = Math.PI * 2 * lon / longitudes
        const x = Math.cos(phi) * sr
        const z = Math.sin(phi) * sr
        const facing = Math.max(0, -0.48 * x + 0.62 * sy + 0.62 * z)
        const shade = 0.27 + 0.8 * facing
        vertices.push(radius * x, radius * sy, radius * z,
          Math.min(1, color.x * shade), Math.min(1, color.y * shade), Math.min(1, color.z * shade), color.w)
      }
    }
    for (let lat = 0; lat < latitudes; lat++) {
      for (let lon = 0; lon < longitudes; lon++) {
        const a = lat * (longitudes + 1) + lon
        const b = a + longitudes + 1
        const c = a + 1
        const d = b + 1
        indices.push(a, c, b, c, d, b)
      }
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    return builder.getMesh()
  }

  private addStar(name: string, radius: number, position: vec3, color: vec4): SceneObject {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.sceneObject)
    obj.getTransform().setLocalPosition(position)
    const visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = this.createStarMesh(radius, color)
    visual.mainMaterial = this.material
    return obj
  }

  private createStarMesh(radius: number, color: vec4): RenderMesh {
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    const verts: number[] = [0, 0, 0, color.x, color.y, color.z, color.w]
    const points = 10
    for (let i = 0; i < points; i++) {
      const angle = Math.PI * 2 * i / points - Math.PI / 2
      const r = i % 2 === 0 ? radius : radius * 0.46
      verts.push(Math.cos(angle) * r, Math.sin(angle) * r, 0, color.x, color.y, color.z, color.w)
    }
    const idx: number[] = []
    for (let i = 0; i < points; i++) idx.push(0, i + 1, (i + 1) % points + 1)
    builder.appendVerticesInterleaved(verts)
    builder.appendIndices(idx)
    builder.updateMesh()
    return builder.getMesh()
  }

  private addStarfield(): void {
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    const vertices: number[] = []
    const indices: number[] = []
    const palette = [new vec4(0.58, 0.72, 1, 0.8), new vec4(0.78, 0.64, 0.94, 0.72), new vec4(1, 0.78, 0.48, 0.7)]
    const count = 24
    for (let i = 0; i < count; i++) {
      const seed = i + 1
      const x = Math.sin(seed * 12.9898) * 54
      const y = Math.cos(seed * 7.233) * 39
      const z = -20 - (seed * 17 % 35)
      const radius = 0.12 + (seed * 13 % 10) * 0.035
      const color = palette[seed % palette.length]
      const base = vertices.length / 7
      vertices.push(x, y, z, color.x, color.y, color.z, color.w)
      vertices.push(x, y + radius, z, color.x, color.y, color.z, color.w)
      vertices.push(x + radius * 0.72, y, z, color.x, color.y, color.z, color.w)
      vertices.push(x, y - radius, z, color.x, color.y, color.z, color.w)
      vertices.push(x - radius * 0.72, y, z, color.x, color.y, color.z, color.w)
      for (let point = 0; point < 4; point++) indices.push(base, base + point + 1, base + ((point + 1) % 4) + 1)
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const stars = global.scene.createSceneObject("Orbit-DistantStarfield")
    stars.setParent(this.sceneObject)
    const visual = stars.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = builder.getMesh()
    visual.mainMaterial = this.material
  }

  private createRing(name: string, inner: number, outer: number, color: vec4): SceneObject {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.sceneObject)
    const segments = 144
    const builder = new MeshBuilder([
      {name: "position", components: 3},
      {name: "color", components: 4},
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    const vertices: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= segments; i++) {
      const a = Math.PI * 2 * i / segments
      const x = Math.cos(a)
      const y = Math.sin(a)
      vertices.push(x * inner, y * inner, 0, color.x, color.y, color.z, color.w)
      vertices.push(x * outer, y * outer, 0, color.x, color.y, color.z, color.w)
      if (i < segments) {
        const k = i * 2
        indices.push(k, k + 1, k + 3, k, k + 3, k + 2)
      }
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh = builder.getMesh()
    visual.mainMaterial = this.material
    return obj
  }

  private addTextLabel(name: string, textValue: string, position: vec3, size: number, color: vec4): SceneObject {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.sceneObject)
    obj.getTransform().setLocalPosition(position)
    const label = obj.createComponent("Component.Text") as Text
    label.text = textValue
    label.size = size
    label.depthTest = true
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Overflow
    label.verticalOverflow = VerticalOverflow.Overflow
    label.textFill.color = color
    return obj
  }

  private addClickableCollider(obj: SceneObject, radius: number, onTrigger: () => void, onHover?: () => void, onHoverEnd?: () => void, highPriority = false): void {
    const collider = obj.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.shape = Shape.createSphereShape()
    ;(collider.shape as SphereShape).radius = radius
    const interactable = obj.createComponent(Interactable.getTypeName()) as Interactable
    interactable.colliders = [collider]
    interactable.targetingMode = 7
    if (highPriority) interactable.targetingPriority = TargetingPriority.High
    this.interactionBindings.push(() => {
      interactable.onTriggerStart.add(onTrigger)
      if (onHover) interactable.onHoverEnter.add(onHover)
      if (onHoverEnd) interactable.onHoverExit.add(onHoverEnd)
    })
  }

  private addStarHitTarget(star: SceneObject, area: number, taskIndex: number): void {
    const task = this.findTask(area, taskIndex)
    const target = global.scene.createSceneObject("Orbit-StarHitTarget-" + area + "-" + taskIndex)
    this.starHitTargets.push(target)
    target.setParent(star)
    target.getTransform().setLocalPosition(new vec3(0, 0, 0.15))
    const button = target.createComponent(Button.getTypeName()) as Button
    button.size = new vec3(8, 8, 1)
    const shape = target.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (shape) {
      shape.opacity = 0
      shape.backgroundColor = new vec4(0, 0, 0, 0)
      shape.border = false
    }
    const visual = target.getComponent("Component.RenderMeshVisual") as RenderMeshVisual | null
    if (visual) visual.enabled = false
    const interactable = target.getComponent(Interactable.getTypeName()) as Interactable | null
    if (interactable) {
      interactable.targetingMode = 7
      interactable.targetingVisual = 1
      interactable.targetingPriority = TargetingPriority.High
    }
    this.buttonBindings.push(() => {
      if (shape) {
        shape.opacity = 0
        shape.backgroundColor = new vec4(0, 0, 0, 0)
        shape.border = false
      }
      if (visual) visual.enabled = false
      if (interactable) {
        interactable.targetingMode = 7
        interactable.targetingVisual = 1
        interactable.onHoverEnter.add(() => star.getTransform().setLocalScale(new vec3(1.22, 1.22, 1.22)))
        interactable.onHoverExit.add(() => star.getTransform().setLocalScale(new vec3(task.completed ? 1.2 : 1, task.completed ? 1.2 : 1, task.completed ? 1.2 : 1)))
      }
      button.onTriggerUp.add(() => this.selectTask(area, taskIndex))
    })
  }

  selectArea(area: number): void {
    if (area < 0 || area >= AREAS.length) return
    if (this.selectedTask && this.selectedTask.object) this.selectedTask.object.getTransform().setLocalScale(new vec3(1, 1, 1))
    this.selectedArea = area
    this.selectedTask = null
    this.updateStarVisibility()
    for (let i = 0; i < this.planetObjects.length; i++) {
      const scale = i === area ? 1.14 : 1
      this.planetObjects[i].getTransform().setLocalScale(new vec3(scale, scale, scale))
    }
    this.stopFocus()
    this.ui.showArea(area, AREAS[area], TASKS[area].map((x, i) => ({name: x.name, completed: this.findTask(area, i).completed})), this.completedCount())
  }

  selectTask(area: number, index: number): void {
    if (this.selectedTask && this.selectedTask.object && this.selectedTask !== this.findTask(area, index)) {
      this.selectedTask.object.getTransform().setLocalScale(new vec3(1, 1, 1))
    }
    const task = this.findTask(area, index)
    this.selectedArea = area
    this.selectedTask = task
    this.updateStarVisibility()
    if (task.object) task.object.getTransform().setLocalScale(new vec3(1.18, 1.18, 1.18))
    this.stopFocus()
    this.ui.showTask(area, index, AREAS[area], task.name, task.description, task.completed, this.secondsRemaining, this.completedCount())
  }

  startFocus(): void {
    if (!this.selectedTask || this.selectedTask.completed) return
    if (!this.timerStarted) {
      this.secondsRemaining = 25 * 60
      this.timerStarted = true
    }
    this.timerRunning = true
    this.ui.setFocusMode(this.selectedTask.name)
    this.ui.updateTimer(this.secondsRemaining, this.timerRunning, this.timerStarted)
  }

  toggleFocus(): void {
    if (!this.selectedTask || !this.timerStarted || this.selectedTask.completed) return
    this.timerRunning = !this.timerRunning
    this.ui.updateTimer(this.secondsRemaining, this.timerRunning, this.timerStarted)
  }

  completeTask(): void {
    if (!this.selectedTask) return
    const task = this.selectedTask
    if (task.completed) return
    task.completed = true
    this.timerRunning = false
    this.timerStarted = false
    const completedIndex = this.completedCount() - 1
    task.target = CONSTELLATION_SLOTS[completedIndex]
    if (task.object) {
      task.object.enabled = true
      const visual = task.object.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      visual.mesh = this.createStarMesh(2.4, COMPLETED_STAR_COLOR)
      task.object.getTransform().setLocalScale(new vec3(1.24, 1.24, 1.24))
    }
    this.ui.showCompletion(task.name, this.completedCount())
    this.selectedTask = null
    this.selectedArea = -1
  }

  showProgress(): void {
    if (this.selectedTask && this.selectedTask.object) this.selectedTask.object.getTransform().setLocalScale(new vec3(1, 1, 1))
    this.selectedTask = null
    this.selectedArea = -1
    this.updateStarVisibility()
    this.stopFocus()
    const names: string[] = []
    for (const task of this.tasks) if (task.completed) names.push(task.name)
    this.ui.showProgress(names, this.completedCount())
  }

  goHome(): void {
    if (this.selectedTask && this.selectedTask.object) this.selectedTask.object.getTransform().setLocalScale(new vec3(1, 1, 1))
    this.selectedTask = null
    this.selectedArea = -1
    this.updateStarVisibility()
    this.stopFocus()
    this.ui.showHome(this.completedCount())
  }

  closeSelection(): void {
    if (this.selectedTask) this.goHome()
    else if (this.selectedArea >= 0) this.goHome()
    else this.ui.showHome(this.completedCount())
  }

  private stopFocus(): void {
    this.timerRunning = false
    this.timerStarted = false
    this.secondsRemaining = 25 * 60
  }

  private onUpdate(): void {
    if (!this.starHitTargetsHidden) {
      this.starHitTargetsHidden = true
      for (const target of this.starHitTargets) {
        const shape = target.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
        if (shape) {
          shape.opacity = 0
          shape.backgroundColor = new vec4(0, 0, 0, 0)
          shape.border = false
        }
        const visual = target.getComponent("Component.RenderMeshVisual") as RenderMeshVisual | null
        if (visual) visual.enabled = false
      }
    }
    const dt = getDeltaTime()
    this.spin += dt
    for (let i = 0; i < this.planetObjects.length; i++) {
      const transform = this.planetObjects[i].getTransform()
      const p = AREA_POSITIONS[i]
      transform.setLocalPosition(new vec3(p.x, p.y + Math.sin(this.spin * 0.55 + i * 2.1) * 0.55, p.z))
      transform.setLocalRotation(quat.fromEulerAngles(0, this.spin * (0.06 + i * 0.025), 0))
    }
    for (const task of this.tasks) {
      if (task.completed && task.target && task.object) {
        const tr = task.object.getTransform()
        const current = tr.getLocalPosition()
        const remaining = task.target.sub(current)
        if (remaining.length > 0.8) tr.setLocalPosition(current.add(remaining.uniformScale(Math.min(1, dt * 2.4))))
        else tr.setLocalPosition(task.target)
        const scale = 1.2 + Math.sin(this.spin * 3 + task.index) * 0.08
        tr.setLocalScale(new vec3(scale, scale, scale))
      } else if (!task.completed && task.object && this.selectedTask !== task) {
        const tr = task.object.getTransform()
        const p = task.basePosition
        const pulse = Math.sin(this.spin * 1.2 + task.index * 1.7 + task.area) * 0.24
        tr.setLocalPosition(new vec3(p.x, p.y + pulse, p.z))
        const scale = 1 + (Math.sin(this.spin * 2 + task.area * 2 + task.index) + 1) * 0.035
        tr.setLocalScale(new vec3(scale, scale, scale))
      }
    }
    if (this.timerRunning) {
      this.subsecond += dt
      if (this.subsecond >= 1) {
        const elapsed = Math.floor(this.subsecond)
        this.subsecond -= elapsed
        this.secondsRemaining = Math.max(0, this.secondsRemaining - elapsed)
        if (this.secondsRemaining === 0) {
          this.timerRunning = false
          this.completeTask()
        } else {
          this.ui.updateTimer(this.secondsRemaining, this.timerRunning, this.timerStarted)
        }
      }
    }
  }

  private findTask(area: number, index: number): TaskEntry {
    return this.tasks[area * 3 + index]
  }

  private completedCount(): number {
    return this.tasks.reduce((n, task) => n + (task.completed ? 1 : 0), 0)
  }

  private updateStarVisibility(): void {
    for (const task of this.tasks) {
      if (task.object) task.object.enabled = true
    }
  }
}

