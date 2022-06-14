import { type Page } from '@playwright/test'
import { Timeline } from './animation-timeline'
import { AnimationState, AnimationRecord } from './scripts/recordAnimations'
import { Snapshot } from './snapshots'

export interface Animation {
  id: number
  state: AnimationState
  target: string | null
  properties: string[]
  elapsedTime: number

  events: AnimationEvent[]
}

export interface AnimationEvent {
  id: number
  time: bigint
  state: AnimationState
  animation: Animation
  target: string | null
  snapshot: Snapshot
  properties: string[]
  elapsedTime: number
  snapshotDiff: string
}

export interface WaitOptions {
  delayInMs?: number
}

export class Animations extends Array<Animation> {
  page: Page
  events: AnimationEvent[]
  lastSnapshot: Snapshot | undefined

  constructor(page: Page) {
    super()

    this.events = []

    // Just so these don't show in console.log
    Object.defineProperty(this, 'page', { value: page, enumerable: false })
    Object.defineProperty(this, 'lastSnapshot', { value: undefined, enumerable: false })
  }

  async startRecording() {
    // Setup handler that takes in animation "records" and creates / updates animations and events
    await this.page.exposeBinding('__record_animation_record__', (_, record: AnimationRecord) =>
      this.handleRecord(record)
    )

    // Take an initial snapshot to compare against
    this.lastSnapshot = await Snapshot.take(this.page.locator('html'), 'mutation')

    // Start recording animations
    await this.page.evaluate(() => window.__record_animations__())
  }

  private handleRecord(record: AnimationRecord) {
    let animation = (this[record.id] ??= {
      id: record.id,
      state: 'created',
      target: null,
      properties: [],
      elapsedTime: 0,

      events: [],
    })

    const snapshot = Snapshot.fromTree(record.tree, 'animation')

    const event: AnimationEvent = {
      id: this.events.length,
      time: process.hrtime.bigint(),
      state: record.state,
      target: record.target,
      animation,
      snapshot: snapshot,
      properties: record.properties,
      elapsedTime: record.elapsedTime,
      snapshotDiff: snapshot.diffWithPrevious(this.lastSnapshot),
    }

    this.lastSnapshot = snapshot

    this.events.push(event)
    animation.events.push(event)

    animation.state = record.state
    animation.target = animation.target ?? record.target
    animation.properties = record.properties
    animation.elapsedTime = record.elapsedTime
  }

  public async wait({ delayInMs = 10 }: WaitOptions = {}): Promise<void> {
    await this.waitForStart({ delayInMs })
    await this.waitForFinish({ delayInMs })
  }

  public async waitForStart({ delayInMs = 10 }: WaitOptions = {}): Promise<void> {
    let previousCount = this.length

    while (this.length === previousCount) {
      await new Promise((resolve) => setTimeout(resolve, delayInMs))
    }
  }

  public async waitForFinish({ delayInMs = 10 }: WaitOptions = {}): Promise<void> {
    let animations = this.runningAnimations

    let areRunning = () => this.areRunning(animations)

    while (areRunning()) {
      await new Promise((resolve) => setTimeout(resolve, delayInMs))
    }
  }

  get timeline(): string {
    return new Timeline(this).toString()
  }

  private areRunning(animations: Animation[]) {
    return animations.some((animation) => this.isRunning(animation))
  }

  private isRunning(animation: Animation) {
    return animation.state === 'created' || animation.state === 'started'
  }

  get runningAnimations() {
    return this.filter((animation) => this.isRunning(animation))
  }

  get anyRunning() {
    return this.runningAnimations.length > 0
  }
}