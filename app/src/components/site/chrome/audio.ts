// Ambient sound for the story (client only, created on the visitor's first gesture).
// One seamless loop (the roastery ambience, plays through the whole story) on its
// own gain node, faded with WebAudio ramps, plus a procedural first-crack crackle:
// short noise bursts through a bandpass. Sound is on by default, but browsers only let audio start
// from a gesture, so the context is created on the first one (unlock). The loops
// themselves are downloaded by the preloader, so the sound starts at once.
import { useSyncExternalStore } from "react";

export type Bed = "roaster";

const SOURCES: Record<Bed, string> = {
  roaster: "/assets/audio/roaster.mp3",
};
/** The loop the preloader downloads with the films. */
export const AUDIO_SOURCES = [SOURCES.roaster];
const LEVEL: Record<Bed, number> = { roaster: 0.5 };

interface Channel {
  gain: GainNode;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  loading: Promise<void> | null;
}

type AudioCtor = typeof AudioContext;

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = new Map<Bed, Channel>();
  private noise: AudioBuffer | null = null;
  private enabled = false;
  private hidden = false;
  /** Out of the story (other pages, the home sections after it): silent, preference kept. */
  private suspended = false;
  private bed: Bed = "roaster";
  private suspendTimer = 0;
  /** A gesture has happened, so the context may be created and started. */
  private unlocked = false;
  /** The context has run at least once: the browser has let audio start. */
  private started = false;
  private listeners = new Set<() => void>();

  /** Create (or wake) the context. Call from inside a user gesture. */
  unlock() {
    this.unlocked = true;
    if (!this.ensure()) return;
    if (this.ctx && this.ctx.state === "suspended" && this.audible()) {
      void this.ctx.resume().catch(() => undefined);
    }
    this.apply();
    this.noteStarted();
  }

  /** Audio has been allowed to start (until then, sound "on" is only a setting). */
  isStarted() {
    return this.started;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private noteStarted() {
    if (this.started || this.ctx?.state !== "running") return;
    this.started = true;
    for (const listener of this.listeners) listener();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on && this.unlocked) this.ensure();
    this.apply();
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.apply();
  }

  /** Ramp to silence and sleep the context while the visitor is outside the story; wake on return. */
  setSuspended(suspended: boolean) {
    if (suspended === this.suspended) return;
    this.suspended = suspended;
    this.apply();
  }

  private audible() {
    return this.enabled && !this.hidden && !this.suspended;
  }

  /** One soft crackle: the beans' first crack. */
  crackle() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.audible() || ctx.state !== "running") return;
    const noise = this.noiseBuffer(ctx);
    const t0 = ctx.currentTime + 0.03;
    const pops = 16 + Math.floor(Math.random() * 10);
    for (let i = 0; i < pops; i += 1) {
      // Clustered toward the start, thinning out, like the real thing.
      const t = t0 + Math.pow(Math.random(), 1.6) * 1.9;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1400 + Math.random() * 3600;
      band.Q.value = 0.8 + Math.random() * 2.6;
      const env = ctx.createGain();
      const peak = 0.05 + Math.random() * 0.16;
      const decay = 0.012 + Math.random() * 0.05;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(peak, t + 0.0025);
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(band);
      band.connect(env);
      env.connect(master);
      src.start(t, Math.random() * 0.2, decay + 0.02);
      src.onended = () => {
        src.disconnect();
        band.disconnect();
        env.disconnect();
      };
    }
  }

  private ensure() {
    if (this.ctx) return true;
    if (typeof window === "undefined") return false;
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return false;
    try {
      const ctx = new Ctor();
      // Safari can resume a gesture-created context a moment later.
      ctx.addEventListener("statechange", () => this.noteStarted());
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      for (const bed of Object.keys(SOURCES) as Bed[]) {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(master);
        this.channels.set(bed, { gain, buffer: null, source: null, loading: null });
      }
      this.ctx = ctx;
      this.master = master;
      return true;
    } catch {
      return false;
    }
  }

  private load(bed: Bed) {
    const ctx = this.ctx;
    const channel = this.channels.get(bed);
    if (!ctx || !channel) return Promise.resolve();
    if (channel.loading) return channel.loading;
    // The preloader has usually downloaded the loop already (clip-preload.ts).
    const shared = window.__platoClip?.(SOURCES[bed]);
    const data = shared
      ? shared.blob.then((blob) => blob.arrayBuffer())
      : fetch(SOURCES[bed]).then((res) => {
          if (!res.ok) throw new Error(`Audio ${res.status}`);
          return res.arrayBuffer();
        });
    channel.loading = data
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((buffer) => {
        channel.buffer = buffer;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        // Trim the codec padding at both ends so the loop point is seamless.
        source.loopStart = Math.min(0.05, buffer.duration / 4);
        source.loopEnd = Math.max(source.loopStart + 0.1, buffer.duration - 0.05);
        source.connect(channel.gain);
        source.start(0, source.loopStart);
        channel.source = source;
      })
      .catch(() => {
        // A missing or undecodable loop simply stays silent; allow a retry later.
        channel.loading = null;
      });
    return channel.loading;
  }

  private apply() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const audible = this.audible();
    const now = ctx.currentTime;
    window.clearTimeout(this.suspendTimer);

    if (audible) {
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      void this.load(this.bed);
    }

    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.setTargetAtTime(audible ? 1 : 0, now, audible ? 0.45 : 0.22);

    for (const [bed, channel] of this.channels) {
      const g = channel.gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      // A slow swell in (the master gain does the fading in and out).
      g.setTargetAtTime(bed === this.bed ? LEVEL[bed] : 0, now, 0.9);
    }

    if (!audible) {
      // Let the fade finish, then sleep the context to save battery.
      this.suspendTimer = window.setTimeout(() => {
        if (!this.audible() && this.ctx?.state === "running")
          void this.ctx.suspend().catch(() => undefined);
      }, 1400);
    }
  }

  private noiseBuffer(ctx: AudioContext) {
    if (this.noise) return this.noise;
    const length = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }
}

let engine: AmbientEngine | null = null;

/** The shared engine (lazy; safe to call during SSR, does nothing until used in the browser). */
export function ambient() {
  if (!engine) engine = new AmbientEngine();
  return engine;
}

const subscribeStarted = (listener: () => void) => ambient().subscribe(listener);
const startedSnapshot = () => ambient().isStarted();
const serverStarted = () => false;

/** True once the browser has let the ambience start (the first gesture with sound on). */
export function useAudioStarted() {
  return useSyncExternalStore(subscribeStarted, startedSnapshot, serverStarted);
}
