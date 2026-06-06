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
import * as Clipboard from 'expo-clipboard';
import { ClipboardPaste } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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

export default function Espacos() {
  const [aba, setAba] = useState<'criar' | 'entrar'>('criar');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
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
        { espacoAtivo: espacoRef.id, espacos: arrayUnion(espacoRef.id) },
        { merge: true }
      );
      router.replace('/(tabs)');
    } catch {
      setErro('algo deu errado, tente novamente');
    } finally {
      setCarregando(false);
    }
  }

  async function entrarEspaco() {
    if (!codigo.trim()) {
      setErro('digite o código do espaço');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      const uid = auth.currentUser!.uid;
      const q = query(
        collection(db, 'spaces'),
        where('codigo', '==', codigo.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setErro('código não encontrado');
        setCarregando(false);
        return;
      }
      const espacoId = snap.docs[0].id;
      await setDoc(doc(db, 'space_members', `${espacoId}_${uid}`), {
        spaceId: espacoId,
        userId: uid,
        entradoEm: new Date(),
      });
      await setDoc(
        doc(db, 'users', uid),
        { espacoAtivo: espacoId, espacos: arrayUnion(espacoId) },
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'rgba(210,225,255,0.85)' }}
      behavior="padding"
    >
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
          <Text style={styles.titulo}>seu espaço</Text>
          <Text style={styles.subtitulo}>
            crie um espaço ou entre em um existente
          </Text>

          <View style={styles.abas}>
            <TouchableOpacity
              style={[styles.aba, aba === 'criar' && styles.abaAtiva]}
              onPress={() => {
                setAba('criar');
                setErro('');
              }}
            >
              <Text
                style={[
                  styles.abaTexto,
                  aba === 'criar' && styles.abaTextoAtivo,
                ]}
              >
                criar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aba, aba === 'entrar' && styles.abaAtiva]}
              onPress={() => {
                setAba('entrar');
                setErro('');
              }}
            >
              <Text
                style={[
                  styles.abaTexto,
                  aba === 'entrar' && styles.abaTextoAtivo,
                ]}
              >
                entrar
              </Text>
            </TouchableOpacity>
          </View>

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
            {aba === 'criar' ? (
              <>
                <Text style={styles.label}>nome do espaço</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="ex: nossa casa"
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
              </>
            ) : (
              <>
                <Text style={styles.label}>código do espaço</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputInner}
                    value={codigo}
                    onChangeText={setCodigo}
                    placeholder="ex: ABCD-1234"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    autoCapitalize="characters"
                    underlineColorAndroid="transparent"
                  />
                  <TouchableOpacity
                    style={styles.olho}
                    onPress={async () => {
                      const texto = await Clipboard.getStringAsync();
                      setCodigo(texto.toUpperCase());
                    }}
                  >
                    <ClipboardPaste
                      size={18}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                </View>
                {erro ? <Text style={styles.erro}>{erro}</Text> : null}
                <TouchableOpacity
                  style={styles.botao}
                  onPress={entrarEspaco}
                  disabled={carregando}
                >
                  {carregando ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>entrar no espaço</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  abas: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(253,242,246,0.7)',
    borderRadius: 12,
    padding: 4,
  },
  aba: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  abaAtiva: {
    backgroundColor: 'rgba(232,160,176,0.55)',
  },
  abaTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
  },
  abaTextoAtivo: {
    color: '#3d1a10',
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
  inputWrapper: {
    backgroundColor: 'rgba(253,242,246,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: '#3d1a10',
  },
  olho: {
    paddingHorizontal: 12,
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
