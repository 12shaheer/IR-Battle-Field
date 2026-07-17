import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg';

export default function LiveGrid({ players, zoneCenter, zoneRadius, gridSize = 100 }) {
  const screenWidth = Dimensions.get('window').width - 32;
  const size = Math.min(screenWidth, 500);
  const scale = size / gridSize;
  const step = gridSize / 10;

  const gridLines = [];
  for (let i = 0; i <= gridSize; i += step) {
    const px = i * scale;
    gridLines.push(
      <Line key={`v${i}`} x1={px} y1={0} x2={px} y2={size} stroke="#1f2937" strokeWidth={1} />,
      <Line key={`h${i}`} x1={0} y1={px} x2={size} y2={px} stroke="#1f2937" strokeWidth={1} />
    );
  }

  const cx = (zoneCenter?.x ?? 50) * scale;
  const cy = (zoneCenter?.y ?? 50) * scale;
  const r = (zoneRadius ?? 40) * scale;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill="#111827" />
        {gridLines}

        {/* Zone danger area (outside the circle) */}
        <Rect x={0} y={0} width={size} height={size} fill="rgba(220,38,38,0.08)" />
        <Circle cx={cx} cy={cy} r={r} fill="#111827" />

        {/* Zone border */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {/* Players */}
        {players.map((player) => {
          if (!player.position) return null;
          const x = (player.position.x ?? 0) * scale;
          const y = (player.position.y ?? 0) * scale;
          if (x < 0 || x > size || y < 0 || y > size) return null;
          const isAlive = player.status === 'alive';
          const color = isAlive ? '#22c55e' : '#6b7280';

          return (
            <View key={player.id}>
              <Circle cx={x} cy={y} r={isAlive ? 5 : 3} fill={color} />
              <SvgText
                x={x}
                y={y - 8}
                fontSize={9}
                fill={isAlive ? '#e5e7eb' : '#9ca3af'}
                textAnchor="middle"
              >
                {player.displayName || '?'}
              </SvgText>
            </View>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
    alignSelf: 'center',
    marginBottom: 16,
  },
});
