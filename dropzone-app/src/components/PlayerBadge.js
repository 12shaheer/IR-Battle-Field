import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Polyline } from 'react-native-svg';

export default function PlayerBadge({ username, userId, gender, avatarUri, onPress }) {
  const displayName = username || 'Player';
  const displayId = userId || '------';

  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open player profile" style={styles.badge} onPress={onPress} activeOpacity={0.8}>
      {/* Polygon background panel */}
      <View style={styles.polygonWrap}>
        <Svg viewBox="0 0 300 78" preserveAspectRatio="none" style={styles.polygonSvg}>
          <Polygon
            points="0,0 272,0 300,78 28,78"
            fill="rgba(20,22,30,0.55)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
          />
        </Svg>
      </View>

      {/* Name bar */}
      <View style={styles.nameBar}>
        <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
      </View>

      {/* User ID */}
      <Text style={styles.userIdText}>{displayId}</Text>

      {/* Gender icon */}
      {gender && (
        <View style={styles.genderIcon}>
          {gender === 'male' && (
            <Svg viewBox="0 0 24 24" width={22} height={22}>
              <Circle cx="10" cy="14" r="7.5" fill="none" stroke="#6FB8EE" strokeWidth="2" />
              <Line x1="15.3" y1="8.7" x2="20.5" y2="3.5" stroke="#6FB8EE" strokeWidth="2" strokeLinecap="round" />
              <Polyline points="14.5,3.5 20.5,3.5 20.5,9.5" fill="none" stroke="#6FB8EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
          {gender === 'female' && (
            <Svg viewBox="0 0 24 24" width={22} height={22}>
              <Circle cx="12" cy="10" r="7" fill="none" stroke="#EE6FB8" strokeWidth="2" />
              <Line x1="12" y1="17" x2="12" y2="23" stroke="#EE6FB8" strokeWidth="2" strokeLinecap="round" />
              <Line x1="9" y1="20" x2="15" y2="20" stroke="#EE6FB8" strokeWidth="2" strokeLinecap="round" />
            </Svg>
          )}
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 260,
    height: 130,
  },
  polygonWrap: {
    position: 'absolute',
    top: 50,
    left: 12,
    width: 210,
    height: 54,
  },
  polygonSvg: {
    width: '100%',
    height: '100%',
  },
  nameBar: {
    position: 'absolute',
    top: 15,
    left: 54,
    width: 200,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#CFCFCF',
    justifyContent: 'center',
    paddingLeft: 18,
    paddingRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C2C2C',
    letterSpacing: 0.3,
  },
  userIdText: {
    position: 'absolute',
    top: 74,
    left: 36,
    fontSize: 12,
    fontWeight: '600',
    color: '#F0F0F0',
    letterSpacing: 0.3,
  },
  genderIcon: {
    position: 'absolute',
    top: 72,
    left: 176,
  },
  avatar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3FC1D6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
