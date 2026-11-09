import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
export default function HealingQrExporter({ value, onPng }) {
  const node = useRef(null);
  useEffect(() => {
    let stopped = false, attempts = 0, timer;
    const exportPng = () => {
      if (!node.current && attempts++ < 40) { timer = setTimeout(exportPng, 60);return; }
      try { node.current?.toDataURL(png => { if (!stopped) onPng({ value, png }); }); }
      catch (_) { if (!stopped && attempts++ < 40) timer = setTimeout(exportPng, 60); }
    };
    timer = setTimeout(exportPng, 60);return () => { stopped = true;clearTimeout(timer); };
  }, [value, onPng]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', opacity: 0, width: 224, height: 224 }}><QRCode value={value} size={200} quietZone={12} getRef={ref => { node.current = ref; }} /></View>;
}
