import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function Inicio() {
  return (
    <LinearGradient
      colors={[
        'rgba(255,220,235,0.9)',
        'rgba(230,220,255,0.85)',
        'rgba(255,240,250,0.9)',
        'rgba(210,225,255,0.85)',
        'rgba(255,225,240,0.9)',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fundo}
    >
      <StatusBar style="dark" />
      <Text style={styles.texto}>início</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fundo: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingBottom: 64,
},
  texto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 24,
    color: '#3d1a10',
  },
});