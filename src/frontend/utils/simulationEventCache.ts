export interface SimulationEventCacheOptions {
  maxEvents?: number;
  flushIntervalMs?: number;
}

/**
 * Small Kafka-style topic buffer for browser simulation events.
 * It keeps producers cheap during the hot simulation loop and lets React
 * consume telemetry in batches instead of re-rendering on every solver tick.
 */
export class SimulationEventCache<T> {
  private events: Array<T | undefined>;
  private head = 0;
  private size = 0;
  private lastFlush = 0;
  private dropped = 0;
  private readonly maxEvents: number;
  private readonly flushIntervalMs: number;

  constructor(options: SimulationEventCacheOptions = {}) {
    this.maxEvents = Math.max(1, Math.floor(options.maxEvents ?? 1800));
    this.flushIntervalMs = Math.max(0, options.flushIntervalMs ?? 120);
    this.events = new Array(this.maxEvents);
  }

  public append(event: T) {
    if (this.size === this.maxEvents) {
      this.events[this.head] = event;
      this.head = (this.head + 1) % this.maxEvents;
      this.dropped += 1;
      return;
    }

    const tail = (this.head + this.size) % this.maxEvents;
    this.events[tail] = event;
    this.size += 1;
  }

  public shouldFlush(now = performance.now()) {
    return this.size > 0 && now - this.lastFlush >= this.flushIntervalMs;
  }

  public flush(now = performance.now()) {
    if (this.size === 0) return [];

    const batch: T[] = new Array(this.size);
    for (let i = 0; i < this.size; i += 1) {
      const index = (this.head + i) % this.maxEvents;
      batch[i] = this.events[index] as T;
      this.events[index] = undefined;
    }

    this.head = 0;
    this.size = 0;
    this.lastFlush = now;
    return batch;
  }

  public reset(now = performance.now()) {
    this.events.fill(undefined);
    this.head = 0;
    this.size = 0;
    this.dropped = 0;
    this.lastFlush = now;
  }

  public get pendingCount() {
    return this.size;
  }

  public get droppedCount() {
    return this.dropped;
  }
}

export interface SimulationLatestValueCacheOptions {
  flushIntervalMs?: number;
}

/**
 * Coalesces frequently changing UI values such as counters and alerts.
 * Consumers receive the newest value only, which is ideal for dashboard chrome.
 */
export class SimulationLatestValueCache<T> {
  private value: T | null = null;
  private lastFlush = 0;
  private readonly flushIntervalMs: number;

  constructor(options: SimulationLatestValueCacheOptions = {}) {
    this.flushIntervalMs = Math.max(0, options.flushIntervalMs ?? 100);
  }

  public set(value: T) {
    this.value = value;
  }

  public shouldFlush(now = performance.now()) {
    return this.value !== null && now - this.lastFlush >= this.flushIntervalMs;
  }

  public flush(now = performance.now()) {
    if (this.value === null) return null;

    const value = this.value;
    this.value = null;
    this.lastFlush = now;
    return value;
  }

  public reset(now = performance.now()) {
    this.value = null;
    this.lastFlush = now;
  }
}
