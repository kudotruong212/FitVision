// src/components/3d/BodyScanViewer3D.jsx
// Body scan visualization with muscle highlighting and comparison

import React, { useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import BaseViewer3D, { useAnimationLoop } from "./BaseViewer3D.jsx";
import { createPrimitiveBody, loadModelWithFallback } from "../../utils/3d/modelLoader.js";
import { 
  normalizeMuscleNames, 
  getMuscleColor, 
  getMusclePosition, 
  getMuscleScale,
  getHighlightIntensity 
} from "../../utils/3d/muscleMapping.js";
import { 
  animateHighlightPulse
} from "../../utils/3d/highlightSystem.js";
import { MUSCLE_GROUPS } from "../../data/muscleData.js";
import { getHumanBodyModelUrl } from "../../config/3dModels.js";

/**
 * Body model with muscle highlights
 */
function BodyModel({ 
  modelUrl, 
  weakMuscles = [], 
  fatAreas = []
}) {
  const groupRef = useRef();
  const [model, setModel] = useState(null);
  const highlightsRef = useRef([]);
  const pulseAnimationsRef = useRef([]);

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

  // Setup highlights
  useEffect(() => {
    if (!model) return;

    // Clear previous highlights
    highlightsRef.current.forEach(({ outline }) => {
      if (outline && outline.parent) {
        outline.parent.remove(outline);
        outline.geometry?.dispose();
        outline.material?.dispose();
      }
    });
    highlightsRef.current = [];
    pulseAnimationsRef.current = [];

    // Create muscle meshes for highlighting
    const muscleMeshes = [];
    const normalizedWeak = normalizeMuscleNames(weakMuscles);
    const normalizedFat = normalizeMuscleNames(fatAreas);
    const allMuscles = [...new Set([...normalizedWeak, ...normalizedFat])];

    allMuscles.forEach((muscleGroup) => {
      const position = getMusclePosition(muscleGroup);
      const scale = getMuscleScale(muscleGroup);
      const color = getMuscleColor(muscleGroup);
      
      const geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.userData.muscleGroup = muscleGroup;
      mesh.userData.isWeak = normalizedWeak.includes(muscleGroup);
      mesh.userData.isFat = normalizedFat.includes(muscleGroup);
      
      muscleMeshes.push(mesh);
      
      // Add to scene
      if (groupRef.current) {
        groupRef.current.add(mesh);
      }
    });

    // Create highlights with different intensities
    const newHighlights = [];
    muscleMeshes.forEach((mesh) => {
      const intensity = mesh.userData.isWeak 
        ? getHighlightIntensity(score, 100)
        : 0.8; // Fat areas get consistent highlight
      
      const color = getMuscleColor(mesh.userData.muscleGroup);
      const outlineGeometry = mesh.geometry.clone();
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.4 * intensity,
      });
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outline.scale.multiplyScalar(1.1);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      
      if (groupRef.current) {
        groupRef.current.add(outline);
      }

      newHighlights.push({ mesh, outline, muscleGroup: mesh.userData.muscleGroup });
      
      // Setup pulse animation for weak muscles
      if (mesh.userData.isWeak) {
        const pulseFn = animateHighlightPulse(mesh, color, 1.0);
        pulseAnimationsRef.current.push(pulseFn);
      }
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
  }, [model, weakMuscles, fatAreas, score]);

  // Pulse animation loop
  useAnimationLoop((state, delta) => {
    pulseAnimationsRef.current.forEach((pulseFn) => {
      pulseFn(delta);
    });
  }, []);

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
 * Score indicator
 */
function ScoreIndicator({ poseConfidence }) {
  return (
    <group position={[0, 2.5, 0]}>
      <mesh>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={poseConfidence} />
      </mesh>
    </group>
  );
}

/**
 * Body Scan Viewer 3D Component
 */
export default function BodyScanViewer3D({
  scanData = null,
  modelUrl = null,
  height = "80",
  showComparison = false,
  comparisonData = null,
  onMuscleClick,
  className = "",
}) {

  if (!scanData) {
    return (
      <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 p-6 ${className}`}>
        <p className="text-gray-400 text-sm text-center">
          Chưa có dữ liệu scan. Hãy thực hiện AI Scan để xem kết quả 3D.
        </p>
      </div>
    );
  }

  const {
    weak_muscles = [],
    fat_area = "",
    score = 0,
    pose_confidence = 0,
    pose_symmetry = 0,
  } = scanData;

  // Auto-get model URL from config if not provided
  const finalModelUrl = modelUrl || getHumanBodyModelUrl();

  const handleMuscleClick = (muscleGroup, object) => {
    setSelectedMuscle(muscleGroup);
    if (onMuscleClick) {
      onMuscleClick(muscleGroup, object);
    }
  };

  if (showComparison && comparisonData) {
    // Side-by-side comparison view
    return (
      <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
        <div className="grid md:grid-cols-2 gap-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Trước</h3>
            <div style={{ height: `${height * 0.25}rem` }}>
              <BaseViewer3D cameraPosition={[3, 3, 3]} enablePan={false}>
                <Suspense fallback={null}>
                  <BodyModel
                    modelUrl={finalModelUrl}
                    weakMuscles={comparisonData.weak_muscles || []}
                    fatAreas={comparisonData.fat_area ? [comparisonData.fat_area] : []}
                    score={comparisonData.score || 0}
                    poseConfidence={comparisonData.pose_confidence || 0}
                    onMuscleClick={handleMuscleClick}
                  />
                </Suspense>
              </BaseViewer3D>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Score: {comparisonData.score || 0} | Confidence: {Math.round((comparisonData.pose_confidence || 0) * 100)}%
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Sau</h3>
            <div style={{ height: `${height * 0.25}rem` }}>
              <BaseViewer3D cameraPosition={[3, 3, 3]} enablePan={false}>
                <Suspense fallback={null}>
                  <BodyModel
                    modelUrl={finalModelUrl}
                    weakMuscles={weak_muscles}
                    fatAreas={fat_area ? [fat_area] : []}
                    score={score}
                    poseConfidence={pose_confidence}
                    onMuscleClick={handleMuscleClick}
                  />
                </Suspense>
              </BaseViewer3D>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Score: {score} | Confidence: {Math.round(pose_confidence * 100)}%
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-400">Điểm cải thiện: </span>
              <span className={`font-semibold ${score > (comparisonData.score || 0) ? 'text-emerald-400' : 'text-gray-300'}`}>
                {score - (comparisonData.score || 0) > 0 ? '+' : ''}{score - (comparisonData.score || 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Đối xứng: </span>
              <span className="font-semibold text-emerald-400">
                {Math.round(pose_symmetry * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single view
  return (
    <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      <div style={{ height: `${height * 0.25}rem` }}>
        <BaseViewer3D cameraPosition={[3, 3, 3]} enablePan={false}>
          <Suspense fallback={null}>
            <BodyModel
              modelUrl={modelUrl}
              weakMuscles={weak_muscles}
              fatAreas={fat_area ? [fat_area] : []}
              score={score}
              poseConfidence={pose_confidence}
              onMuscleClick={handleMuscleClick}
            />
            <ScoreIndicator score={score} poseConfidence={pose_confidence} />
          </Suspense>
        </BaseViewer3D>
      </div>

      {/* Info panel */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Điểm số</div>
            <div className="text-xl font-bold text-emerald-400">{score}</div>
          </div>
          <div>
            <div className="text-gray-400">Pose Confidence</div>
            <div className="text-xl font-bold text-sky-400">
              {Math.round(pose_confidence * 100)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400">Đối xứng</div>
            <div className="text-xl font-bold text-purple-400">
              {Math.round(pose_symmetry * 100)}%
            </div>
          </div>
        </div>
        {weak_muscles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-gray-400 mb-1">Vùng cơ yếu:</div>
            <div className="flex flex-wrap gap-1">
              {weak_muscles.map((muscle, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        )}
        {fat_area && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Vùng mỡ:</div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs">
              {fat_area}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

