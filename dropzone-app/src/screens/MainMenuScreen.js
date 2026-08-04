import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useGame } from '../context/GameContext';
import ModelViewer from '../components/ModelViewer';
import VideoBackground from '../components/VideoBackground';

const CHARACTERS = [
  {
    id: 'velina',
    name: 'Velina',
    model: require('../../assets/models/velina_zzz.glb'),
  },
];

export default function MainMenuScreen({ navigation }) {
  const { setSelectedCharacter } = useGame();
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);

  const handlePlay = () => {
    setSelectedCharacter(selectedChar.id);
    navigation.replace('Join');
  };

  const handleSelectChar = (char) => {
    setSelectedChar(char);
    setActiveTab('Home');
  };

  return (
    <View style={styles.container}>
      <VideoBackground />
      <View style={styles.overlay}>
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <View style={styles.navTabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Home' && styles.tabActive]}
              onPress={() => setActiveTab('Home')}
            >
              <Text style={[styles.tabText, activeTab === 'Home' && styles.tabTextActive]}>HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Characters' && styles.tabActive]}
              onPress={() => setActiveTab('Characters')}
            >
              <Text style={[styles.tabText, activeTab === 'Characters' && styles.tabTextActive]}>CHARACTERS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content — both tabs stay mounted to avoid GL context teardown */}
        <View style={[styles.homeContent, activeTab !== 'Home' && styles.hidden]}>
          {/* Center: 3D Character */}
          <View style={styles.characterDisplay}>
            <ModelViewer
              modelAsset={selectedChar.model}
              style={styles.modelViewer}
              autoRotate={true}
            />
            <Text style={styles.characterName}>{selectedChar.name}</Text>
          </View>

          {/* Right: Play Button */}
          <View style={styles.rightPanel}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.8}>
              <Text style={styles.playButtonText}>PLAY!</Text>
            </TouchableOpacity>
            <Text style={styles.modeText}>BATTLE ROYALE</Text>
          </View>
        </View>

        <View style={[styles.charactersContent, activeTab !== 'Characters' && styles.hidden]}>
          <Text style={styles.charSectionTitle}>SELECT YOUR CHARACTER</Text>
          <View style={styles.charGrid}>
            {CHARACTERS.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={[
                  styles.charCard,
                  selectedChar.id === char.id && styles.charCardSelected,
                ]}
                onPress={() => handleSelectChar(char)}
                activeOpacity={0.7}
              >
                <ModelViewer
                  modelAsset={char.model}
                  style={styles.charCardModel}
                  autoRotate={true}
                />
                <Text style={styles.charCardName}>{char.name}</Text>
                {selectedChar.id === char.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>EQUIPPED</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  hidden: {
    display: 'none',
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  navTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(150, 50, 255, 0.4)',
    borderBottomWidth: 2,
    borderBottomColor: '#b44dff',
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: '#fff',
  },
  // Home Tab
  homeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  characterDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelViewer: {
    width: 250,
    height: 300,
  },
  characterName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Right Panel
  rightPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
  },
  playButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  playButtonText: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
  // Characters Tab
  charactersContent: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  charSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 16,
    textShadowColor: 'rgba(150, 50, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  charGrid: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  charCard: {
    width: 180,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  charCardSelected: {
    borderColor: '#b44dff',
    borderWidth: 3,
    shadowColor: '#b44dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  charCardModel: {
    width: 160,
    height: 180,
  },
  charCardName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#b44dff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
