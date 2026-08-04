import React, { useRef, useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

function base64ToArrayBuffer(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const len = base64.length;
  let bufLen = (len * 3) / 4;
  if (base64[len - 1] === '=') bufLen--;
  if (base64[len - 2] === '=') bufLen--;
  const buf = new ArrayBuffer(bufLen);
  const view = new Uint8Array(buf);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = chars.indexOf(base64[i]);
    const b = chars.indexOf(base64[i + 1]);
    const c = chars.indexOf(base64[i + 2]);
    const d = chars.indexOf(base64[i + 3]);
    view[p++] = (a << 2) | (b >> 4);
    if (c !== -1 && base64[i + 2] !== '=') view[p++] = ((b & 15) << 4) | (c >> 2);
    if (d !== -1 && base64[i + 3] !== '=') view[p++] = ((c & 3) << 6) | d;
  }
  return buf;
}

function ModelViewer({ modelAsset, style, autoRotate = true }) {
  const mountedRef = useRef(true);
  const rafRef = useRef(null);
  const glRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      glRef.current = null;
    };
  }, []);

  const onContextCreate = async (gl) => {
    if (!mountedRef.current) return;
    glRef.current = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      35,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 4);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-2, 1, -2);
    scene.add(fillLight);

    try {
      const [asset] = await Asset.loadAsync(modelAsset);
      if (!mountedRef.current) return;

      const fileUri = asset.localUri || asset.uri;
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!mountedRef.current) return;

      const arrayBuffer = base64ToArrayBuffer(base64);

      const loader = new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.parse(arrayBuffer, '', resolve, reject);
      });
      if (!mountedRef.current) return;

      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.0 / maxDim;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      scene.add(model);
      setStatus('loaded');
    } catch (err) {
      console.error('Model loading failed:', err);
      if (mountedRef.current) setStatus('error');
    }

    let rotation = 0;
    const animate = () => {
      if (!mountedRef.current) return;
      rafRef.current = requestAnimationFrame(animate);
      if (autoRotate) {
        rotation += 0.008;
        scene.rotation.y = rotation;
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  return (
    <View style={[styles.container, style]}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      {status === 'loading' && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#b44dff" size="small" />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>Failed to load</Text>
        </View>
      )}
    </View>
  );
}

export default memo(ModelViewer);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  glView: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 11,
  },
});
