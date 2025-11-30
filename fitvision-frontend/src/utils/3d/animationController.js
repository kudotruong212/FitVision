// src/utils/3d/animationController.js
// Animation controller for 3D models

import * as THREE from "three";

export class AnimationController {
  constructor(mixer, animations = []) {
    this.mixer = mixer;
    this.animations = animations;
    this.actions = {};
    this.currentAction = null;
    this.isPlaying = false;
    this.speed = 1.0;
    this.loopMode = THREE.LoopRepeat;
  }

  /**
   * Create actions from animations
   */
  createActions() {
    this.animations.forEach((clip) => {
      // CRITICAL: clipAction needs the correct root object
      // If clip has tracks, check what object they target
      const action = this.mixer.clipAction(clip);
      action.setLoop(this.loopMode, Infinity);
      action.setEffectiveTimeScale(this.speed);
      // CRITICAL: Ensure action is enabled and has weight
      action.enabled = true;
      action.setEffectiveWeight(1.0);
      this.actions[clip.name] = action;
      
      // Debug: Check what the animation targets
      const tracks = clip.tracks || [];
      const targetNames = tracks.map(t => {
        const parts = t.name.split('.');
        return parts[0]; // Get object name from track path
      }).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
      console.log(`🎬 Created action: ${clip.name}, enabled: ${action.enabled}, weight: ${action.getEffectiveWeight()}, tracks: ${tracks.length}, target objects: ${targetNames.join(', ')}`);
      
      // CRITICAL: Verify action is bound correctly
      // Check if action's root matches mixer's root
      if (action._localRoot) {
        console.log(`🎬 Action root: ${action._localRoot.name || action._localRoot.type}, UUID: ${action._localRoot.uuid}`);
      }
    });

    // Use first animation as default
    if (this.animations.length > 0) {
      this.currentAction = this.actions[this.animations[0].name];
      console.log(`✅ Default action set: ${this.currentAction.getClip().name}`);
    }
  }

  /**
   * Play animation
   */
  play(animationName = null) {
    if (animationName && this.actions[animationName]) {
      // Fade out current action if switching
      if (this.currentAction && this.currentAction !== this.actions[animationName]) {
        this.fadeOut(this.currentAction, 0.2);
      }
      this.currentAction = this.actions[animationName];
    }

    if (this.currentAction) {
      // CRITICAL: Always ensure action is enabled and not paused
      this.currentAction.enabled = true;
      this.currentAction.setEffectiveWeight(1.0);
      this.currentAction.paused = false; // CRITICAL: Unpause first
      
      // Ensure action is set up correctly
      if (!this.currentAction.isRunning()) {
        // Action not running - start it
        // CRITICAL: play() must be called to add action to mixer's active actions
        // Also ensure action is not stopped
        this.currentAction.stop(); // Stop first to reset
        this.currentAction.reset(); // Reset to beginning
        this.currentAction.play(); // Start playing
        this.fadeIn(this.currentAction, 0.2);
        console.log(`▶️ Starting animation: ${this.currentAction.getClip().name}, isRunning: ${this.currentAction.isRunning()}`);
      } else {
        // If already running, just ensure it's not paused
        this.currentAction.paused = false;
        // Also ensure it's not stopped
        if (this.currentAction.getEffectiveWeight() === 0) {
          this.currentAction.setEffectiveWeight(1.0);
        }
        console.log(`▶️ Resuming animation: ${this.currentAction.getClip().name}, isRunning: ${this.currentAction.isRunning()}`);
      }
      
      // Double-check: Force unpause and enable
      this.currentAction.paused = false;
      this.currentAction.enabled = true;
      this.isPlaying = true;
      
      // Debug: Check mixer state
      if (this.mixer) {
        const activeActions = this.mixer._actions || [];
        console.log(`▶️ Mixer state: time=${this.mixer.time.toFixed(2)}, active actions count=${activeActions.length}, action in mixer: ${activeActions.includes(this.currentAction)}`);
      }
      
      console.log(`▶️ Animation state AFTER play: name=${this.currentAction.getClip().name}, paused=${this.currentAction.paused}, time=${this.currentAction.time.toFixed(2)}, enabled=${this.currentAction.enabled}, weight=${this.currentAction.getEffectiveWeight().toFixed(2)}, isRunning=${this.currentAction.isRunning()}`);
    } else {
      console.warn("⚠️ No current action to play. Available actions:", Object.keys(this.actions));
    }
  }

  /**
   * Pause animation
   */
  pause() {
    if (this.currentAction) {
      this.currentAction.paused = true;
      this.isPlaying = false;
    }
  }

  /**
   * Resume animation
   */
  resume() {
    if (this.currentAction) {
      this.currentAction.paused = false;
      this.isPlaying = true;
    }
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.currentAction) {
      this.fadeOut(this.currentAction, 0.2);
      this.currentAction.stop();
      this.isPlaying = false;
    }
  }

  /**
   * Reset animation to start
   */
  reset() {
    if (this.currentAction) {
      this.currentAction.reset();
      this.currentAction.time = 0;
    }
  }

  /**
   * Set animation speed
   */
  setSpeed(speed) {
    this.speed = speed;
    Object.values(this.actions).forEach((action) => {
      action.setEffectiveTimeScale(speed);
    });
  }

  /**
   * Set loop mode
   */
  setLoopMode(mode) {
    this.loopMode = mode;
    Object.values(this.actions).forEach((action) => {
      action.setLoop(mode, Infinity);
    });
  }

  /**
   * Fade in animation
   */
  fadeIn(action, duration) {
    action.reset();
    action.fadeIn(duration);
  }

  /**
   * Fade out animation
   */
  fadeOut(action, duration) {
    action.fadeOut(duration);
  }

  /**
   * Update mixer (call in render loop)
   */
  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  /**
   * Set animation time (for step-by-step mode)
   */
  setTime(time) {
    if (this.currentAction) {
      this.currentAction.time = time;
      this.currentAction.paused = true;
    }
  }

  /**
   * Get current animation time
   */
  getTime() {
    if (this.currentAction) {
      return this.currentAction.time;
    }
    return 0;
  }

  /**
   * Get animation duration
   */
  getDuration() {
    if (this.currentAction && this.currentAction.getClip()) {
      return this.currentAction.getClip().duration;
    }
    return 0;
  }

  /**
   * Get available animation names
   */
  getAnimationNames() {
    return Object.keys(this.actions);
  }

  /**
   * Check if animation exists
   */
  hasAnimation(name) {
    return name in this.actions;
  }
}

/**
 * Create keyframe animation for primitive shapes
 * Duration is calculated based on number of keyframes for smooth motion
 */
export function createKeyframeAnimation(object, keyframes, duration = null) {
  // Auto-calculate duration: more keyframes = longer duration for smooth motion
  const finalDuration = duration || Math.max(2, keyframes.length * 0.4);
  const times = [];
  const positions = [];
  const rotationsX = [];
  const rotationsY = [];
  const rotationsZ = [];

  keyframes.forEach((frame, index) => {
    const time = (index / (keyframes.length - 1)) * finalDuration;
    times.push(time);
    positions.push(frame.position.x, frame.position.y, frame.position.z);
    rotationsX.push(frame.rotation.x || 0);
    rotationsY.push(frame.rotation.y || 0);
    rotationsZ.push(frame.rotation.z || 0);
  });

  const positionTrack = new THREE.VectorKeyframeTrack(
    ".position",
    times,
    positions
  );
  
  // Use NumberKeyframeTrack for rotation (Euler angles)
  const rotationXTrack = new THREE.NumberKeyframeTrack(
    ".rotation[x]",
    times,
    rotationsX
  );
  const rotationYTrack = new THREE.NumberKeyframeTrack(
    ".rotation[y]",
    times,
    rotationsY
  );
  const rotationZTrack = new THREE.NumberKeyframeTrack(
    ".rotation[z]",
    times,
    rotationsZ
  );

  const clip = new THREE.AnimationClip("primitiveAnimation", finalDuration, [
    positionTrack,
    rotationXTrack,
    rotationYTrack,
    rotationZTrack,
  ]);

  return clip;
}

/**
 * Create exercise animation keyframes with accurate movements
 * Based on real exercise form and biomechanics
 */
export function createExerciseKeyframes(exerciseType) {
  const keyframes = {
    // Squat - proper form: feet shoulder-width, descend with hips back, knees track toes
    squat: [
      // Start position (standing)
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Quarter down
      { position: { x: 0, y: 0.85, z: 0.05 }, rotation: { x: 0.1, y: 0, z: 0 } },
      // Half down
      { position: { x: 0, y: 0.65, z: 0.1 }, rotation: { x: 0.2, y: 0, z: 0 } },
      // Bottom (parallel or below)
      { position: { x: 0, y: 0.4, z: 0.12 }, rotation: { x: 0.25, y: 0, z: 0 } },
      // Half up
      { position: { x: 0, y: 0.65, z: 0.1 }, rotation: { x: 0.2, y: 0, z: 0 } },
      // Quarter up
      { position: { x: 0, y: 0.85, z: 0.05 }, rotation: { x: 0.1, y: 0, z: 0 } },
      // Back to start
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Push-up - proper form: straight line from head to heels, controlled descent/ascent
    "push-up": [
      // Top position (arms extended)
      { position: { x: 0, y: 0.9, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Quarter down
      { position: { x: 0, y: 0.85, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Half down
      { position: { x: 0, y: 0.75, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Bottom (chest nearly touches ground)
      { position: { x: 0, y: 0.65, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Half up
      { position: { x: 0, y: 0.75, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Quarter up
      { position: { x: 0, y: 0.85, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Back to top
      { position: { x: 0, y: 0.9, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Plank - static hold position
    plank: [
      { position: { x: 0, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Goblet Squat - similar to squat but holding weight in front
    "goblet-squat": [
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      { position: { x: 0, y: 0.85, z: 0.05 }, rotation: { x: 0.1, y: 0, z: 0 } },
      { position: { x: 0, y: 0.65, z: 0.1 }, rotation: { x: 0.2, y: 0, z: 0 } },
      { position: { x: 0, y: 0.45, z: 0.12 }, rotation: { x: 0.25, y: 0, z: 0 } },
      { position: { x: 0, y: 0.65, z: 0.1 }, rotation: { x: 0.2, y: 0, z: 0 } },
      { position: { x: 0, y: 0.85, z: 0.05 }, rotation: { x: 0.1, y: 0, z: 0 } },
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Seated Row - pulling motion while seated
    "seated-row": [
      // Start (arms extended)
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Pulling back
      { position: { x: 0, y: 1.0, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 } },
      // Full contraction
      { position: { x: 0, y: 1.0, z: -0.15 }, rotation: { x: 0, y: 0, z: 0 } },
      // Release
      { position: { x: 0, y: 1.0, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 } },
      // Back to start
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Face Pull - pulling cable/band to face level
    "face-pull": [
      // Start (arms extended forward)
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Pulling to face
      { position: { x: 0, y: 1.1, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 } },
      // Full contraction (elbows high, hands at face)
      { position: { x: 0, y: 1.15, z: -0.12 }, rotation: { x: 0, y: 0, z: 0 } },
      // Release
      { position: { x: 0, y: 1.1, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 } },
      // Back to start
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Dead Bug - lying down, alternating arm/leg extension
    "dead-bug": [
      // Start (lying, arms and legs up)
      { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: -0.3, y: 0, z: 0 } },
      // Extend right arm + left leg
      { position: { x: 0.1, y: 0.5, z: 0 }, rotation: { x: -0.3, y: 0, z: 0.05 } },
      // Return
      { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: -0.3, y: 0, z: 0 } },
      // Extend left arm + right leg
      { position: { x: -0.1, y: 0.5, z: 0 }, rotation: { x: -0.3, y: 0, z: -0.05 } },
      // Return
      { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: -0.3, y: 0, z: 0 } },
    ],
    
    // Lat Pulldown - pulling bar down to chest
    "lat-pulldown": [
      // Start (arms up)
      { position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Pulling down
      { position: { x: 0, y: 1.1, z: -0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      // Full contraction (bar to chest)
      { position: { x: 0, y: 1.0, z: -0.08 }, rotation: { x: 0, y: 0, z: 0 } },
      // Release
      { position: { x: 0, y: 1.1, z: -0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      // Back to start
      { position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    // Band Pull Apart - pulling band apart horizontally
    "band-pull-apart": [
      // Start (arms extended forward)
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      // Pulling apart
      { position: { x: 0, y: 1.0, z: -0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      // Full extension (arms wide)
      { position: { x: 0, y: 1.0, z: -0.08 }, rotation: { x: 0, y: 0, z: 0 } },
      // Return
      { position: { x: 0, y: 1.0, z: -0.05 }, rotation: { x: 0, y: 0, z: 0 } },
      // Back to start
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
    
    default: [
      { position: { x: 0, y: 1.0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ],
  };

  return keyframes[exerciseType] || keyframes.default;
}

