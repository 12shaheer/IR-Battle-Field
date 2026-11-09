import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Image as SvgImage,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';

const W = 392;
const H = 108;

const OUTER_POINTS = [
  [0, 0],
  [W, 0],
  [W, H * 0.5],
  [W * 0.54, H * 0.5],
  [W * 0.46, H],
  [0, H],
];

const OUTER_RADII = [10, 10, 10, 4, 10, 10];
const INNER_RADII = [8, 8, 8, 2, 8, 8];
const BORDER = 4;

function roundedPolygonPath(points, radius) {
  const n = points.length;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const norm = (v) => {
    const len = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / len, v[1] / len];
  };

  let d = '';
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];

    const rTarget = Array.isArray(radius) ? radius[i] : radius;
    const r = Math.min(rTarget, dist(prev, curr) / 2, dist(curr, next) / 2);

    const inDir = norm([curr[0] - prev[0], curr[1] - prev[1]]);
    const outDir = norm([next[0] - curr[0], next[1] - curr[1]]);

    const p1 = [curr[0] - inDir[0] * r, curr[1] - inDir[1] * r];
    const p2 = [curr[0] + outDir[0] * r, curr[1] + outDir[1] * r];

    d += i === 0 ? `M ${p1[0]} ${p1[1]} ` : `L ${p1[0]} ${p1[1]} `;
    d += `Q ${curr[0]} ${curr[1]} ${p2[0]} ${p2[1]} `;
  }
  return d + 'Z';
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function lineIntersect(p1, p2, p3, p4) {
  const a1 = p2[1] - p1[1], b1 = p1[0] - p2[0], c1 = a1 * p1[0] + b1 * p1[1];
  const a2 = p4[1] - p3[1], b2 = p3[0] - p4[0], c2 = a2 * p3[0] + b2 * p3[1];
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-6) return p2;
  return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
}

function offsetPolygonInward(points, dist) {
  const n = points.length;
  const sign = signedArea(points) > 0 ? 1 : -1;

  const offsetLines = points.map((p1, i) => {
    const p2 = points[(i + 1) % n];
    let dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const nx = sign * -dy;
    const ny = sign * dx;
    return [
      [p1[0] + nx * dist, p1[1] + ny * dist],
      [p2[0] + nx * dist, p2[1] + ny * dist],
    ];
  });

  return points.map((_, i) => {
    const lineA = offsetLines[(i - 1 + n) % n];
    const lineB = offsetLines[i];
    return lineIntersect(lineA[0], lineA[1], lineB[0], lineB[1]);
  });
}

const INNER_POINTS = offsetPolygonInward(OUTER_POINTS, BORDER);
const OUTER_PATH = roundedPolygonPath(OUTER_POINTS, OUTER_RADII);
const INNER_PATH = roundedPolygonPath(INNER_POINTS, INNER_RADII);

export default function GameModeCard({ title, image, buttonText = 'JOIN GAME', onPress, onButtonPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top angled image panel */}
      <View style={styles.topPanel}>
        <Svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={styles.topPanelSvg}
        >
          <Defs>
            <ClipPath id="innerClip">
              <Path d={INNER_PATH} />
            </ClipPath>
            <LinearGradient id="shadeGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="black" stopOpacity="0.55" />
              <Stop offset="55%" stopColor="black" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="black" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {/* White border shape */}
          <Path d={OUTER_PATH} fill="#ffffff" />
          {/* Background image clipped to inner shape */}
          <SvgImage
            href={image}
            x="0"
            y="0"
            width={W}
            height={H}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#innerClip)"
          />
          {/* Readability gradient overlay */}
          <Path
            d={`M0 0 H${W} V${H} H0 Z`}
            fill="url(#shadeGradient)"
            clipPath="url(#innerClip)"
          />
        </Svg>

        {/* Title overlay */}
        <View style={styles.topPanelText}>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <View style={styles.symbols}>
          {/* Circle */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"
              stroke="#ff4d6d"
              strokeWidth="2"
              fill="none"
            />
          </Svg>
          {/* Square */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 4h16v16H4z"
              stroke="#ff6fd8"
              strokeWidth="2"
              fill="none"
            />
          </Svg>
          {/* Cross */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 5L19 19M19 5L5 19"
              stroke="#4da3ff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
          {/* Triangle */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3L21 20L3 20Z"
              stroke="#3ddc84"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => {
            if (onButtonPress) onButtonPress();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.joinButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 14,
    backgroundColor: '#2a1452',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'visible',
  },
  topPanel: {
    height: 72,
    marginTop: -20,
    marginBottom: -20,
  },
  topPanelSvg: {
    width: '100%',
    height: '100%',
  },
  topPanelText: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingTop: 14,
    paddingLeft: 12,
    maxWidth: '58%',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#c6f24e',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 20,
  },
  symbols: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
  },
  joinButton: {
    backgroundColor: '#c6f24e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -30,
  },
  joinButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
});
