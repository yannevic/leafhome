import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ActivityIndicator, ScrollView } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ModalSucesso from '../components/ModalSucesso';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

export default function Index() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [modalSucesso, setModalSucesso] = useState(false);

  async function handleSubmit() {
    if (!email || !senha) {
      setErro('preencha todos os campos');
      return;
    }
    setErro('');
    setCarregando(true);
    try {
      if (modo === 'login') {
        await signInWithEmailAndPassword(auth, email, senha);
        const uid = auth.currentUser!.uid;
        const snap = await getDoc(doc(db, 'users', uid));
        const espacoAtivo = snap.data()?.espacoAtivo;
        if (espacoAtivo) {
          router.replace('/(tabs)');
        } else {
          router.replace('/espacos');
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, senha);
        setModalSucesso(true);
      }
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
        setErro('e-mail ou senha incorretos');
      } else if (e.code === 'auth/email-already-in-use') {
        setErro('e-mail já cadastrado');
      } else if (e.code === 'auth/weak-password') {
        setErro('senha fraca — mínimo 6 caracteres');
      } else {
        setErro('algo deu errado, tente novamente');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(210,225,255,0.85)' }} behavior="padding">
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
            <Text style={styles.titulo}>leafhome</Text>
            <Text style={styles.subtitulo}>
              {modo === 'login' ? 'bem-vinda de volta' : 'crie sua conta'}
            </Text>

            <Text style={styles.label}>e-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="rgba(122,48,64,0.35)"
              placeholder="seu@email.com"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.label}>senha</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputInner}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                placeholderTextColor="rgba(122,48,64,0.35)"
                placeholder="••••••"
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.olho}>
                {mostrarSenha
                  ? <EyeOff size={18} color="rgba(122,48,64,0.4)" strokeWidth={2} />
                  : <Eye size={18} color="rgba(122,48,64,0.4)" strokeWidth={2} />
                }
              </TouchableOpacity>
            </View>

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            <TouchableOpacity
              style={styles.botao}
              onPress={handleSubmit}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color="#3d1a10" />
              ) : (
                <Text style={styles.botaoTexto}>
                  {modo === 'login' ? 'entrar' : 'cadastrar'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro(''); }}>
              <Text style={styles.trocar}>
                {modo === 'login' ? 'não tem conta? cadastre-se' : 'já tem conta? entrar'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
      <ModalSucesso
        visivel={modalSucesso}
        titulo="conta criada"
        mensagem="bem-vinda ao leafhome!"
        botaoTexto="confirmar"
        onConfirmar={() => {
          setModalSucesso(false);
          setModo('login');
          setSenha('');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    marginBottom: 16,
    marginTop: 4,
  },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
  trocar: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.55)',
    textAlign: 'center',
  },
});