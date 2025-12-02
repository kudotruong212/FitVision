// src/components/3d/WorkoutPlanViewer3D.jsx
// Workout plan visualization with interactive muscle filtering

import React, { useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import BaseViewer3D from "./BaseViewer3D.jsx";
import { createPrimitiveBody, loadModelWithFallback } from "../../utils/3d/modelLoader.js";
import { 
  normalizeMuscleNames, 
  getMuscleColor, 
  getMusclePosition, 
  getMuscleScale 
} from "../../utils/3d/muscleMapping.js";
import { MUSCLE_GROUPS, EXERCISE_TO_MUSCLES } from "../../data/muscleData.js";

/**
 * Get muscle groups from workout plan
 */
function getMuscleGroupsFromPlan(plan) {
  if (!plan) return [];

  const muscleGroups = new Set();

  // From focus_areas
  if (plan.focus_areas && Array.isArray(plan.focus_areas)) {
    plan.focus_areas.forEach((area) => {
      const normalized = normalizeMuscleNames([area]);
      normalized.forEach((mg) => muscleGroups.add(mg));
    });
  }

  // From sessions and exercises
  if (plan.sessions && Array.isArray(plan.sessions)) {
    plan.sessions.forEach((session) => {
      if (session.exercises && Array.isArray(session.exercises)) {
        session.exercises.forEach((ex) => {
          if (ex.slug) {
            const muscles = EXERCISE_TO_MUSCLES[ex.slug];
            if (muscles) {
              // Handle both old array format and new object format
              if (Array.isArray(muscles)) {
                muscles.forEach((mg) => muscleGroups.add(mg));
              } else {
                // New object format - get keys
                Object.keys(muscles).forEach((mg) => muscleGroups.add(mg));
              }
            }
          }
          if (ex.muscle_group) {
            const normalized = normalizeMuscleNames([ex.muscle_group]);
            normalized.forEach((mg) => muscleGroups.add(mg));
          }
        });
      }
    });
  }

  return Array.from(muscleGroups);
}

/**
 * Get intensity for a muscle group based on plan
 */
function getMuscleIntensity(muscleGroup, plan) {
  if (!plan || !plan.sessions) return 0.5;

  let totalCount = 0;
  let muscleCount = 0;

  plan.sessions.forEach((session) => {
    if (session.exercises && Array.isArray(session.exercises)) {
      session.exercises.forEach((ex) => {
        totalCount++;
        let muscles = [];
        if (ex.slug) {
          const mapping = EXERCISE_TO_MUSCLES[ex.slug];
          if (mapping) {
            // Handle both old array format and new object format
            if (Array.isArray(mapping)) {
              muscles = mapping;
            } else {
              // New object format - get keys
              muscles = Object.keys(mapping);
            }
          }
        } else if (ex.muscle_group) {
          muscles = normalizeMuscleNames([ex.muscle_group]);
        }
        if (muscles.includes(muscleGroup)) {
          muscleCount++;
        }
      });
    }
  });

  return totalCount > 0 ? muscleCount / totalCount : 0.5;
}

/**
 * Workout plan body model with muscle highlights
 */
function PlanBodyModel({ 
  modelUrl, 
  plan,
  selectedMuscleGroup
}) {
  const groupRef = useRef();
  const [model, setModel] = useState(null);
  const highlightsRef = useRef([]);

  // Load model
  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        const result = await loadModelWithFallback(
          modelUrl,
          () => createPrimitiveBody()
        );
        
        if (mounted) {
          setModel(result.model);
        }
      } catch (error) {
        console.error("Failed to load body model:", error);
        if (mounted) {
          const fallback = createPrimitiveBody();
          setModel(fallback);
        }
      }
    }

    loadModel();

    return () => {
      mounted = false;
    };
  }, [modelUrl]);

  // Setup muscle highlights
  useEffect(() => {
    if (!model || !plan) return;

    // Clear previous highlights
    highlightsRef.current.forEach(({ outline }) => {
      if (outline && outline.parent) {
        outline.parent.remove(outline);
        outline.geometry?.dispose();
        outline.material?.dispose();
      }
    });
    highlightsRef.current = [];

    const muscleGroups = getMuscleGroupsFromPlan(plan);
    const newMeshes = [];
    const newHighlights = [];

    muscleGroups.forEach((muscleGroup) => {
      const position = getMusclePosition(muscleGroup);
      const scale = getMuscleScale(muscleGroup);
      const color = getMuscleColor(muscleGroup);
      const intensity = getMuscleIntensity(muscleGroup, plan);
      const isSelected = selectedMuscleGroup === muscleGroup;

      // Main muscle mesh
      const geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isSelected ? 0.6 : 0.3 * intensity,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.5 + intensity * 0.3,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.userData.muscleGroup = muscleGroup;
      mesh.userData.intensity = intensity;
      
      newMeshes.push(mesh);
      
      if (groupRef.current) {
        groupRef.current.add(mesh);
      }

      // Outline highlight
      const outlineGeometry = geometry.clone();
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide,
        transparent: true,
        opacity: isSelected ? 0.6 : 0.3 * intensity,
      });
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outline.scale.multiplyScalar(isSelected ? 1.15 : 1.1);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      
      if (groupRef.current) {
        groupRef.current.add(outline);
      }

      newHighlights.push({ mesh, outline, muscleGroup });
    });

    highlightsRef.current = newHighlights;
    // Highlights stored in ref, no state update needed

    return () => {
      newHighlights.forEach(({ outline }) => {
        if (outline && outline.parent) {
          outline.parent.remove(outline);
          outline.geometry?.dispose();
          outline.material?.dispose();
        }
      });
    };
  }, [model, plan, selectedMuscleGroup]);

  if (!model) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

/**
 * Workout Plan Viewer 3D Component
 */
export default function WorkoutPlanViewer3D({
  plan = null,
  modelUrl = null,
  height = "80",
  selectedMuscleGroup = null,
  onMuscleClick,
  className = "",
}) {

  if (!plan) {
    return (
      <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 p-6 ${className}`}>
        <p className="text-gray-400 text-sm text-center">
          Chưa có workout plan. Hãy thực hiện AI Scan để tạo plan.
        </p>
      </div>
    );
  }

  const muscleGroups = getMuscleGroupsFromPlan(plan);
  const focusAreas = plan.focus_areas || [];

  const handleMuscleClick = (muscleGroup) => {
    if (onMuscleClick) {
      onMuscleClick(muscleGroup);
    }
  };

  return (
    <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      <div style={{ height: `${height * 0.25}rem` }}>
        <BaseViewer3D cameraPosition={[3, 3, 3]} enablePan={false}>
          <Suspense fallback={null}>
            <PlanBodyModel
              modelUrl={modelUrl}
              plan={plan}
              selectedMuscleGroup={selectedMuscleGroup}
              onMuscleClick={handleMuscleClick}
            />
          </Suspense>
        </BaseViewer3D>
      </div>

      {/* Info panel */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-300 mb-2">
            Focus Areas ({focusAreas.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {focusAreas.length > 0 ? (
              focusAreas.map((area, i) => {
                const normalized = normalizeMuscleNames([area]);
                const color = normalized.length > 0 ? getMuscleColor(normalized[0]) : "#a3a3a3";
                return (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    {area}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-400">Chưa có focus areas</span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-sm font-semibold text-gray-300 mb-2">
            Nhóm cơ trong plan ({muscleGroups.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {muscleGroups.map((mg) => {
              const color = getMuscleColor(mg);
              const intensity = getMuscleIntensity(mg, plan);
              const isSelected = selectedMuscleGroup === mg;
              return (
                <button
                  key={mg}
                  onClick={() => handleMuscleClick(mg)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    isSelected ? "ring-2 ring-offset-2 ring-offset-slate-800" : ""
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : `${color}20`,
                    color: isSelected ? "#fff" : color,
                    border: `1px solid ${color}40`,
                    opacity: intensity,
                  }}
                >
                  {MUSCLE_GROUPS[mg]?.name || mg}
                </button>
              );
            })}
          </div>
        </div>

        {plan.level && (
          <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
            <span className="text-gray-400">Level: </span>
            <span className="font-semibold text-emerald-400">{plan.level}</span>
            {plan.sessions_per_week && (
              <>
                <span className="text-gray-400 ml-3">Sessions/week: </span>
                <span className="font-semibold text-sky-400">{plan.sessions_per_week}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

