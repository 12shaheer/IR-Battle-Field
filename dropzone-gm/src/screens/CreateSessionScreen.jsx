import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { callFunction } from '../utils/api';

export default function CreateSessionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    venueName: '',
    maxPlayers: '40',
    zoneCenterX: '50',
    zoneCenterY: '50',
    zoneRadius: '40',
    shrinkInterval: '300',
    shrinkAmount: '0.2',
    zoneDamage: '10',
  });

  const update = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await callFunction('createSession', {
        venueName: form.venueName || 'DropZone Arena',
        maxPlayers: Number(form.maxPlayers),
        zoneCenterX: Number(form.zoneCenterX),
        zoneCenterY: Number(form.zoneCenterY),
        zoneRadius: Number(form.zoneRadius),
        shrinkInterval: Number(form.shrinkInterval),
        shrinkAmount: Number(form.shrinkAmount),
        zoneDamage: Number(form.zoneDamage),
      });
      navigation.replace('SessionManagement', { sessionId: result.data.sessionId });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.heading}>Create New Session</Text>

      <Text style={styles.label}>Venue Name</Text>
      <TextInput
        style={styles.input}
        placeholder="DropZone Arena"
        placeholderTextColor="#6b7280"
        value={form.venueName}
        onChangeText={update('venueName')}
      />

      <Text style={styles.label}>Max Players</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form.maxPlayers}
        onChangeText={update('maxPlayers')}
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Zone Center X</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.zoneCenterX}
            onChangeText={update('zoneCenterX')}
          />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Zone Center Y</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.zoneCenterY}
            onChangeText={update('zoneCenterY')}
          />
        </View>
      </View>

      <Text style={styles.label}>Starting Zone Radius</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form.zoneRadius}
        onChangeText={update('zoneRadius')}
      />

      <Text style={styles.label}>Shrink Interval (seconds)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form.shrinkInterval}
        onChangeText={update('shrinkInterval')}
      />

      <Text style={styles.label}>Shrink Amount (0.1 = 10%)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={form.shrinkAmount}
        onChangeText={update('shrinkAmount')}
      />

      <Text style={styles.label}>Zone Damage Per Shrink</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form.zoneDamage}
        onChangeText={update('zoneDamage')}
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Session'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#dc2626',
  },
  btnSecondary: {
    backgroundColor: '#374151',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
