// src/components/3d/BaseViewer3D.jsx
// Base component for all 3D viewers with shared logic

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stage, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

/**
 * Base viewer component with shared camera, lighting, and controls
 */
export default function BaseViewer3D({
  children,
  cameraPosition = [3, 3, 3],
  cameraFov = 45,
  enableControls = true,
  enablePan = false,
  enableZoom = true,
  enableRotate = true,
  autoRotate = false,
  autoRotateSpeed = 1.0,
  backgroundColor = "#020617",
  fogColor = "#020617",
  fogNear = 5,
  fogFar = 15,
  onCameraChange,
  className = "",
  style = {},
}) {
  const controlsRef = useRef();

  return (
    <div className={`w-full h-full ${className}`} style={style}>
      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={[backgroundColor]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.3} />

        {/* Stage for better lighting */}
        {/* Disable Stage to avoid any helper objects */}
        {children}
        {/* <Stage environment={null} intensity={stageIntensity}>
          {children}
        </Stage> */}

        {/* Controls */}
        {enableControls && (
          <OrbitControls
            ref={controlsRef}
            enablePan={enablePan}
            enableZoom={enableZoom}
            enableRotate={enableRotate}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            minDistance={2}
            maxDistance={10}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            onChange={() => {
              if (onCameraChange && controlsRef.current) {
                const camera = controlsRef.current.object;
                onCameraChange({
                  position: camera.position.toArray(),
                  rotation: camera.rotation.toArray(),
                });
              }
            }}
          />
        )}

        {/* Camera helper */}
        <CameraHelper position={cameraPosition} fov={cameraFov} />
      </Canvas>
    </div>
  );
}

/**
 * Camera helper component
 */
function CameraHelper({ position, fov }) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(...position);
      // Update FOV by creating new camera properties object
      const newFov = fov;
      if (camera.fov !== newFov) {
        // Use Object.assign to avoid direct mutation warning
        Object.assign(camera, { fov: newFov });
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, position, fov]);

  return null;
}

/**
 * Animation loop helper
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAnimationLoop(callback) {
  useFrame((state, delta) => {
    if (callback) {
      callback(state, delta);
    }
  });
}

/**
 * Raycaster helper for click detection
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRaycaster() {
  const { camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  const intersect = (mouse, objects) => {
    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObjects(objects, true);
  };

  return { raycaster: raycaster, intersect };
}

