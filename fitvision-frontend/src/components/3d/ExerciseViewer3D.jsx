// src/components/3d/ExerciseViewer3D.jsx
// Improved exercise viewer with animation support

import React, { useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import BaseViewer3D, { useAnimationLoop } from "./BaseViewer3D.jsx";
import { AnimationController } from "../../utils/3d/animationController.js";
import { createPrimitiveBody, loadModelWithFallback } from "../../utils/3d/modelLoader.js";
import { 
  getMuscleColor, 
  getMuscleShape,
  getMusclePriority,
  getMuscleIntensity,
  getMuscleHeightRange,
  getMuscleOffset
} from "../../utils/3d/muscleMapping.js";
import { getMuscleGroupsForExercise, MUSCLE_GROUPS } from "../../data/muscleData.js";
import { animateHighlightPulse } from "../../utils/3d/highlightSystem.js";
import { getExerciseModelUrl } from "../../config/3dModels.js";

/**
 * GLTF Model Loader Component - uses useGLTF hook
 * This component handles GLTF loading with useGLTF hook (same as SimpleGLBViewer)
 */
const GLTFModelLoader = React.forwardRef(function GLTFModelLoader({ 
  modelUrl,
  isPlaying,
  speed,
  onAnimationReady,
  onModelLoaded
}, ref) {
  const mixerRef = useRef();
  const controllerRef = useRef();
  const isPlayingRef = useRef(false);
  
  // CRITICAL: useGLTF hook must be called unconditionally at top level
  // This preserves the link between scene and animations
  const gltfData = useGLTF(modelUrl);
  
  // Sync ref with prop to avoid closure issues
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  // Setup model and animation
  useEffect(() => {
    if (gltfData && gltfData.scene) {
      // Ẩn TẤT CẢ helper objects và platform objects (axes, grid, debug, colored platforms) - KHÔNG ẩn bones
      gltfData.scene.traverse((child) => {
        // Ẩn tất cả lines và line segments (helper lines)
        if (child.type === 'Line' || child.type === 'LineSegments') {
          child.visible = false;
          if (child.name) {
            console.log(`  - Hidden line: ${child.name}`);
          }
          return;
        }
        
        // Ẩn bones visualization nhưng giữ bones structure (bones không render nhưng cần cho animation)
        if (child.isBone || child.type === 'Bone') {
          // Bones không render, nhưng cần giữ structure
          return;
        }
        
        // Ẩn các helper objects theo tên (nhưng không phải bones)
        if (child.name && (
          child.name.toLowerCase().includes('helper') ||
          child.name.toLowerCase().includes('axis') ||
          child.name.toLowerCase().includes('grid') ||
          child.name.toLowerCase().includes('debug') ||
          child.name.toLowerCase().includes('wireframe') ||
          child.name.toLowerCase().includes('platform') ||
          child.name.toLowerCase().includes('ground') ||
          child.name.toLowerCase().includes('floor') ||
          child.name.toLowerCase().includes('base') ||
          child.name.toLowerCase().includes('cube') ||
          child.name.toLowerCase().includes('box')
        )) {
          // KHÔNG ẩn nếu là bone hoặc armature (cần cho animation)
          if (!child.name.toLowerCase().includes('bone') && 
              !child.name.toLowerCase().includes('armature') &&
              !child.name.toLowerCase().includes('skeleton') &&
              !child.name.toLowerCase().includes('mixamorig')) {
            child.visible = false;
            console.log(`  - Hidden helper/platform: ${child.name}`);
            return;
          }
        }
        
        // Xử lý mesh - CHỈ giữ skinned mesh (character), ẩn tất cả mesh khác
        if (child.isMesh || child.isSkinnedMesh) {
          // GIỮ NGUYÊN skinned mesh (character mesh)
          if (child.isSkinnedMesh) {
            // Đây là character mesh, giữ nguyên
            return;
          }
          
          // Đối với regular mesh (không phải skinned mesh), ẩn TẤT CẢ
          // Vì chỉ có skinned mesh mới là character, các mesh khác đều là platform/helper
          
          // Ẩn nếu có tên platform/helper
          if (child.name && (
            child.name.toLowerCase().includes('platform') ||
            child.name.toLowerCase().includes('ground') ||
            child.name.toLowerCase().includes('floor') ||
            child.name.toLowerCase().includes('base') ||
            child.name.toLowerCase().includes('helper') ||
            child.name.toLowerCase().includes('axis') ||
            child.name.toLowerCase().includes('grid') ||
            child.name.toLowerCase().includes('debug') ||
            child.name.toLowerCase().includes('cube') ||
            child.name.toLowerCase().includes('box')
          )) {
            child.visible = false;
            console.log(`  - Hidden platform/helper mesh: ${child.name}`);
            return;
          }
          
          // KIỂM TRA MATERIAL COLOR - Ẩn TẤT CẢ mesh có màu green hoặc yellow (không phải skinned mesh)
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            for (const material of materials) {
              if (material.color) {
                const color = material.color;
                const r = color.r;
                const g = color.g;
                const b = color.b;
                
                // Kiểm tra nếu là màu green (g cao, r và b thấp) - mở rộng threshold
                const isGreen = g > 0.4 && r < 0.6 && b < 0.6 && (g > r && g > b);
                // Kiểm tra nếu là màu yellow (r và g cao, b thấp) - mở rộng threshold
                const isYellow = (r > 0.4 && g > 0.4 && b < 0.6) && (r > 0.6 || g > 0.6);
                
                if (isGreen || isYellow) {
                  // Ẩn TẤT CẢ mesh có màu green hoặc yellow (platform objects)
                  child.visible = false;
                  console.log(`  - Hidden colored platform: ${child.name || 'unnamed'}, color: rgb(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}), isGreen: ${isGreen}, isYellow: ${isYellow}`);
                  return;
                }
              }
            }
          }
          
          // Nếu không phải skinned mesh và không match các điều kiện trên, kiểm tra vị trí
          // Ẩn các mesh ở dưới chân model (có thể là platform)
          try {
            const childBox = new THREE.Box3().setFromObject(child);
            const childCenter = childBox.getCenter(new THREE.Vector3());
            const sceneBox = new THREE.Box3().setFromObject(gltfData.scene);
            const sceneSize = sceneBox.getSize(new THREE.Vector3());
            const sceneMinY = sceneBox.min.y;
            
            // Nếu mesh ở dưới 50% chiều cao của scene, có thể là platform - tăng threshold
            if (childCenter.y < sceneMinY + (sceneSize.y * 0.5)) {
              child.visible = false;
              console.log(`  - Hidden low-positioned mesh (likely platform): ${child.name || 'unnamed'}, y: ${childCenter.y.toFixed(2)}, sceneMinY: ${sceneMinY.toFixed(2)}`);
              return;
            }
          } catch {
            // Ignore errors in bounding box calculation
          }
          
          // Nếu vẫn chưa bị ẩn và không phải skinned mesh, ẩn luôn (an toàn hơn)
          // Chỉ giữ lại skinned mesh, ẩn tất cả mesh khác
          child.visible = false;
          console.log(`  - Hidden non-skinned mesh (safety): ${child.name || 'unnamed'}`);
        }
      });
      
      // Kiểm tra xem model đã được center chưa (tránh tính lại nhiều lần)
      if (gltfData.scene.userData?.centered) {
        console.log(`⏭️ Model already centered, skipping...`);
        return;
      }
      
      // Center the model at origin (center of the frame)
      const sceneBox = new THREE.Box3().setFromObject(gltfData.scene);
      const sceneSize = sceneBox.getSize(new THREE.Vector3());
      const sceneCenter = sceneBox.getCenter(new THREE.Vector3());
      const maxSceneDimension = Math.max(sceneSize.x, sceneSize.y, sceneSize.z);
      
      // Auto-scale if needed
      if (maxSceneDimension > 5) {
        const scale = 2 / maxSceneDimension;
        gltfData.scene.scale.set(scale, scale, scale);
        // Recalculate after scaling
        sceneBox.setFromObject(gltfData.scene);
        sceneCenter.copy(sceneBox.getCenter(new THREE.Vector3()));
        sceneSize.copy(sceneBox.getSize(new THREE.Vector3()));
      } else if (maxSceneDimension < 0.5) {
        const scale = 1 / maxSceneDimension;
        gltfData.scene.scale.set(scale, scale, scale);
        // Recalculate after scaling
        sceneBox.setFromObject(gltfData.scene);
        sceneCenter.copy(sceneBox.getCenter(new THREE.Vector3()));
        sceneSize.copy(sceneBox.getSize(new THREE.Vector3()));
      }
      
      // Tính bounding box TRƯỚC KHI set position (quan trọng!)
      const finalBox = new THREE.Box3().setFromObject(gltfData.scene);
      const finalSize = finalBox.getSize(new THREE.Vector3());
      const finalCenter = finalBox.getCenter(new THREE.Vector3());
      
      // 👉 lấy tâm thân: khoảng 60% chiều cao tính từ chân lên
      // Tính TRƯỚC KHI set position để có giá trị chính xác
      const torsoCenterY = finalBox.min.y + finalSize.y * 0.6;
      const torsoCenter = new THREE.Vector3(
        finalCenter.x,
        torsoCenterY,
        finalCenter.z
      );
      
      // Center model theo thân
      gltfData.scene.position.set(
        -torsoCenter.x,
        -torsoCenter.y,
        -torsoCenter.z
      );
      
      // Đánh dấu đã center và lưu thông tin vị trí ban đầu để highlight có thể quy đổi toạ độ
      if (!gltfData.scene.userData) {
        // eslint-disable-next-line react-hooks/immutability
        gltfData.scene.userData = {};
      }
      const appliedScale = gltfData.scene.scale?.x || 1;
      // eslint-disable-next-line react-hooks/immutability
      gltfData.scene.userData.centered = true;
      // eslint-disable-next-line react-hooks/immutability
      gltfData.scene.userData.centerInfo = {
        translation: torsoCenter.clone(),
        torsoCenter: torsoCenter.clone(),
        boundingBox: {
          min: finalBox.min.clone(),
          max: finalBox.max.clone(),
          size: finalSize.clone(),
        },
        originalCenter: finalCenter.clone(),
        appliedScale,
      };
      
      console.log(`📍 GLTFModelLoader - Centered model at origin (torso):`, {
        boundingBox: {
          min: { x: finalBox.min.x.toFixed(2), y: finalBox.min.y.toFixed(2), z: finalBox.min.z.toFixed(2) },
          max: { x: finalBox.max.x.toFixed(2), y: finalBox.max.y.toFixed(2), z: finalBox.max.z.toFixed(2) }
        },
        size: { 
          x: finalSize.x.toFixed(2), 
          y: finalSize.y.toFixed(2), 
          z: finalSize.z.toFixed(2) 
        },
        fullCenter: { 
          x: finalCenter.x.toFixed(2), 
          y: finalCenter.y.toFixed(2), 
          z: finalCenter.z.toFixed(2) 
        },
        torsoCenterY_calc: `${finalBox.min.y.toFixed(2)} + ${finalSize.y.toFixed(2)} * 0.6 = ${torsoCenterY.toFixed(2)}`,
        torsoCenter: { 
          x: torsoCenter.x.toFixed(2), 
          y: torsoCenter.y.toFixed(2), 
          z: torsoCenter.z.toFixed(2) 
        },
        finalPosition: { 
          x: gltfData.scene.position.x.toFixed(2), 
          y: gltfData.scene.position.y.toFixed(2), 
          z: gltfData.scene.position.z.toFixed(2) 
        },
        note: "Model is centered at TORSO (60% from bottom), not full body center"
      });
      
      console.log(`✅ Model loaded via useGLTF:`, {
        hasAnimations: gltfData.animations?.length > 0,
        animationCount: gltfData.animations?.length || 0,
        modelType: gltfData.scene.type,
        modelName: gltfData.scene.name
      });
      
      // Setup animation if model has animations
      if (gltfData.animations?.length > 0) {
        console.log(`🎬 Setting up GLTF animations:`, gltfData.animations.map(a => a.name));
        
        // CRITICAL: Use the exact same scene from useGLTF (same as SimpleGLBViewer)
        const mixer = new THREE.AnimationMixer(gltfData.scene);
        mixerRef.current = mixer;
        const controller = new AnimationController(mixer, gltfData.animations);
        controller.createActions();
        
        // Use first animation by default
        if (gltfData.animations.length > 0) {
          const firstAnimName = gltfData.animations[0].name;
          controller.currentAction = controller.actions[firstAnimName];
          if (controller.currentAction) {
            controller.currentAction.setLoop(THREE.LoopRepeat, Infinity);
            controller.currentAction.timeScale = 1.0;
            controller.currentAction.clampWhenFinished = false;
            controller.currentAction.time = 0;
            controller.currentAction.paused = true;
            controller.currentAction.enabled = true;
            controller.currentAction.setEffectiveWeight(1.0);
            console.log(`✅ Animation ready: ${firstAnimName} (${gltfData.animations[0].duration.toFixed(2)}s), paused: ${controller.currentAction.paused}`);
          }
        }
        controllerRef.current = controller;
        if (onAnimationReady) {
          onAnimationReady(controller);
        }
      }
      
      if (onModelLoaded) {
        onModelLoaded(gltfData.scene);
      }
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [gltfData, onAnimationReady, onModelLoaded]);
  
  // Update speed
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSpeed(speed);
    }
  }, [speed]);
  
  // Animation loop
  useAnimationLoop((state, delta) => {
    if (mixerRef.current) {
      const playing = isPlayingRef.current;
      if (playing && controllerRef.current?.currentAction) {
        const action = controllerRef.current.currentAction;
        if (action.paused) {
          action.paused = false;
          action.enabled = true;
          if (!action.isRunning()) {
            action.play();
          }
        }
        mixerRef.current.update(delta);
      }
    }
  }, [isPlayingRef]);
  
  // Expose scene ref to parent for highlighting
  useEffect(() => {
    if (gltfData && gltfData.scene) {
      if (typeof ref === 'function') {
        ref(gltfData.scene);
      } else if (ref) {
        ref.current = gltfData.scene;
      }
    }
  }, [gltfData, ref]);
  
  if (!gltfData || !gltfData.scene) {
    return null;
  }
  
  return <primitive object={gltfData.scene} />;
});

/**
 * Camera fitter component - automatically fits camera to show entire model
 */
function CameraFitter({ modelRef }) {
  const { camera, scene } = useThree();
  const fittedRef = useRef(false);
  
  useEffect(() => {
    if (!modelRef?.current || fittedRef.current) return;
    
    // Wait a bit for model to be fully loaded and positioned
    const timer = setTimeout(() => {
      if (!modelRef.current) return;
      
      // Calculate bounding box of the model (already positioned)
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = box.getSize(new THREE.Vector3());
      
      if (size.length() === 0) return;
      
      // Model đã được center tại torso (60% từ chân lên), nên trong world space:
      // - Torso center = (0, 0, 0)
      // - Model center (full body) = box.getCenter() trong world space
      const worldCenter = box.getCenter(new THREE.Vector3());
      const worldTorsoCenter = new THREE.Vector3(0, 0, 0); // Torso center is at origin
      
      console.log(`📷 CameraFitter - Model center analysis:`, {
        boundingBox: {
          min: { x: box.min.x.toFixed(2), y: box.min.y.toFixed(2), z: box.min.z.toFixed(2) },
          max: { x: box.max.x.toFixed(2), y: box.max.y.toFixed(2), z: box.max.z.toFixed(2) }
        },
        modelSize: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
        worldModelCenter: { x: worldCenter.x.toFixed(2), y: worldCenter.y.toFixed(2), z: worldCenter.z.toFixed(2) },
        worldTorsoCenter: { x: worldTorsoCenter.x.toFixed(2), y: worldTorsoCenter.y.toFixed(2), z: worldTorsoCenter.z.toFixed(2) },
        offsetFromTorso: worldCenter.y.toFixed(2),
        note: "Camera will look at TORSO center (0,0,0), not model center"
      });
      
      // Camera nhìn vào torso center (0, 0, 0)
      const center = worldTorsoCenter;
      
      // Calculate distance needed to fit the entire model tightly
      // Use a tighter fit to reduce empty space on sides and bottom
      const fov = camera.fov * (Math.PI / 180); // Convert to radians
      const aspect = camera.aspect || 1;
      
      // Calculate distance to fit model height (Y dimension) - most important for vertical fit
      const heightDistance = (size.y / 2) / Math.tan(fov / 2);
      
      // Calculate distance to fit model width (X dimension) - for horizontal fit
      const widthDistance = (size.x / 2) / (Math.tan(fov / 2) * aspect);
      
      // Calculate distance to fit model depth (Z dimension) - for diagonal view
      const depthDistance = (size.z / 2) / (Math.tan(fov / 2) * aspect);
      
      // Use the larger distance to ensure everything fits, with minimal padding
      const baseDistance = Math.max(heightDistance, widthDistance, depthDistance);
      const distance = baseDistance * 1.05; // Only 5% padding for tighter fit
      
      // Position camera to view the entire model
      // Use a diagonal angle to show the model nicely
      const angle = Math.PI / 4; // 45 degrees
      const cameraX = center.x + distance * Math.cos(angle);
      const cameraY = center.y + distance * 0.5;
      const cameraZ = center.z + distance * Math.sin(angle);
      
      // Update camera position
      camera.position.set(cameraX, cameraY, cameraZ);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      // Find OrbitControls in the scene and update its target
      scene.traverse((child) => {
        if (child.type === 'OrbitControls' || (child.userData && child.userData.isOrbitControls)) {
          if (child.target) {
            child.target.copy(center);
            child.update();
          }
        }
      });
      
      // Also try to find controls via scene children
      const controls = scene.children.find(child => child.type === 'OrbitControls');
      if (controls && controls.target) {
        controls.target.copy(center);
        controls.update();
      }
      
      fittedRef.current = true;
      
      console.log(`📷 Camera fitted to model:`, {
        modelSize: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
        center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) },
        cameraPosition: { x: cameraX.toFixed(2), y: cameraY.toFixed(2), z: cameraZ.toFixed(2) },
        distance: distance.toFixed(2)
      });
    }, 300); // Increased delay to ensure model is fully positioned
    
    return () => clearTimeout(timer);
  }, [modelRef, camera, scene]);
  
  return null;
}

/**
 * Animated exercise model component
 */
const ExerciseModel = React.forwardRef(function ExerciseModel({ 
  exerciseSlug, 
  muscleGroup, 
  modelUrl, 
  isPlaying, 
  speed,
  onAnimationReady 
}, ref) {
  const groupRef = useRef();
  const mixerRef = useRef();
  const controllerRef = useRef();
  const isPlayingRef = useRef(false); // Use ref to track playing state
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sync ref with prop to avoid closure issues
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load model - use fallback for primitive models
  // Note: If modelUrl is provided, GLTFModelLoader component handles GLTF loading
  useEffect(() => {
    // Skip if modelUrl is provided (GLTFModelLoader will handle it)
    if (modelUrl) {
      setIsLoading(false);
      return;
    }
    
    let mounted = true;

    async function loadModel() {
      setIsLoading(true);
      console.log(`🔄 Loading primitive fallback for ${exerciseSlug}`);
      
      // Use loadModelWithFallback for primitive models only (no modelUrl)
      try {
        const result = await loadModelWithFallback(
          null, // No modelUrl for primitive
          () => {
            console.log(`📦 Creating primitive fallback for ${exerciseSlug}`);
            return createPrimitiveBody([muscleGroup]);
          }
        );
        
        if (mounted) {
          console.log(`✅ Model loaded via fallback:`, {
            isPrimitive: result.isPrimitive,
            hasAnimations: result.animations?.length > 0,
            animationCount: result.animations?.length || 0
          });
          
          setModel(result.model);
          setIsLoading(false);

          // Setup animation if model has animations
          if (!result.isPrimitive && result.animations?.length > 0) {
            console.log(`🎬 Setting up GLTF animations:`, result.animations.map(a => a.name));
            
            // CRITICAL: Use the model itself as root (not a clone)
            // AnimationMixer needs the exact same object that the animation tracks reference
            const mixer = new THREE.AnimationMixer(result.model);
            mixerRef.current = mixer;
            const controller = new AnimationController(mixer, result.animations);
            controller.createActions();
            
            // Use first animation by default
            if (result.animations.length > 0) {
              const firstAnimName = result.animations[0].name;
              controller.currentAction = controller.actions[firstAnimName];
              // Set loop mode and ensure it's ready
              if (controller.currentAction) {
                controller.currentAction.setLoop(THREE.LoopRepeat, Infinity);
                controller.currentAction.timeScale = 1.0;
                controller.currentAction.clampWhenFinished = false;
                // Reset to start but don't play yet (wait for user to click Play)
                controller.currentAction.time = 0;
                controller.currentAction.paused = true; // Start paused
                // CRITICAL: Ensure action is enabled and has weight
                controller.currentAction.enabled = true;
                controller.currentAction.setEffectiveWeight(1.0);
                console.log(`✅ Animation ready: ${firstAnimName} (${result.animations[0].duration.toFixed(2)}s), paused: ${controller.currentAction.paused}`);
              }
            }
            controllerRef.current = controller;
            if (onAnimationReady) {
              onAnimationReady(controller);
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to load exercise model:", error);
        if (mounted) {
          const fallback = createPrimitiveBody([muscleGroup]);
          setModel(fallback);
          setIsLoading(false);
          console.warn("⚠️ Using primitive fallback due to error");
        }
      }
    }

    loadModel();

    return () => {
      mounted = false;
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [modelUrl, exerciseSlug, muscleGroup, onAnimationReady]);

  // Animation loop - chỉ update khi đang playing
  useAnimationLoop((state, delta) => {
    if (mixerRef.current) {
      const playing = isPlayingRef.current;
      if (playing && controllerRef.current?.currentAction) {
        const action = controllerRef.current.currentAction;
        if (action.paused) {
          action.paused = false;
          action.enabled = true;
          if (!action.isRunning()) {
            action.play();
          }
          console.log(
            `🔧 Force unpaused in loop: paused=${action.paused}, enabled=${action.enabled}, isRunning=${action.isRunning()}`
          );
        }
        mixerRef.current.update(delta);

        if (Math.random() < 0.01) {
          const activeActions = mixerRef.current._actions || [];
          console.log(
            `🔄 Mixer update: delta=${delta.toFixed(
              3
            )}, mixer.time=${mixerRef.current.time.toFixed(
              2
            )}, action.time=${action.time.toFixed(
              2
            )}, paused=${action.paused}, enabled=${action.enabled}, weight=${action
              .getEffectiveWeight()
              .toFixed(2)}, isRunning=${action.isRunning()}, isPlaying=${playing}, inMixer=${activeActions.includes(
              action
            )}`
          );
        }
      }
    }
    // Controller.update: chỉ cần nếu playing
    if (controllerRef.current && typeof controllerRef.current.update === "function") {
      if (isPlayingRef.current) {
        controllerRef.current.update(delta);
      }
    }
  });

  // Update speed
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSpeed(speed);
    }
  }, [speed]);

  // Ensure action is not paused when isPlaying is true
  useEffect(() => {
    if (isPlaying && controllerRef.current?.currentAction) {
      // Force unpause if playing
      if (controllerRef.current.currentAction.paused) {
        console.log(`🔧 Force unpausing action (isPlaying=${isPlaying})`);
        controllerRef.current.currentAction.paused = false;
        controllerRef.current.currentAction.enabled = true;
      }
    }
  }, [isPlaying]);

  // Expose model ref to parent for highlighting
  // MUST be called before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (model && groupRef.current) {
      const modelObject = groupRef.current.object || model;
      if (typeof ref === 'function') {
        ref(modelObject);
      } else if (ref) {
        ref.current = modelObject;
      }
    }
  }, [model, ref]);

  // Ensure model is visible and properly scaled (only once)
  // MUST be called before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (!model) return;
    
    // Skip if already scaled
    if (model.userData?.scaled) return;
    
    console.log(`📐 Processing model for display:`, {
      type: model.type,
      name: model.name,
      children: model.children.length,
      visible: model.visible,
      position: { x: model.position.x, y: model.position.y, z: model.position.z },
      scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
    });
    
    // Ensure model is visible
    // eslint-disable-next-line react-hooks/immutability
    model.visible = true;
    model.traverse((child) => {
      // Ẩn bones và helper objects
      if (child.isBone || child.type === 'Bone' || 
          (child.name && (
            child.name.toLowerCase().includes('bone') ||
            child.name.toLowerCase().includes('armature') ||
            child.name.toLowerCase().includes('skeleton') ||
            child.name.toLowerCase().includes('helper') ||
            child.name.toLowerCase().includes('axis') ||
            child.name.toLowerCase().includes('grid') ||
            child.name.toLowerCase().includes('debug')
          ))) {
        child.visible = false;
        return;
      }
      
      if (child.isMesh || child.isSkinnedMesh) {
        // Kiểm tra material color - ẩn nếu là màu green hoặc yellow
        if (child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if (material.color) {
            const color = material.color;
            const r = color.r;
            const g = color.g;
            const b = color.b;
            
            const isGreen = g > 0.7 && r < 0.3 && b < 0.3;
            const isYellow = r > 0.7 && g > 0.7 && b < 0.3;
            
            if (isGreen || isYellow) {
              child.visible = false;
              console.log(`  - Hidden colored mesh: ${child.name}, color: rgb(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)})`);
              return;
            }
          }
        }
        child.visible = true;
        child.frustumCulled = false; // Disable frustum culling to ensure visibility
      }
    });
    
    // Auto-scale model if it's too large or too small
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    console.log(`📐 Model bounding box:`, {
      size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
      maxDimension: maxDimension.toFixed(2),
      center: box.getCenter(new THREE.Vector3())
    });
    
    if (maxDimension > 0) {
      // If model is larger than 5 units, scale it down
      if (maxDimension > 5) {
        const scale = 2 / maxDimension;
        model.scale.set(scale, scale, scale);
        console.log(`📏 Scaled model down by ${scale.toFixed(2)}x (max dimension: ${maxDimension.toFixed(2)})`);
        // Recalculate bounding box after scaling
        box.setFromObject(model);
        size.copy(box.getSize(new THREE.Vector3()));
      }
      // If model is smaller than 0.5 units, scale it up
      else if (maxDimension < 0.5) {
        const scale = 1 / maxDimension;
        model.scale.set(scale, scale, scale);
        console.log(`📏 Scaled model up by ${scale.toFixed(2)}x (max dimension: ${maxDimension.toFixed(2)})`);
        // Recalculate bounding box after scaling
        box.setFromObject(model);
        size.copy(box.getSize(new THREE.Vector3()));
      }
      
      // Tính bounding box
      const finalBox = new THREE.Box3().setFromObject(model);
      const finalSize = finalBox.getSize(new THREE.Vector3());
      const finalCenter = finalBox.getCenter(new THREE.Vector3());
      
      // 👉 tâm thân: khoảng 60% chiều cao tính từ chân lên
      const torsoCenterY = finalBox.min.y + finalSize.y * 0.6;
      const torsoCenter = new THREE.Vector3(
        finalCenter.x,
        torsoCenterY,
        finalCenter.z
      );
      
      // Center model theo thân
      model.position.set(
        -torsoCenter.x,
        -torsoCenter.y,
        -torsoCenter.z
      );
      
      console.log(`📍 ExerciseModel (Primitive) - Centered model at origin (torso):`, {
        boundingBox: {
          min: { x: finalBox.min.x.toFixed(2), y: finalBox.min.y.toFixed(2), z: finalBox.min.z.toFixed(2) },
          max: { x: finalBox.max.x.toFixed(2), y: finalBox.max.y.toFixed(2), z: finalBox.max.z.toFixed(2) }
        },
        size: { 
          x: finalSize.x.toFixed(2), 
          y: finalSize.y.toFixed(2), 
          z: finalSize.z.toFixed(2) 
        },
        fullCenter: { 
          x: finalCenter.x.toFixed(2), 
          y: finalCenter.y.toFixed(2), 
          z: finalCenter.z.toFixed(2) 
        },
        torsoCenterY_calc: `${finalBox.min.y.toFixed(2)} + ${finalSize.y.toFixed(2)} * 0.6 = ${torsoCenterY.toFixed(2)}`,
        torsoCenter: { 
          x: torsoCenter.x.toFixed(2), 
          y: torsoCenter.y.toFixed(2), 
          z: torsoCenter.z.toFixed(2) 
        },
        finalPosition: { 
          x: model.position.x.toFixed(2), 
          y: model.position.y.toFixed(2), 
          z: model.position.z.toFixed(2) 
        },
        note: "Model is centered at TORSO (60% from bottom), not full body center"
      });
      
      // Mark as scaled to prevent re-scaling + lưu info centering để dùng lại
      if (!model.userData) {
        // eslint-disable-next-line react-hooks/immutability
        model.userData = {};
      }
      const appliedScale = model.scale?.x || 1;
      // eslint-disable-next-line react-hooks/immutability
      model.userData.scaled = true;
      // eslint-disable-next-line react-hooks/immutability
      model.userData.centerInfo = {
        translation: torsoCenter.clone(),
        torsoCenter: torsoCenter.clone(),
        boundingBox: {
          min: finalBox.min.clone(),
          max: finalBox.max.clone(),
          size: finalSize.clone(),
        },
        originalCenter: finalCenter.clone(),
        appliedScale,
      };
      
      console.log(`✅ Model ready for display:`, {
        finalPosition: { x: model.position.x.toFixed(2), y: model.position.y.toFixed(2), z: model.position.z.toFixed(2) },
        finalScale: { x: model.scale.x.toFixed(2), y: model.scale.y.toFixed(2), z: model.scale.z.toFixed(2) },
        visible: model.visible
      });
    }
  }, [model]);

  // Early returns MUST come after all hooks
  // If modelUrl provided, use GLTFModelLoader (uses useGLTF hook)
  // This preserves the link between scene and animations (same as SimpleGLBViewer)
  if (modelUrl) {
    return (
      <Suspense fallback={
        <mesh>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.3} />
        </mesh>
      }>
        <GLTFModelLoader
          ref={ref}
          modelUrl={modelUrl}
          exerciseSlug={exerciseSlug}
          muscleGroup={muscleGroup}
          isPlaying={isPlaying}
          speed={speed}
          onAnimationReady={onAnimationReady}
        />
      </Suspense>
    );
  }
  if (isLoading) {
    return (
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.3} />
      </mesh>
    );
  }

  if (!model) {
    console.warn("⚠️ No model loaded, showing placeholder");
    return (
      <mesh>
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial color="#a3a3a3" />
      </mesh>
    );
  }

  // CRITICAL: Ensure the model object used in primitive is the same as the one in mixer
  // The mixer must reference the exact same object hierarchy
  // CRITICAL: Ensure the model object used in primitive is the same as the one in mixer
  // The mixer must reference the exact same object hierarchy
  // Also ensure model is visible
  if (model) {
    // eslint-disable-next-line react-hooks/immutability
    model.visible = true;
    // Double-check all children are visible
    model.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh || child.isGroup) {
        child.visible = true;
      }
    });
  }
  
  return <primitive ref={groupRef} object={model} />;
});

function createSimpleMuscleHighlight(centerInfo, muscleGroup, color, intensity) {
  const shape = getMuscleShape(muscleGroup);
  const heightRange = getMuscleHeightRange(muscleGroup);
  const offset = getMuscleOffset(muscleGroup);

  const minY = centerInfo?.boundingBox?.min?.y ?? -1;
  const maxY = centerInfo?.boundingBox?.max?.y ?? 1;
  const height = maxY - minY || 1;
  const yCenterRatio = (heightRange.from + heightRange.to) / 2;
  const yCenter = minY + yCenterRatio * height;

  const width = (centerInfo?.boundingBox?.size?.x ?? 1);
  const depth = (centerInfo?.boundingBox?.size?.z ?? 1);
  const x = (offset.x || 0) * (width * 0.5);
  const z = (offset.z || 0) * (depth * 0.5);

  const center = new THREE.Vector3(x, yCenter, z);
  const baseScaleY = (heightRange.to - heightRange.from) * height || 0.5;
  const baseScaleX = width * 0.35;
  const baseScaleZ = depth * 0.35;

  let geometry;
  switch (shape) {
    case "capsule": {
      const radius = Math.max(0.05, Math.min(baseScaleX, baseScaleZ) * 0.5);
      const length = Math.max(0, baseScaleY - radius * 2);
      geometry = new THREE.CapsuleGeometry(radius, length, 8, 16);
      break;
    }
    case "box":
      geometry = new THREE.BoxGeometry(baseScaleX, baseScaleY, baseScaleZ);
      break;
    case "sphere":
    default:
      geometry = new THREE.SphereGeometry(Math.max(baseScaleX, baseScaleY, baseScaleZ) * 0.5, 16, 16);
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.4 * intensity,
    transparent: true,
    opacity: 0.6 * intensity,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);
  mesh.renderOrder = 2;

  const outlineGeometry = geometry.clone();
  outlineGeometry.scale(1.05, 1.05, 1.05);
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.35 * intensity,
    depthWrite: false,
  });
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.position.copy(mesh.position);
  outline.renderOrder = 1;

  console.log("🎯 MeshHighlight center/scale:", {
    muscleGroup,
    center,
    baseScaleX,
    baseScaleY,
    baseScaleZ,
  });

  return { mesh, outline };
}

/**
 * Muscle highlight component - improved with better shapes, visual effects, and animations
 */
function MuscleHighlight({ muscleGroups, exerciseSlug, intensity = 1.0, enablePulse = true }) {
  const highlightsRef = useRef([]);
  const pulseAnimationsRef = useRef([]);
  const groupRef = useRef();

  useEffect(() => {
    if (!groupRef.current) return;
    const container = groupRef.current;

    highlightsRef.current.forEach(({ mesh, outline }) => {
      mesh?.parent?.remove(mesh);
      outline?.parent?.remove(outline);
      mesh?.geometry?.dispose();
      mesh?.material?.dispose();
      outline?.geometry?.dispose();
      outline?.material?.dispose();
    });
    highlightsRef.current = [];
    pulseAnimationsRef.current = [];
    while (container.children.length) {
      const child = container.children.pop();
      child?.geometry?.dispose?.();
      child?.material?.dispose?.();
    }

    const centerInfo = container.parent?.userData?.centerInfo || null;

    muscleGroups.forEach((mg) => {
      const color = getMuscleColor(mg);
      const priority = getMusclePriority(mg);
      const exerciseIntensity = exerciseSlug ? getMuscleIntensity(exerciseSlug, mg) : 1.0;
      const finalIntensity = exerciseIntensity * intensity * priority;

      const result = createSimpleMuscleHighlight(centerInfo, mg, color, finalIntensity);
      const highlightMesh = result?.mesh;
      const highlightOutline = result?.outline;

      if (!highlightMesh) {
        console.warn(`⚠️ Could not create highlight for ${mg}`);
        return;
      }

      highlightMesh.userData.muscleGroup = mg;
      highlightMesh.userData.intensity = finalIntensity;
      container.add(highlightMesh);
      if (highlightOutline) {
        container.add(highlightOutline);
      }

      highlightsRef.current.push({ mesh: highlightMesh, outline: highlightOutline, muscleGroup: mg });

      // Chỉ pulse cho nhóm cơ primary (exerciseIntensity ~ 1.0)
      if (enablePulse && exerciseIntensity >= 0.99) {
        const pulseFn = animateHighlightPulse(highlightMesh, color, 0.75);
        pulseAnimationsRef.current.push(pulseFn);
      }
    });

    return () => {
      highlightsRef.current.forEach(({ mesh, outline }) => {
        mesh?.parent?.remove(mesh);
        outline?.parent?.remove(outline);
        mesh?.geometry?.dispose();
        mesh?.material?.dispose();
        outline?.geometry?.dispose();
        outline?.material?.dispose();
      });
      highlightsRef.current = [];
      pulseAnimationsRef.current = [];
    };
  }, [muscleGroups, exerciseSlug, intensity, enablePulse]);

  // Pulse animation loop
  useAnimationLoop((state, delta) => {
    if (enablePulse) {
      pulseAnimationsRef.current.forEach((pulseFn) => {
        pulseFn(delta);
      });
    }
  }, [enablePulse]);

  // Group that actually holds the highlight meshes
  return <group ref={groupRef} />;
}

/**
 * Shader-based highlight: tint trực tiếp lên skinned mesh theo vùng cơ
 */
function ModelShaderHighlight({ modelRef, muscleGroups, exerciseSlug, intensity = 1.0 }) {
  const shaderRef = useRef(null);

  useEffect(() => {
    if (!modelRef?.current) return;

    let skinnedMesh = null;
    modelRef.current.traverse((child) => {
      if (!skinnedMesh && child.isSkinnedMesh) {
        skinnedMesh = child;
      }
    });
    if (!skinnedMesh || !skinnedMesh.material) return;

    // Clone material once so ta không ảnh hưởng tới model khác
    if (!skinnedMesh.userData.originalMaterial) {
      skinnedMesh.userData.originalMaterial = skinnedMesh.material;
      skinnedMesh.material = skinnedMesh.material.clone();
    }

    const material = skinnedMesh.material;

    material.onBeforeCompile = (shader) => {
      console.log("💡 ModelShaderHighlight onBeforeCompile - attaching uniforms");
      shader.uniforms.muscleCenters = { value: Array(8).fill(new THREE.Vector3()) };
      shader.uniforms.muscleRadii = { value: new Array(8).fill(0.0) };
      shader.uniforms.muscleCount = { value: 0 };
      // Màu highlight rất dễ thấy (xanh neon)
      shader.uniforms.highlightColor = { value: new THREE.Color("#22c55e") };
      // Tăng intensity mạnh để dễ quan sát, sau này có thể giảm
      shader.uniforms.highlightIntensity = { value: intensity * 2.0 };

      shader.vertexShader =
        `
        varying vec3 vModelPosition;
      ` +
        shader.vertexShader.replace(
          "void main() {",
          "void main() {\n  vModelPosition = position;"
        );

      shader.fragmentShader =
        `
        uniform vec3 muscleCenters[8];
        uniform float muscleRadii[8];
        uniform int muscleCount;
        uniform vec3 highlightColor;
        uniform float highlightIntensity;
        varying vec3 vModelPosition;
      ` +
        shader.fragmentShader.replace(
          "#include <output_fragment>",
          `
          float mask = 0.0;
          for (int i = 0; i < 8; i++) {
            if (i >= muscleCount) break;
            float d = length(vModelPosition - muscleCenters[i]);
            float r = muscleRadii[i];
            float k = smoothstep(r, r * 0.6, d);
            mask = max(mask, 1.0 - k);
          }
          float blend = clamp(mask * highlightIntensity, 0.0, 1.0);
          vec3 hlColor = mix(outgoingLight, highlightColor, blend);
          gl_FragColor = vec4( hlColor, diffuseColor.a );
        `
        );

      shaderRef.current = shader;
    };

    material.needsUpdate = true;

    return () => {
      // Restore original material nếu cần trong tương lai
    };
  }, [modelRef, intensity]);

  // Cập nhật centers/radii khi muscleGroups thay đổi
  useEffect(() => {
    const shader = shaderRef.current;
    if (!shader || !modelRef?.current) return;

    const centerInfo = modelRef.current.userData?.centerInfo;
    if (!centerInfo) return;

    const centers = [];
    const radii = [];

    muscleGroups.slice(0, 8).forEach((mg) => {
      const heightRange = getMuscleHeightRange(mg);
      const offset = getMuscleOffset(mg);

      const minY = centerInfo.boundingBox?.min?.y ?? -1;
      const maxY = centerInfo.boundingBox?.max?.y ?? 1;
      const h = maxY - minY || 1;
      const yCenterRatio = (heightRange.from + heightRange.to) / 2;
      const yCenter = minY + yCenterRatio * h;

      const width = centerInfo.boundingBox?.size?.x ?? 1;
      const depth = centerInfo.boundingBox?.size?.z ?? 1;
      const x = (offset.x || 0) * (width * 0.5);
      const z = (offset.z || 0) * (depth * 0.5);

      centers.push(new THREE.Vector3(x, yCenter, z));
      const baseScaleX = width * 0.45;
      const baseScaleY = (heightRange.to - heightRange.from) * h || 0.5;
      const baseScaleZ = depth * 0.45;
      radii.push(Math.max(baseScaleX, baseScaleY, baseScaleZ) * 0.6);
    });

    // Nếu chưa có center nào (debug), tô cả thân để dễ nhìn
    if (centers.length === 0) {
      const minY = centerInfo.boundingBox?.min?.y ?? -1;
      const maxY = centerInfo.boundingBox?.max?.y ?? 1;
      const h = maxY - minY || 1;
      centers.push(new THREE.Vector3(0, 0, 0));
      radii.push(h * 0.8);
      console.log("💡 Shader debug: no specific muscles, tinting whole body", { minY, maxY, h });
    }

    for (let i = 0; i < 8; i++) {
      shader.uniforms.muscleCenters.value[i] = centers[i] || new THREE.Vector3(0, -9999, 0);
      shader.uniforms.muscleRadii.value[i] = radii[i] || 0.0;
    }
    shader.uniforms.muscleCount.value = centers.length;
    shader.uniforms.highlightIntensity.value = intensity * 2.0;
    console.log("💡 Shader uniforms updated:", {
      count: centers.length,
      centers,
      radii,
      intensity: shader.uniforms.highlightIntensity.value,
    });
  }, [muscleGroups, exerciseSlug, intensity, modelRef]);

  return null;
}

/**
 * Exercise Viewer 3D Component
 */
export default function ExerciseViewer3D({
  exerciseSlug,
  muscle_group = "default",
  modelUrl = null,
  height = "64",
  showControls = true,
  autoPlay = false,
  stepByStep = false, // New: step-by-step mode
  autoHighlight = true, // New: auto-enable highlight
  className = "",
}) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1.0);
  const [animationController, setAnimationController] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showMuscleHighlight, setShowMuscleHighlight] = useState(autoHighlight);
  const [highlightIntensity, setHighlightIntensity] = useState(1.0);
  const [enablePulse, setEnablePulse] = useState(true);
  const modelRef = useRef(null);
  const muscleGroups = exerciseSlug 
    ? getMuscleGroupsForExercise(exerciseSlug)
    : [muscle_group];
  
  // Auto-get model URL from config if not provided
  const finalModelUrl = modelUrl || (exerciseSlug ? getExerciseModelUrl(exerciseSlug) : null);
  
  // Debug logging
  React.useEffect(() => {
    if (finalModelUrl) {
      console.log(`🔍 Attempting to load model: ${finalModelUrl} for exercise: ${exerciseSlug}`);
    } else {
      console.warn(`⚠️ No model URL found for exercise: ${exerciseSlug}, will use primitive fallback`);
    }
  }, [finalModelUrl, exerciseSlug]);

  const handlePlay = () => {
    if (animationController) {
      console.log(`🎮 Play button clicked, controller:`, {
        type: animationController.constructor?.name,
        hasPlay: typeof animationController.play === 'function',
        hasResume: typeof animationController.resume === 'function',
        currentAction: animationController.currentAction?.getClip()?.name,
        animNames: animationController.getAnimationNames?.() || []
      });
      
      // If it's AnimationController, use play method
      if (typeof animationController.play === 'function') {
        // Get first animation name if available
        const animNames = animationController.getAnimationNames?.() || [];
        if (animNames.length > 0) {
          console.log(`▶️ Playing animation: ${animNames[0]}`);
          animationController.play(animNames[0]);
        } else {
          console.log(`▶️ Playing default animation`);
          animationController.play();
        }
      } else if (typeof animationController.resume === 'function') {
        console.log(`▶️ Resuming animation`);
        animationController.resume();
      } else if (animationController.currentAction) {
        // Fallback: directly play the action
        console.log(`▶️ Directly playing currentAction`);
        const action = animationController.currentAction;
        // Create a new action state object instead of modifying directly
        const newAction = {
          ...action,
          enabled: true,
          paused: false
        };
        action.setEffectiveWeight(1.0);
        if (!action.isRunning()) {
          action.play();
        }
        console.log(`🔧 Action state after direct play: paused=${newAction.paused}, enabled=${newAction.enabled}, isRunning=${action.isRunning()}`);
      } else {
        console.warn(`⚠️ Animation controller doesn't have play/resume method`);
      }
      
      // Set playing state AFTER all play operations
      setIsPlaying(true);
      
      // CRITICAL: Update ref immediately so animation loop can see it
      // Find the ExerciseModel component's ref (we need to pass it down or use a different approach)
      // For now, force unpause directly on the action
      if (animationController.currentAction) {
        // eslint-disable-next-line react-hooks/immutability
        animationController.currentAction.paused = false;
        // eslint-disable-next-line react-hooks/immutability
        animationController.currentAction.enabled = true;
        console.log(`🔧 Force unpaused after play: paused=${animationController.currentAction.paused}, enabled=${animationController.currentAction.enabled}`);
      }
    } else {
      console.warn(`⚠️ No animation controller available`);
    }
  };

  const handlePause = () => {
    if (animationController) {
      animationController.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (animationController) {
      // Đưa animation về đầu và dừng hẳn
      animationController.reset();
      animationController.pause();
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  const handleNextStep = () => {
    if (animationController && stepByStep) {
      // For step-by-step, we'll use animation time control
      if (animationController.setTime) {
        const totalDuration = animationController.getDuration?.() || 3;
        const numSteps = phases.length;
        const stepDuration = totalDuration / numSteps;
        const nextStep = Math.min(currentStep + 1, numSteps - 1);
        const nextTime = nextStep * stepDuration;
        animationController.setTime(nextTime);
        setCurrentStep(nextStep);
        setIsPlaying(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (animationController && stepByStep) {
      if (animationController.setTime) {
        const totalDuration = animationController.getDuration?.() || 3;
        const numSteps = phases.length;
        const stepDuration = totalDuration / numSteps;
        const prevStep = Math.max(currentStep - 1, 0);
        const prevTime = prevStep * stepDuration;
        animationController.setTime(prevTime);
        setCurrentStep(prevStep);
        setIsPlaying(false);
      }
    }
  };

  // Exercise phases for step-by-step mode
  const getExercisePhases = (slug) => {
    const phases = {
      squat: [
        "Bắt đầu: Đứng thẳng, chân rộng bằng vai",
        "Xuống: Hạ người xuống, đẩy hông ra sau",
        "Dưới cùng: Đùi song song với sàn",
        "Lên: Đẩy gót chân, trở về vị trí ban đầu"
      ],
      "push-up": [
        "Bắt đầu: Tư thế plank, tay thẳng",
        "Xuống: Hạ người từ từ, giữ thẳng lưng",
        "Dưới cùng: Ngực gần chạm sàn",
        "Lên: Đẩy lên, trở về vị trí ban đầu"
      ],
      "goblet-squat": [
        "Bắt đầu: Giữ tạ trước ngực, đứng thẳng",
        "Xuống: Hạ người, giữ tạ gần ngực",
        "Dưới cùng: Đùi song song với sàn",
        "Lên: Đẩy lên, giữ tạ ổn định"
      ],
    };
    return phases[slug] || ["Bắt đầu", "Thực hiện", "Giữ", "Hoàn thành"];
  };

  const phases = getExercisePhases(exerciseSlug);

  return (
    <div className={`w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {finalModelUrl && (
        <div className="px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/30 text-xs text-blue-300">
          📦 Đang load mô hình: {finalModelUrl.split('/').pop()}
        </div>
      )}
      <div style={{ height: `${height * 0.5}rem` }}>
        <BaseViewer3D
          cameraPosition={[3, 3, 3]}
          cameraFov={50}
          enableControls={true}
          enablePan={false}
        >
          <Suspense fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#4a5568" />
            </mesh>
          }>
            <ExerciseModel
              ref={modelRef}
              exerciseSlug={exerciseSlug}
              muscleGroup={muscle_group}
              modelUrl={finalModelUrl}
              isPlaying={isPlaying}
              speed={speed}
              onAnimationReady={setAnimationController}
            />
            {/* Auto-fit camera to model */}
            <CameraFitter modelRef={modelRef} />
            {/* Muscle highlight bằng mesh phụ (ổn định) */}
            {showMuscleHighlight && (
              <MuscleHighlight
                muscleGroups={muscleGroups}
                exerciseSlug={exerciseSlug}
                intensity={highlightIntensity}
                enablePulse={enablePulse}
              />
            )}
          </Suspense>
        </BaseViewer3D>
      </div>

      {showControls && animationController && (
        <div className="p-3 bg-slate-800 border-t border-slate-700 space-y-3">
          {/* Step-by-step mode */}
          {stepByStep && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-300">📋 Chế độ từng bước</span>
                <span className="text-gray-400">Bước {currentStep + 1}/{phases.length}</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-sm text-gray-200 border border-emerald-500/30">
                <div className="font-semibold text-emerald-300 mb-1">Bước {currentStep + 1}:</div>
                <div>{phases[currentStep]}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Bước trước
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={currentStep >= phases.length - 1}
                  className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bước sau →
                </button>
                <button
                  onClick={() => {
                    if (animationController && animationController.setTime) {
                      animationController.setTime(0);
                      setCurrentStep(0);
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30 border border-emerald-500/40"
                >
                  ↺ Về đầu
                </button>
              </div>
            </div>
          )}

          {/* Standard controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="px-3 py-1.5 rounded bg-emerald-500 text-white text-sm hover:bg-emerald-400"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm hover:bg-slate-600"
              >
                ↺ Reset
              </button>
              {!stepByStep && animationController && animationController.setTime && (
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    if (animationController.setTime) {
                      animationController.setTime(0);
                      animationController.pause();
                      setIsPlaying(false);
                    }
                    // Enable step-by-step mode (would need state management)
                  }}
                  className="px-3 py-1.5 rounded bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 border border-purple-500/40"
                >
                  📋 Từng bước
                </button>
              )}
              <button
                onClick={() => setShowMuscleHighlight(!showMuscleHighlight)}
                className={`px-3 py-1.5 rounded text-white text-sm border transition-colors ${
                  showMuscleHighlight
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-slate-700 text-gray-300 border-slate-600 hover:bg-slate-600"
                }`}
                title="Highlight nhóm cơ được target trong bài tập này"
              >
                💪 Highlight cơ
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label>Speed:</label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs w-8">{speed}x</span>
            </div>
          </div>

          {/* Muscle highlight controls */}
          {showMuscleHighlight && muscleGroups.length > 0 && (
            <div className="pt-3 border-t border-slate-700 space-y-3">
              {/* Muscle groups legend */}
              <div className="text-xs text-gray-400 mb-2">
                Nhóm cơ được target:
        </div>
              <div className="flex flex-wrap gap-2">
                {muscleGroups.map((mg) => {
                  const color = getMuscleColor(mg);
                  const intensity = exerciseSlug ? getMuscleIntensity(exerciseSlug, mg) : 1.0;
                  return (
                    <div
                      key={mg}
                      className="px-2 py-1 rounded text-xs flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${color}20`,
                        border: `1px solid ${color}40`,
                        color: color,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">
                        {MUSCLE_GROUPS[mg]?.name || mg}
                        {intensity < 1.0 && (
                          <span className="opacity-70 ml-1">
                            ({Math.round(intensity * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Highlight intensity and pulse controls */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-gray-400">Độ sáng:</label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.1"
                    value={highlightIntensity}
                    onChange={(e) => setHighlightIntensity(parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs w-8">{highlightIntensity.toFixed(1)}x</span>
                </div>
                <button
                  onClick={() => setEnablePulse(!enablePulse)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    enablePulse
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : "bg-slate-700 text-gray-300 border-slate-600 hover:bg-slate-600"
                  }`}
                  title="Bật/tắt hiệu ứng pulse"
                >
                  {enablePulse ? "✨ Pulse ON" : "✨ Pulse OFF"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

