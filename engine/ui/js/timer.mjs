// engine/ui/js/timer.mjs — honest QA attention timer.
// Counts real wall-clock seconds a post was actually looked at: paused on
// window blur / tab hidden, stopped after 60s of no activity, resumed on
// activity. Never rounds up, never invents time. Flushes whole seconds only,
// carrying fractional remainder so nothing is ever double-counted or lost.

const IDLE_LIMIT_MS = 60_000;
const TICK_MS = 250;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"];

export class QaTimer {
  /**
   * @param {(wholeSeconds:number)=>void} onFlushSeconds called with an integer
   *   number of newly-elapsed seconds to add (delta, not total).
   */
  constructor(onFlushSeconds) {
    this.onFlushSeconds = onFlushSeconds;
    this.running = false;
    this.idlePaused = false;
    this.windowFocused = document.hasFocus();
    this.visible = document.visibilityState === "visible";
    this._unflushed = 0; // fractional seconds accumulated, not yet sent
    this._lastTick = null;
    this._lastActivity = performance.now();
    this._interval = null;
    this._bound = {
      activity: () => this._onActivity(),
      blur: () => this._onBlur(),
      focus: () => this._onFocus(),
      visibility: () => this._onVisibility(),
    };
  }

  attach() {
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, this._bound.activity, { passive: true }));
    window.addEventListener("blur", this._bound.blur);
    window.addEventListener("focus", this._bound.focus);
    document.addEventListener("visibilitychange", this._bound.visibility);
    this._interval = setInterval(() => this._tick(), TICK_MS);
    this._lastTick = performance.now();
    this._evaluate();
  }

  detach() {
    ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, this._bound.activity));
    window.removeEventListener("blur", this._bound.blur);
    window.removeEventListener("focus", this._bound.focus);
    document.removeEventListener("visibilitychange", this._bound.visibility);
    clearInterval(this._interval);
    this._interval = null;
    this.flush(); // send whatever whole seconds are owed, drop the fraction
  }

  /** Whole seconds currently accrued and not yet flushed — for display only. */
  get displaySeconds() {
    return Math.floor(this._unflushed);
  }

  _onActivity() {
    this._lastActivity = performance.now();
    if (this.idlePaused) {
      this.idlePaused = false;
      this._lastTick = performance.now(); // don't count the idle gap
    }
    this._evaluate();
  }

  _onBlur() {
    this.windowFocused = false;
    this._evaluate();
  }

  _onFocus() {
    this.windowFocused = true;
    this._lastActivity = performance.now();
    this._lastTick = performance.now();
    this._evaluate();
  }

  _onVisibility() {
    this.visible = document.visibilityState === "visible";
    if (this.visible) this._lastTick = performance.now();
    this._evaluate();
  }

  _evaluate() {
    this.running = this.windowFocused && this.visible && !this.idlePaused;
  }

  _tick() {
    const now = performance.now();
    const idleFor = now - this._lastActivity;
    if (idleFor > IDLE_LIMIT_MS && !this.idlePaused) {
      this.idlePaused = true;
      this._evaluate();
    }

    if (this.running) {
      const deltaMs = now - this._lastTick;
      this._unflushed += deltaMs / 1000;
    }
    this._lastTick = now;

    // Flush only whole completed seconds — never round up.
    const whole = Math.floor(this._unflushed);
    if (whole > 0) {
      this._unflushed -= whole;
      this.onFlushSeconds(whole);
    }
  }

  /** Force-flush any owed whole seconds right now (e.g. before navigating away). */
  flush() {
    const whole = Math.floor(this._unflushed);
    if (whole > 0) {
      this._unflushed -= whole;
      this.onFlushSeconds(whole);
    }
  }
}
