import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import type {OrbitMain} from "./OrbitMain"

const PANEL_W = 28
const PANEL_H = 40
const AREA_NAMES = ["Career", "Projects", "Learning"]

@component
export class OrbitUI extends BaseScriptComponent {
  @input
  world: OrbitMain

  private titleText: Text | null = null
  private summaryText: Text | null = null
  private detailText: Text | null = null
  private timerText: Text | null = null
  private areaButtons: Button[] = []
  private taskButtons: Button[] = []
  private taskLabels: ElementContent[] = []
  private startButton: Button | null = null
  private pauseButton: Button | null = null
  private completeButton: Button | null = null
  private taskArea: SceneObject | null = null
  private detailArea: SceneObject | null = null
  private actionArea: SceneObject | null = null
  private panelShape: RoundedRectangle | null = null
  private backPlate: BackPlate | null = null
  private areaButtonRow: SceneObject | null = null
  private navigationRow: SceneObject | null = null
  private progressMode = false
  private interactionBindings: Array<() => void> = []
  private styleBindings: Array<() => void> = []
  private layoutSlotHeights: Map<SceneObject, number> = new Map()
  private started = false

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    this.backPlate.style = "dark"
    this.backPlate.size = new vec2(PANEL_W, PANEL_H)
    this.panelShape = this.sceneObject.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (this.panelShape) {
      this.panelShape.opacity = 0.34
      this.panelShape.border = true
      this.panelShape.borderSize = 0.04
      this.panelShape.borderColor = new vec4(0.55, 0.68, 0.85, 0.48)
    }

    const content = global.scene.createSceneObject("OrbitUI-Content")
    content.setParent(this.sceneObject)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const column = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    column.width = PANEL_W
    column.height = PANEL_H
    column.direction = FlexDirection.Column
    column.alignItems = FlexAlign.Stretch
    column.justifyContent = FlexJustify.Start
    column.rowGap = 0.26
    column.paddingTop = 0.6
    column.paddingBottom = 0.6
    column.paddingLeft = 0.6
    column.paddingRight = 0.6

    this.titleText = this.addText(content, "OrbitTitle", "ORBIT", 72, 3.7)
    this.summaryText = this.addText(content, "OrbitSummary", "Choose a planet", 56, 2.8)
    this.buildAreaButtons(content)
    this.taskArea = this.makeColumn(content, "OrbitTaskArea", PANEL_W - 2, 11.8)
    this.buildTaskButtons(this.taskArea)
    this.detailArea = this.makeColumn(content, "OrbitDetailArea", PANEL_W - 2, 5.8)
    this.detailText = this.addText(this.detailArea, "OrbitTaskDetails", "", 46, 5.6)
    this.timerText = this.addText(content, "OrbitTimer", "", 66, 3)
    this.actionArea = this.makeRow(content, "OrbitActionRow", PANEL_W - 2, 4)
    this.buildActions(this.actionArea)
    this.navigationRow = this.makeRow(content, "OrbitNavigation", PANEL_W - 2, 4)
    this.addButton(this.navigationRow, "ProgressButton", "Progress", 11.5, 3.6, () => this.world.showProgress())
    this.addButton(this.navigationRow, "HomeButton", "Home", 11.5, 3.6, () => this.world.goHome())

    this.setAreaVisible(this.taskArea, false)
    this.setAreaVisible(this.detailArea, false)
    this.setAreaVisible(this.actionArea, false)
    this.createEvent("OnStartEvent").bind(() => {
      this.started = true
      if (this.panelShape) {
        this.panelShape.opacity = 0.34
        this.panelShape.border = true
        this.panelShape.borderSize = 0.04
        this.panelShape.borderColor = new vec4(0.55, 0.68, 0.85, 0.48)
      }
      for (const bindInteraction of this.interactionBindings) bindInteraction()
      for (const applyStyle of this.styleBindings) applyStyle()
      this.applyTextContrast(this.sceneObject)
    })
  }

  bind(world: OrbitMain): void {
    this.world = world
  }

  showHome(completed: number): void {
    this.setPanelHeight(23)
    this.progressMode = false
    this.setAreaVisible(this.taskArea, false)
    this.setAreaVisible(this.detailArea, false)
    this.setAreaVisible(this.actionArea, false)
    this.titleText.text = "ORBIT"
    this.summaryText.text = completed + " of 9 stars complete"
    this.timerText.text = "Choose a planet to begin"
    this.setAreaVisible(this.areaButtonRow, true)
    this.setAreaVisible(this.navigationRow, true)
  }

  showArea(area: number, name: string, tasks: Array<{name: string, completed: boolean}>, completed: number): void {
    this.setPanelHeight(30)
    this.progressMode = false
    this.titleText.text = name.toUpperCase()
    this.summaryText.text = "Choose a task"
    this.setAreaVisible(this.areaButtonRow, false)
    this.setAreaVisible(this.navigationRow, true)
    this.setAreaVisible(this.taskArea, true)
    this.setAreaVisible(this.detailArea, false)
    this.setAreaVisible(this.actionArea, false)
    for (let i = 0; i < this.taskButtons.length; i++) {
      const enabled = i >= area * 3 && i < area * 3 + 3
      this.taskButtons[i].getSceneObject().enabled = enabled
      if (enabled) this.taskLabels[i].text = (tasks[i % 3].completed ? "✦  " : "☆  ") + tasks[i % 3].name
    }
    this.refreshChildLayout(this.taskArea)
    this.timerText.text = completed + " completed"
  }

  showTask(area: number, taskIndex: number, areaName: string, name: string, description: string, completed: boolean, seconds: number, count: number): void {
    this.setPanelHeight(40)
    this.progressMode = false
    this.titleText.text = areaName.toUpperCase()
    this.summaryText.text = "Selected task"
    this.setAreaVisible(this.areaButtonRow, false)
    this.setAreaVisible(this.navigationRow, true)
    this.setAreaVisible(this.taskArea, true)
    this.setAreaVisible(this.detailArea, true)
    this.setAreaVisible(this.actionArea, true)
    for (let i = 0; i < this.taskButtons.length; i++) {
      const isCurrentArea = i >= area * 3 && i < area * 3 + 3
      this.taskButtons[i].getSceneObject().enabled = isCurrentArea
      this.styleButton(this.taskButtons[i], isCurrentArea && i % 3 === taskIndex
        ? new vec4(0.22, 0.34, 0.48, 0.82)
        : new vec4(0.1, 0.15, 0.24, 0.68))
    }
    this.detailText.text = name + "\n" + description + "\n" + (completed ? "Completed" : "Ready")
    this.timerText.text = completed ? "In your constellation" : this.formatTime(seconds) + " ready"
    if (this.startButton) this.startButton.getSceneObject().enabled = !completed
    if (this.pauseButton) this.pauseButton.getSceneObject().enabled = !completed
    if (this.completeButton) this.completeButton.getSceneObject().enabled = !completed
    this.refreshChildLayout(this.taskArea)
    this.refreshChildLayout(this.actionArea)
    if (this.startButton) this.styleButton(this.startButton, new vec4(0.12, 0.35, 0.55, 0.95))
    if (this.pauseButton) this.styleButton(this.pauseButton, new vec4(0.28, 0.23, 0.46, 0.95))
    if (this.completeButton) this.styleButton(this.completeButton, new vec4(0.52, 0.36, 0.14, 0.95))
  }

  updateTimer(seconds: number, running: boolean, started: boolean): void {
    this.timerText.text = this.formatTime(seconds) + (running ? "  ·  FOCUSING" : started ? "  ·  PAUSED" : "  ·  READY")
    if (this.pauseButton) {
      const content = this.pauseButton.getSceneObject().getComponent(ElementContent.getTypeName()) as ElementContent
      content.text = running ? "Pause" : "Resume"
    }
  }

  setFocusMode(taskName: string): void {
    this.setPanelHeight(20)
    this.setAreaVisible(this.taskArea, false)
    this.setAreaVisible(this.detailArea, false)
    this.setAreaVisible(this.areaButtonRow, false)
    this.setAreaVisible(this.navigationRow, false)
    this.setAreaVisible(this.actionArea, true)
    this.titleText.text = "FOCUS"
    this.summaryText.text = taskName
    if (this.startButton) this.startButton.getSceneObject().enabled = false
    if (this.completeButton) this.completeButton.getSceneObject().enabled = false
    if (this.pauseButton) this.pauseButton.getSceneObject().enabled = true
    this.refreshChildLayout(this.actionArea)
  }

  showCompletion(name: string, completed: number): void {
    this.setPanelHeight(27)
    this.titleText.text = "STAR COMPLETE"
    this.summaryText.text = name
    this.detailText.text = "Completed  ·  " + completed + " of 9 stars now shining."
    this.setAreaVisible(this.taskArea, false)
    this.setAreaVisible(this.detailArea, true)
    this.setAreaVisible(this.actionArea, false)
    this.setAreaVisible(this.areaButtonRow, false)
    this.setAreaVisible(this.navigationRow, true)
    this.timerText.text = "Your progress stays here for this Lens session."
  }

  showProgress(names: string[], completed: number): void {
    this.setPanelHeight(28)
    this.progressMode = true
    this.titleText.text = "YOUR CONSTELLATION"
    this.summaryText.text = completed + " of 9 stars completed this session"
    this.setAreaVisible(this.taskArea, false)
    this.setAreaVisible(this.detailArea, true)
    this.setAreaVisible(this.actionArea, false)
    this.setAreaVisible(this.areaButtonRow, false)
    this.setAreaVisible(this.navigationRow, true)
    this.detailText.text = names.length ? names.map((name) => "✦  " + name).join("\n") : "Your first completed task will appear here."
    this.timerText.text = "Return to a planet to choose another task."
  }

  private buildAreaButtons(parent: SceneObject): void {
    const row = this.makeRow(parent, "OrbitAreaButtons", PANEL_W - 2, 4.8)
    this.areaButtonRow = row
    for (let i = 0; i < AREA_NAMES.length; i++) {
      const area = i
      const btn = this.addButton(row, "AreaButton-" + area, AREA_NAMES[area], (PANEL_W - 3.5) / 3, 3.8, () => this.world.selectArea(area))
      this.areaButtons.push(btn)
    }
  }

  private buildTaskButtons(parent: SceneObject): void {
    const labels = [
      "Solve a coding challenge", "Update my portfolio", "Prepare for interviews",
      "Build a feature", "Review progress", "Explore an idea",
      "Study for 30 minutes", "Read documentation", "Practise a new skill",
    ]
    for (let i = 0; i < labels.length; i++) {
      const taskIndex = i
      const area = Math.floor(i / 3)
      const name = "TaskButton-" + area + "-" + (i % 3)
      const btn = this.addButton(parent, name, labels[i], PANEL_W - 3.5, 3.45, () => this.world.selectTask(area, taskIndex % 3))
      this.taskButtons.push(btn)
      this.taskLabels.push(btn.getSceneObject().getComponent(ElementContent.getTypeName()) as ElementContent)
    }
  }

  private buildActions(parent: SceneObject): void {
    this.startButton = this.addButton(parent, "StartFocusButton", "Start Focus", 7.2, 3.7, () => this.world.startFocus())
    this.pauseButton = this.addButton(parent, "PauseResumeButton", "Pause", 6.2, 3.7, () => this.world.toggleFocus())
    this.completeButton = this.addButton(parent, "CompleteTaskButton", "Complete", 7.2, 3.7, () => this.world.completeTask())
  }

  private makeColumn(parent: SceneObject, name: string, width: number, height: number): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const flex = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = width
    flex.height = height
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.6
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    if (height > 0) item.overrideHeight = height
    this.layoutSlotHeights.set(so, height)
    return so
  }

  private makeRow(parent: SceneObject, name: string, width: number, height: number): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const flex = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = width
    flex.height = height
    flex.direction = FlexDirection.Row
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.SpaceBetween
    flex.columnGap = 0.25
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    this.layoutSlotHeights.set(so, height)
    return so
  }

  private addText(parent: SceneObject, name: string, text: string, size: number, height: number): Text {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const component = so.createComponent("Component.Text") as Text
    component.text = text
    component.size = size
    component.textFill.color = new vec4(0.9, 0.94, 1, 1)
    component.depthTest = true
    component.horizontalAlignment = HorizontalAlignment.Center
    component.verticalAlignment = VerticalAlignment.Center
    component.horizontalOverflow = HorizontalOverflow.Wrap
    component.verticalOverflow = VerticalOverflow.Overflow
    component.layoutRect = Rect.create(-14, 14, -height / 2, height / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = PANEL_W - 2
    item.overrideHeight = height
    item.alignSelf = FlexAlignSelf.Stretch
    return component
  }

  private addButton(parent: SceneObject, name: string, text: string, width: number, height: number, onTap: () => void): Button {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const button = so.createComponent(Button.getTypeName()) as Button
    button.size = new vec3(width, height, 1)
    const content = so.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = text
    content.textSize = 48
    content.contentAlignment = "center"
    this.styleButton(button, new vec4(0.2, 0.29, 0.44, 0.92))
    const interactable = so.getComponent(Interactable.getTypeName()) as Interactable | null
    if (interactable) {
      interactable.targetingMode = 7
      interactable.targetingVisual = 1
    }
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = width
    item.overrideHeight = height
    this.interactionBindings.push(() => {
      button.onTriggerUp.add(onTap)
      if (interactable) {
        interactable.onHoverEnter.add(() => this.styleButton(button, new vec4(0.29, 0.42, 0.58, 0.96)))
        interactable.onHoverExit.add(() => this.styleButton(button, new vec4(0.2, 0.29, 0.44, 0.92)))
      }
    })
    return button
  }

  private styleButton(button: Button, color: vec4): void {
    const apply = () => {
      const shape = button.getSceneObject().getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
      if (!shape) return
      shape.backgroundColor = color
      shape.opacity = 0.88
      shape.border = true
      shape.borderSize = 0.04
      shape.borderColor = new vec4(0.55, 0.72, 0.98, 0.65)
    }
    if (this.started) apply()
    else this.styleBindings.push(apply)
  }

  private applyTextContrast(root: SceneObject): void {
    const label = root.getComponent("Component.Text") as Text | null
    if (label) label.textFill.color = new vec4(0.92, 0.95, 1, 1)
    for (let i = 0; i < root.getChildrenCount(); i++) this.applyTextContrast(root.getChild(i))
  }

  private setAreaVisible(area: SceneObject, visible: boolean): void {
    if (!area) return
    // Keep layout wrappers enabled so FlexLayout retains them in its startup
    // discovery; zero their slot and toggle only the direct content children.
    area.enabled = true
    const item = area.getComponent(FlexItem.getTypeName()) as FlexItem | null
    const height = this.layoutSlotHeights.get(area)
    if (item && height !== undefined) item.overrideHeight = visible ? height : 0
    for (let i = 0; i < area.getChildrenCount(); i++) area.getChild(i).enabled = visible
    this.refreshChildLayout(area)
  }

  private refreshChildLayout(area: SceneObject | null): void {
    if (!area) return
    const layout = area.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout) layout.refreshChildren()
  }

  private setPanelHeight(height: number): void {
    if (this.backPlate) this.backPlate.size = new vec2(PANEL_W, height)
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return (minutes < 10 ? "0" : "") + minutes + ":" + (remainder < 10 ? "0" : "") + remainder
  }
}

