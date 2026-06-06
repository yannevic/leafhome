import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChevronLeft } from 'lucide-react-native';

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const parte1 = Array.from(
    { length: 4 },
    () => letras[Math.floor(Math.random() * letras.length)]
  ).join('');
  const parte2 = Array.from(
    { length: 4 },
    () => nums[Math.floor(Math.random() * nums.length)]
  ).join('');
  return `${parte1}-${parte2}`;
}

export default function EspacosCriar() {
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function criarEspaco() {
    if (!nome.trim()) {
      setErro('dê um nome pro seu espaço');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      const uid = auth.currentUser!.uid;
      const novoCodigo = gerarCodigo();
      const espacoRef = await addDoc(collection(db, 'spaces'), {
        nome: nome.trim(),
        codigo: novoCodigo,
        criadoPor: uid,
        criadoEm: new Date(),
      });
      await setDoc(doc(db, 'space_members', `${espacoRef.id}_${uid}`), {
        spaceId: espacoRef.id,
        userId: uid,
        entradoEm: new Date(),
      });
      await setDoc(
        doc(db, 'users', uid),
        {
          espacoAtivo: espacoRef.id,
          espacos: arrayUnion(espacoRef.id),
        },
        { merge: true }
      );
      router.replace('/(tabs)');
    } catch {
      setErro('algo deu errado, tente novamente');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <StatusBar style="dark" />
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.fundo, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
            <ChevronLeft
              size={18}
              color="rgba(122,48,64,0.55)"
              strokeWidth={2}
            />
            <Text style={styles.voltarTexto}>voltar</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>novo espaço</Text>
          <Text style={styles.subtitulo}>
            crie um espaço e convide quem quiser
          </Text>

          <LinearGradient
            colors={[
              'rgba(253,246,240,1)',
              'rgba(252,220,228,0.9)',
              'rgba(230,235,255,0.8)',
              'rgba(255,248,220,0.7)',
              'rgba(232,220,255,0.8)',
              'rgba(253,246,240,1)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.label}>nome do espaço</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="ex: trabalho, família..."
              placeholderTextColor="rgba(122,48,64,0.35)"
              underlineColorAndroid="transparent"
            />
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            <TouchableOpacity
              style={styles.botao}
              onPress={criarEspaco}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color="#3d1a10" />
              ) : (
                <Text style={styles.botaoTexto}>criar espaço</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 4,
  },
  voltarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
  },
  titulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#3d1a10',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitulo: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 28,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  label: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(253,242,246,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: '#3d1a10',
    marginBottom: 16,
  },
  erro: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: '#e8607a',
    textAlign: 'center',
    marginBottom: 12,
  },
  botao: {
    backgroundColor: 'rgba(232,160,176,0.55)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
});
