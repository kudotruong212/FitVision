// Simple GLB viewer - chỉ hiển thị model với animation đơn giản
import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Component để load và hiển thị GLB với animation
function Model({ url, autoPlay = true }) {
  const { scene, animations } = useGLTF(url);
  const mixerRef = useRef(null);
  const actionRef = useRef(null);
  
  console.log("📦 Model loaded:", {
    type: scene.type,
    name: scene.name,
    children: scene.children.length,
    visible: scene.visible,
    animationsCount: animations.length,
    animationNames: animations.map(a => a.name)
  });
  
  // Đảm bảo model visible và ẩn TẤT CẢ helper objects và platform objects - KHÔNG ẩn bones
  scene.visible = true;
  scene.traverse((child) => {
    // Ẩn tất cả lines và line segments
    if (child.type === 'Line' || child.type === 'LineSegments') {
      child.visible = false;
      if (child.name) {
        console.log("  - Hidden line:", child.name);
      }
      return;
    }
    
    // Giữ bones structure (không render nhưng cần cho animation)
    if (child.isBone || child.type === 'Bone') {
      return;
    }
    
    // Ẩn các helper/platform objects theo tên
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
      if (!child.name.toLowerCase().includes('bone') && 
          !child.name.toLowerCase().includes('armature') &&
          !child.name.toLowerCase().includes('skeleton') &&
          !child.name.toLowerCase().includes('mixamorig')) {
        child.visible = false;
        console.log("  - Hidden helper/platform:", child.name);
        return;
      }
    }
    
    // Xử lý mesh - CHỈ giữ skinned mesh (character)
    if (child.isMesh || child.isSkinnedMesh) {
      // GIỮ NGUYÊN skinned mesh (character mesh)
      if (child.isSkinnedMesh) {
        return;
      }
      
      // Đối với regular mesh, kiểm tra và ẩn nếu là platform/helper
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
        console.log("  - Hidden platform/helper mesh:", child.name);
        return;
      }
      
      // KIỂM TRA MATERIAL COLOR - Ẩn TẤT CẢ mesh có màu green hoặc yellow
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        for (const material of materials) {
          if (material.color) {
            const color = material.color;
            const r = color.r;
            const g = color.g;
            const b = color.b;
            
            // Kiểm tra nếu là màu green (g cao, r và b thấp)
            const isGreen = g > 0.6 && r < 0.4 && b < 0.4;
            // Kiểm tra nếu là màu yellow (r và g cao, b thấp)
            const isYellow = r > 0.6 && g > 0.6 && b < 0.4;
            
            if (isGreen || isYellow) {
              child.visible = false;
              console.log(`  - Hidden colored platform: ${child.name || 'unnamed'}, color: rgb(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}), isGreen: ${isGreen}, isYellow: ${isYellow}`);
              return;
            }
          }
        }
      }
      child.visible = true;
      console.log("  - Child:", child.name, child.type, "visible:", child.visible);
    }
  });
  
  // Auto-scale và center
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim > 0) {
    // Scale về kích thước hợp lý (2 units)
    const scale = 2 / maxDim;
    scene.scale.set(scale, scale, scale);
    // Center về origin
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    console.log("📐 Scaled and centered:", { scale, size, center });
  }
  
  // Setup animation
  useEffect(() => {
    if (animations.length > 0) {
      console.log("🎬 Setting up animation...");
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;
      
      // Use first animation
      const clip = animations[0];
      const action = mixer.clipAction(clip);
      actionRef.current = action;
      
      // Setup action
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.timeScale = 1.0;
      action.enabled = true;
      action.setEffectiveWeight(1.0);
      
      // Play if autoPlay
      if (autoPlay) {
        action.play();
        console.log("▶️ Animation playing:", clip.name, "duration:", clip.duration);
      } else {
        action.paused = true;
        console.log("⏸ Animation paused:", clip.name);
      }
      
      return () => {
        mixer.stopAllAction();
      };
    }
  }, [animations, scene, autoPlay]);
  
  // Update mixer every frame
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });
  
  return <primitive object={scene} />;
}

// Component chính
export default function SimpleGLBViewer({ modelUrl = "/models/exercises/squat.glb", autoPlay = true }) {
  return (
    <div style={{ width: "100%", height: "80vh", background: "#1a1a1a" }}>
      <Canvas camera={{ position: [3, 3, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <Model url={modelUrl} autoPlay={autoPlay} />
        </Suspense>
        
        <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} />
        
        {/* Debug helpers - comment out to hide */}
        {/* <gridHelper args={[10, 10]} /> */}
        {/* <axesHelper args={[2]} /> */}
      </Canvas>
    </div>
  );
}

