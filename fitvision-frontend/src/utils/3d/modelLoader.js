// src/utils/3d/modelLoader.js
// GLTF/GLB model loading with caching and fallback

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

// Model cache
const modelCache = new Map();

/**
 * Load a GLTF/GLB model with caching
 */
export async function loadGLTFModel(url) {
  if (modelCache.has(url)) {
    const cached = modelCache.get(url);
    // CRITICAL: Clone scene but keep animations linked
    // Each instance needs its own scene clone, but animations can reference the same structure
    return {
      scene: cached.scene.clone(true), // Clone scene for new instance
      animations: cached.animations.map(clip => clip.clone()), // Clone animations too
    };
  }

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    console.log(`📥 Starting to load GLTF from: ${url}`);
    
    loader.load(
      url,
      (gltf) => {
        console.log(`✅ GLTF loaded successfully: ${url}`, {
          scene: gltf.scene,
          animations: gltf.animations,
          sceneChildren: gltf.scene.children.length,
          animationCount: gltf.animations.length,
          animationNames: gltf.animations.map(a => a.name),
        });
        
        // Debug: Check animation tracks
        if (gltf.animations.length > 0) {
          const firstAnim = gltf.animations[0];
          const trackTargets = firstAnim.tracks.map(t => {
            const parts = t.name.split('.');
            return parts[0]; // Get object name
          }).filter((v, i, a) => a.indexOf(v) === i);
          console.log(`🎬 Animation track targets:`, trackTargets.slice(0, 5));
        }
        
        // CRITICAL: For animations to work, we need to be careful with cloning
        // Animations reference objects by name/UUID, so cloned scenes need matching structure
        const clonedScene = gltf.scene.clone(true);
        
        // Clone animations - they will reference objects by name, which should work with cloned scene
        const clonedAnimations = gltf.animations.map(clip => clip.clone());
        
        modelCache.set(url, {
          scene: clonedScene,
          animations: clonedAnimations,
        });
        
        // CRITICAL: Return the cloned scene directly, don't clone again
        // Multiple clones break the name/UUID references that animations use
        resolve({
          scene: clonedScene, // Don't clone again - use the same cloned scene
          animations: clonedAnimations, // Use the same cloned animations
        });
      },
      (progress) => {
        // Progress callback
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`⏳ Loading ${url}: ${percent}% (${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB)`);
        } else {
          console.log(`⏳ Loading ${url}: ${(progress.loaded / 1024 / 1024).toFixed(2)}MB loaded...`);
        }
      },
      (error) => {
        console.error(`❌ Failed to load model ${url}:`, error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          type: error.type,
        });
        reject(error);
      }
    );
  });
}

/**
 * Create an improved primitive human body shape as fallback
 * Better proportions and smoother appearance
 */
export function createPrimitiveBody() {
  const group = new THREE.Group();

  // Improved materials with better shading
  const skinMaterial = new THREE.MeshStandardMaterial({ 
    color: "#fdbcb4",
    roughness: 0.7,
    metalness: 0.1,
  });

  // Main torso - more rounded
  const torsoGeometry = new THREE.BoxGeometry(0.7, 1.1, 0.35, 4, 4, 2);
  const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
  torso.position.set(0, 1.0, 0);
  // Smooth edges
  torso.geometry.computeVertexNormals();
  group.add(torso);

  // Head - better proportioned
  const headGeometry = new THREE.SphereGeometry(0.22, 24, 24);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.set(0, 1.75, 0);
  group.add(head);

  // Neck
  const neckGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 12);
  const neck = new THREE.Mesh(neckGeometry, skinMaterial);
  neck.position.set(0, 1.6, 0);
  group.add(neck);

  // Shoulders - more defined
  const shoulderGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const leftShoulder = new THREE.Mesh(shoulderGeometry, skinMaterial);
  leftShoulder.position.set(-0.4, 1.3, 0);
  group.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(shoulderGeometry, skinMaterial);
  rightShoulder.position.set(0.4, 1.3, 0);
  group.add(rightShoulder);

  // Upper arms - tapered
  const upperArmGeometry = new THREE.CylinderGeometry(0.09, 0.11, 0.35, 12);
  const leftUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
  leftUpperArm.position.set(-0.5, 1.1, 0);
  leftUpperArm.rotation.z = Math.PI / 5;
  group.add(leftUpperArm);

  const rightUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
  rightUpperArm.position.set(0.5, 1.1, 0);
  rightUpperArm.rotation.z = -Math.PI / 5;
  group.add(rightUpperArm);

  // Lower arms - thinner
  const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.09, 0.4, 12);
  const leftLowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
  leftLowerArm.position.set(-0.65, 0.85, 0);
  leftLowerArm.rotation.z = Math.PI / 5;
  group.add(leftLowerArm);

  const rightLowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
  rightLowerArm.position.set(0.65, 0.85, 0);
  rightLowerArm.rotation.z = -Math.PI / 5;
  group.add(rightLowerArm);

  // Hands - simple spheres
  const handGeometry = new THREE.SphereGeometry(0.08, 12, 12);
  const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
  leftHand.position.set(-0.75, 0.65, 0);
  group.add(leftHand);

  const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
  rightHand.position.set(0.75, 0.65, 0);
  group.add(rightHand);

  // Hips
  const hipGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.4, 2, 2, 2);
  const hips = new THREE.Mesh(hipGeometry, skinMaterial);
  hips.position.set(0, 0.4, 0);
  hips.geometry.computeVertexNormals();
  group.add(hips);

  // Upper legs - thicker
  const upperLegGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.5, 12);
  const leftUpperLeg = new THREE.Mesh(upperLegGeometry, skinMaterial);
  leftUpperLeg.position.set(-0.18, 0.1, 0);
  group.add(leftUpperLeg);

  const rightUpperLeg = new THREE.Mesh(upperLegGeometry, skinMaterial);
  rightUpperLeg.position.set(0.18, 0.1, 0);
  group.add(rightUpperLeg);

  // Lower legs - thinner
  const lowerLegGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 12);
  const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, skinMaterial);
  leftLowerLeg.position.set(-0.18, -0.35, 0);
  group.add(leftLowerLeg);

  const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, skinMaterial);
  rightLowerLeg.position.set(0.18, -0.35, 0);
  group.add(rightLowerLeg);

  // Feet
  const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3, 2, 1, 2);
  const leftFoot = new THREE.Mesh(footGeometry, skinMaterial);
  leftFoot.position.set(-0.18, -0.65, 0.1);
  leftFoot.geometry.computeVertexNormals();
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeometry, skinMaterial);
  rightFoot.position.set(0.18, -0.65, 0.1);
  rightFoot.geometry.computeVertexNormals();
  group.add(rightFoot);

  return group;
}

/**
 * Create a primitive muscle group shape
 */
export function createPrimitiveMuscle(muscleGroup, position, scale) {
  const geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
  const material = new THREE.MeshStandardMaterial({
    color: muscleGroup.color || "#a3a3a3",
    emissive: muscleGroup.color || "#a3a3a3",
    emissiveIntensity: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  return mesh;
}

/**
 * Load model with fallback to primitive
 */
export async function loadModelWithFallback(modelUrl, fallbackFn) {
  if (!modelUrl) {
    console.warn("⚠️ No model URL provided, using fallback");
    const primitive = fallbackFn ? fallbackFn() : createPrimitiveBody();
    return { model: primitive, animations: [], isPrimitive: true };
  }

  console.log(`🔄 Attempting to load GLTF model from: ${modelUrl}`);
  
  try {
    // Try loading the model
    const gltfData = await loadGLTFModel(modelUrl);
    console.log(`✅ Successfully loaded GLTF model: ${modelUrl}`, {
      hasAnimations: gltfData.animations?.length > 0,
      animationCount: gltfData.animations?.length || 0,
      animationNames: gltfData.animations?.map(a => a.name) || [],
      sceneChildren: gltfData.scene.children.length
    });
    return { 
      model: gltfData.scene, 
      animations: gltfData.animations || [],
      isPrimitive: false 
    };
  } catch (error) {
    console.error(`❌ Failed to load GLTF model ${modelUrl}:`, error);
    
    // Try case variations if it's a file path
    if (modelUrl.includes('/models/exercises/')) {
      const urlParts = modelUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const basePath = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
      
      // Try different case variations
      const variations = [
        filename.toLowerCase(), // squat.glb
        filename.charAt(0).toUpperCase() + filename.slice(1).toLowerCase(), // Squat.glb
        filename.toUpperCase(), // SQUAT.GLB
      ];
      
      for (const variant of variations) {
        if (variant === filename) continue; // Skip if same as original
        const altUrl = basePath + variant;
        try {
          console.log(`🔄 Trying alternative case: ${altUrl}`);
          const gltfData = await loadGLTFModel(altUrl);
          console.log(`✅ Successfully loaded with alternative case: ${altUrl}`);
          return { 
            model: gltfData.scene, 
            animations: gltfData.animations || [],
            isPrimitive: false 
          };
        } catch (e) {
          console.log(`⚠️ Alternative case failed: ${altUrl}`, e.message);
        }
      }
    }
  }

  // Use fallback
  console.warn("📦 All attempts failed, using primitive fallback model");
  const primitive = fallbackFn ? fallbackFn() : createPrimitiveBody();
  return { model: primitive, animations: [], isPrimitive: true };
}

/**
 * Clear model cache
 */
export function clearModelCache() {
  modelCache.clear();
}

