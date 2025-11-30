// src/utils/3d/highlightSystem.js
// Muscle highlighting system with glow effects

import * as THREE from "three";
import { getMuscleColor, getColorWithIntensity } from "./muscleMapping.js";

/**
 * Add glow effect to a mesh
 */
export function addGlowEffect(mesh, color, intensity = 1.0) {
  // Create emissive material
  if (mesh.material) {
    mesh.material.emissive = new THREE.Color(color);
    mesh.material.emissiveIntensity = intensity * 0.3;
    mesh.material.needsUpdate = true;
  }

  // Create outline effect using a slightly larger mesh
  const outlineGeometry = mesh.geometry.clone();
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3,
  });
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.scale.multiplyScalar(1.05);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);

  return outline;
}

/**
 * Remove glow effect
 */
export function removeGlowEffect(mesh, outline) {
  if (mesh.material) {
    mesh.material.emissive = new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = 0;
    mesh.material.needsUpdate = true;
  }
  if (outline) {
    outline.parent?.remove(outline);
    outline.geometry.dispose();
    outline.material.dispose();
  }
}

/**
 * Highlight muscle groups
 */
export function highlightMuscleGroups(meshes, muscleGroups, intensity = 1.0) {
  const highlights = [];

  muscleGroups.forEach((muscleGroup) => {
    const color = getMuscleColor(muscleGroup);
    const highlightedColor = getColorWithIntensity(color, intensity);

    // Find or create mesh for this muscle group
    const mesh = meshes.find((m) => m.userData.muscleGroup === muscleGroup);
    if (mesh) {
      const outline = addGlowEffect(mesh, highlightedColor, intensity);
      highlights.push({ mesh, outline, muscleGroup });
    }
  });

  return highlights;
}

/**
 * Animate highlight pulse
 */
export function animateHighlightPulse(mesh, color, speed = 1.0) {
  let time = 0;

  return function update(delta) {
    time += delta * speed;
    const pulse = (Math.sin(time) + 1) / 2; // 0 to 1
    const intensity = 0.5 + pulse * 0.5; // 0.5 to 1.0

    if (mesh.material) {
      mesh.material.emissiveIntensity = intensity * 0.3;
    }
  };
}

/**
 * Create click detection for muscle groups
 */
export function setupClickDetection(raycaster, camera, scene, onMuscleClick) {
  return function handleClick(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const object = intersects[0].object;
      const muscleGroup = object.userData.muscleGroup;
      if (muscleGroup && onMuscleClick) {
        onMuscleClick(muscleGroup, object);
      }
    }
  };
}

/**
 * Create tooltip for muscle group
 */
export function createTooltip(muscleGroup, position) {
  const tooltip = document.createElement("div");
  tooltip.className =
    "absolute bg-slate-800 text-white text-xs px-2 py-1 rounded pointer-events-none z-50";
  tooltip.textContent = muscleGroup;
  tooltip.style.left = `${position.x}px`;
  tooltip.style.top = `${position.y}px`;
  document.body.appendChild(tooltip);

  return tooltip;
}

/**
 * Remove tooltip
 */
export function removeTooltip(tooltip) {
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

