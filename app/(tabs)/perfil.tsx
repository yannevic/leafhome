import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Switch,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Copy,
  LogOut,
  Trash2,
  UserMinus,
  Pencil,
  Eye,
  EyeOff,
  ChevronRight,
  Crown,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModalConfirmar from '../../components/ModalConfirmar';

const AVATARES = [
  { nome: 'tito', src: require('../../assets/avatars/tito.png') },
  { nome: 'larah', src: require('../../assets/avatars/larah.png') },
  { nome: 'mingau', src: require('../../assets/avatars/mingau.png') },
  { nome: 'pipoca', src: require('../../assets/avatars/pipoca.png') },
  { nome: 'gigi', src: require('../../assets/avatars/gigi.png') },
  { nome: 'lumis', src: require('../../assets/avatars/lumis.png') },
  { nome: 'spark', src: require('../../assets/avatars/spark.png') },
  { nome: 'fuba', src: require('../../assets/avatars/fuba.png') },
  { nome: 'mimo', src: require('../../assets/avatars/mimo.png') },
  { nome: 'mike', src: require('../../assets/avatars/mike.png') },
];

const AVATAR_DEFAULT = require('../../assets/avatars/default.png');

type Membro = {
  userId: string;
  apelido: string;
  avatarNome: string;
};

export default function Perfil() {
  const insets = useSafeAreaInsets();
  const uid = auth.currentUser!.uid;
  const email = auth.currentUser!.email ?? '';

  const [apelido, setApelido] = useState('');
  const [avatarNome, setAvatarNome] = useState('');
  const [aniversario, setAniversario] = useState('');
  const [aniversarioVisivel, setAniversarioVisivel] = useState(false);
  const [espacoId, setEspacoId] = useState('');
  const [espacoNome, setEspacoNome] = useState('');
  const [espacoCodigo, setEspacoCodigo] = useState('');
  const [espacoCriador, setEspacoCriador] = useState('');
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalEditar, setModalEditar] = useState(false);
  const [modalAvatares, setModalAvatares] = useState(false);
  const [modalRenomear, setModalRenomear] = useState(false);

  const [editApelido, setEditApelido] = useState('');
  const [editAniversario, setEditAniversario] = useState('');
  const [editAvatarNome, setEditAvatarNome] = useState('');
  const [novoNomeEspaco, setNovoNomeEspaco] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [modalSairEspaco, setModalSairEspaco] = useState(false);
  const [modalExcluirEspaco, setModalExcluirEspaco] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);
  const [modalExcluirConta, setModalExcluirConta] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    const userSnap = await getDoc(doc(db, 'users', uid));
    const userData = userSnap.data() ?? {};
    setApelido(userData.apelido ?? '');
    setAvatarNome(userData.avatarNome ?? '');
    setAniversario(userData.aniversario ?? '');
    setAniversarioVisivel(userData.aniversarioVisivel ?? false);
    setEditApelido(userData.apelido ?? '');
    setEditAniversario(userData.aniversario ?? '');
    setEditAvatarNome(userData.avatarNome ?? '');

    const eId = userData.espacoAtivo ?? '';
    setEspacoId(eId);
    if (eId) {
      const espacoSnap = await getDoc(doc(db, 'spaces', eId));
      const espacoData = espacoSnap.data() ?? {};
      setEspacoNome(espacoData.nome ?? '');
      setEspacoCodigo(espacoData.codigo ?? '');
      setEspacoCriador(espacoData.criadoPor ?? '');

      const membrosSnap = await getDocs(
        query(collection(db, 'space_members'), where('spaceId', '==', eId))
      );
      const lista: Membro[] = [];
      for (const m of membrosSnap.docs) {
        const mUid = m.data().userId;
        const mSnap = await getDoc(doc(db, 'users', mUid));
        const mData = mSnap.data() ?? {};
        lista.push({
          userId: mUid,
          apelido: mData.apelido ?? 'sem apelido',
          avatarNome: mData.avatarNome ?? '',
        });
      }
      setMembros(lista);
    }
    setCarregando(false);
  }

  function getAvatarSrc(nome: string) {
    const found = AVATARES.find((a) => a.nome === nome);
    return found ? found.src : AVATAR_DEFAULT;
  }

  async function salvarPerfil() {
    setSalvando(true);
    await setDoc(
      doc(db, 'users', uid),
      {
        apelido: editApelido.trim(),
        avatarNome: editAvatarNome,
        aniversario: editAniversario.trim(),
        aniversarioVisivel,
      },
      { merge: true }
    );
    setApelido(editApelido.trim());
    setAvatarNome(editAvatarNome);
    setAniversario(editAniversario.trim());
    setSalvando(false);
    setModalEditar(false);
  }

  async function toggleAniversarioVisivel(val: boolean) {
    setAniversarioVisivel(val);
    await setDoc(
      doc(db, 'users', uid),
      { aniversarioVisivel: val },
      { merge: true }
    );
  }

  async function copiarCodigo() {
    await Clipboard.setStringAsync(espacoCodigo);
    Alert.alert('copiado!', 'código do espaço copiado.');
  }

  async function renomearEspaco() {
    if (!novoNomeEspaco.trim()) return;
    setSalvando(true);
    await updateDoc(doc(db, 'spaces', espacoId), {
      nome: novoNomeEspaco.trim(),
    });
    setEspacoNome(novoNomeEspaco.trim());
    setNovoNomeEspaco('');
    setSalvando(false);
    setModalRenomear(false);
  }

  async function expulsarMembro(mUid: string, mApelido: string) {
    Alert.alert(
      'expulsar membro',
      `tem certeza que quer expulsar ${mApelido}?`,
      [
        { text: 'cancelar', style: 'cancel' },
        {
          text: 'expulsar',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'space_members', `${espacoId}_${mUid}`));
            await setDoc(
              doc(db, 'users', mUid),
              { espacoAtivo: '' },
              { merge: true }
            );
            setMembros((prev) => prev.filter((m) => m.userId !== mUid));
          },
        },
      ]
    );
  }

  async function sairDoEspacoConfirmado() {
    await deleteDoc(doc(db, 'space_members', `${espacoId}_${uid}`));
    await setDoc(doc(db, 'users', uid), { espacoAtivo: '' }, { merge: true });
    router.replace('/espacos');
  }

  async function excluirEspacoConfirmado() {
    for (const m of membros) {
      await deleteDoc(doc(db, 'space_members', `${espacoId}_${m.userId}`));
      await setDoc(
        doc(db, 'users', m.userId),
        { espacoAtivo: '' },
        { merge: true }
      );
    }
    await deleteDoc(doc(db, 'spaces', espacoId));
    router.replace('/espacos');
  }

  async function excluirEspaco() {
    Alert.alert(
      'excluir espaço',
      'isso vai remover todos os membros. tem certeza?',
      [
        { text: 'cancelar', style: 'cancel' },
        {
          text: 'excluir',
          style: 'destructive',
          onPress: async () => {
            for (const m of membros) {
              await deleteDoc(
                doc(db, 'space_members', `${espacoId}_${m.userId}`)
              );
              await setDoc(
                doc(db, 'users', m.userId),
                { espacoAtivo: '' },
                { merge: true }
              );
            }
            await deleteDoc(doc(db, 'spaces', espacoId));
            router.replace('/espacos');
          },
        },
      ]
    );
  }

  async function logoutConfirmado() {
    signOut(auth);
  }
  async function excluirContaConfirmada() {
    await deleteDoc(doc(db, 'users', uid));
    await deleteUser(auth.currentUser!);
  }

  if (carregando) {
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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color="#c8607a" />
      </LinearGradient>
    );
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
          contentContainerStyle={styles.fundo}
          keyboardShouldPersistTaps="handled"
        >
          {/* avatar + info */}
          <View style={styles.topoContainer}>
            <View style={styles.avatarWrapper}>
              <Image
                source={getAvatarSrc(avatarNome)}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.apelido}>{apelido || 'sem apelido'}</Text>
            <View style={styles.aniversarioRow}>
              <Text style={styles.aniversarioTexto}>
                {aniversario ? `🎂 ${aniversario}` : 'sem aniversário'}
              </Text>
              <TouchableOpacity
                onPress={() => toggleAniversarioVisivel(!aniversarioVisivel)}
                style={{ marginLeft: 6 }}
              >
                {aniversarioVisivel ? (
                  <Eye size={14} color="rgba(122,48,64,0.55)" strokeWidth={2} />
                ) : (
                  <EyeOff
                    size={14}
                    color="rgba(122,48,64,0.35)"
                    strokeWidth={2}
                  />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.email}>{email}</Text>
            <TouchableOpacity
              style={styles.botaoEditar}
              onPress={() => setModalEditar(true)}
            >
              <Pencil size={13} color="#3d1a10" strokeWidth={2} />
              <Text style={styles.botaoEditarTexto}>editar perfil</Text>
            </TouchableOpacity>
          </View>

          {/* card espaço */}
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
            <Text style={styles.labelSecao}>meu espaço</Text>
            <View style={styles.espacoHeader}>
              <Text style={styles.espacoNome}>{espacoNome}</Text>
              <TouchableOpacity style={styles.codigoBtn} onPress={copiarCodigo}>
                <Text style={styles.codigoTexto}>{espacoCodigo}</Text>
                <Copy size={12} color="rgba(122,48,64,0.55)" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.separador} />

            <Text style={styles.labelSecao}>membros</Text>
            {membros.map((m) => (
              <View key={m.userId} style={styles.membroRow}>
                <Image
                  source={getAvatarSrc(m.avatarNome)}
                  style={styles.membroAvatar}
                  resizeMode="cover"
                />
                <Text style={styles.membroApelido}>{m.apelido}</Text>
                {m.userId === espacoCriador && (
                  <Crown
                    size={13}
                    color="#c8607a"
                    strokeWidth={2}
                    style={{ marginLeft: 4 }}
                  />
                )}
                {espacoCriador === uid && m.userId !== uid && (
                  <TouchableOpacity
                    onPress={() => expulsarMembro(m.userId, m.apelido)}
                    style={styles.expulsarBtn}
                  >
                    <UserMinus size={14} color="#e8607a" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.separador} />

            {espacoCriador === uid && (
              <TouchableOpacity
                style={styles.itemAcao}
                onPress={() => {
                  setNovoNomeEspaco(espacoNome);
                  setModalRenomear(true);
                }}
              >
                <Pencil size={14} color="#3d1a10" strokeWidth={2} />
                <Text style={styles.itemAcaoTexto}>renomear espaço</Text>
                <ChevronRight
                  size={14}
                  color="rgba(122,48,64,0.4)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.itemAcao}
              onPress={() => setModalSairEspaco(true)}
            >
              <LogOut size={14} color="#e8607a" strokeWidth={2} />
              <Text style={[styles.itemAcaoTexto, { color: '#e8607a' }]}>
                sair do espaço
              </Text>
              <ChevronRight
                size={14}
                color="rgba(232,96,122,0.4)"
                strokeWidth={2}
              />
            </TouchableOpacity>

            {espacoCriador === uid && (
              <TouchableOpacity
                style={styles.itemAcao}
                onPress={() => setModalExcluirEspaco(true)}
              >
                <Trash2 size={14} color="#e8607a" strokeWidth={2} />
                <Text style={[styles.itemAcaoTexto, { color: '#e8607a' }]}>
                  excluir espaço
                </Text>
                <ChevronRight
                  size={14}
                  color="rgba(232,96,122,0.4)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* card conta */}
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
            <Text style={styles.labelSecao}>conta</Text>
            <TouchableOpacity
              style={styles.itemAcao}
              onPress={() => setModalLogout(true)}
            >
              <LogOut size={14} color="#e8607a" strokeWidth={2} />
              <Text style={[styles.itemAcaoTexto, { color: '#e8607a' }]}>
                sair da conta
              </Text>
              <ChevronRight
                size={14}
                color="rgba(232,96,122,0.4)"
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.itemAcao}
              onPress={() => setModalExcluirConta(true)}
            >
              <Trash2 size={14} color="#e8607a" strokeWidth={2} />
              <Text style={[styles.itemAcaoTexto, { color: '#e8607a' }]}>
                excluir conta
              </Text>
              <ChevronRight
                size={14}
                color="rgba(232,96,122,0.4)"
                strokeWidth={2}
              />
            </TouchableOpacity>
          </LinearGradient>

          <Text style={[styles.versao, { marginTop: -10, marginBottom: 7 }]}>
            leafhome v{require('../../app.json').expo.version}
          </Text>
        </ScrollView>
      </LinearGradient>

      {/* modal editar perfil */}
      <Modal visible={modalEditar} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
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
              style={styles.modalCard}
            >
              <Text style={styles.modalTitulo}>editar perfil</Text>

              <TouchableOpacity
                style={styles.avatarModalWrapper}
                onPress={() => setModalAvatares(true)}
              >
                <Image
                  source={getAvatarSrc(editAvatarNome)}
                  style={styles.avatarModal}
                  resizeMode="cover"
                />
                <View style={styles.avatarModalBadge}>
                  <Pencil size={10} color="#3d1a10" strokeWidth={2} />
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>apelido</Text>
              <TextInput
                style={styles.input}
                value={editApelido}
                onChangeText={setEditApelido}
                placeholder="seu apelido"
                placeholderTextColor="rgba(122,48,64,0.35)"
                underlineColorAndroid="transparent"
              />

              <Text style={styles.label}>aniversário</Text>
              <TextInput
                style={styles.input}
                value={editAniversario}
                onChangeText={(txt) => {
                  const nums = txt.replace(/\D/g, '').slice(0, 4);
                  if (nums.length <= 2) {
                    setEditAniversario(nums);
                  } else {
                    setEditAniversario(nums.slice(0, 2) + '/' + nums.slice(2));
                  }
                }}
                placeholder="dd/mm"
                placeholderTextColor="rgba(122,48,64,0.35)"
                keyboardType="numeric"
                maxLength={5}
                underlineColorAndroid="transparent"
              />

              <View style={styles.toggleRow}>
                <Text style={styles.toggleTexto}>
                  mostrar aniversário pra outros
                </Text>
                <Switch
                  value={aniversarioVisivel}
                  onValueChange={toggleAniversarioVisivel}
                  trackColor={{
                    false: 'rgba(232,160,176,0.3)',
                    true: 'rgba(200,96,122,0.5)',
                  }}
                  thumbColor={aniversarioVisivel ? '#c8607a' : '#fff'}
                />
              </View>

              <TouchableOpacity
                style={styles.botao}
                onPress={salvarPerfil}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#3d1a10" />
                ) : (
                  <Text style={styles.botaoTexto}>salvar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalEditar(false)}
              >
                <Text style={styles.botaoCancelarTexto}>cancelar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* modal escolher avatar */}
      <Modal visible={modalAvatares} transparent animationType="slide">
        <View style={styles.modalOverlay}>
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
            style={styles.modalCard}
          >
            <Text style={styles.modalTitulo}>escolher avatar</Text>
            <FlatList
              data={AVATARES}
              numColumns={5}
              keyExtractor={(item) => item.nome}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarOpcao,
                    editAvatarNome === item.nome && styles.avatarOpcaoAtiva,
                  ]}
                  onPress={() => {
                    setEditAvatarNome(item.nome);
                    setModalAvatares(false);
                  }}
                >
                  <Image
                    source={item.src}
                    style={styles.avatarOpcaoImg}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ gap: 8 }}
              columnWrapperStyle={{ gap: 8 }}
            />
            <TouchableOpacity
              style={styles.botaoCancelar}
              onPress={() => setModalAvatares(false)}
            >
              <Text style={styles.botaoCancelarTexto}>cancelar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* modal renomear espaço */}
      <Modal visible={modalRenomear} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
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
              style={styles.modalCard}
            >
              <Text style={styles.modalTitulo}>renomear espaço</Text>
              <Text style={styles.label}>novo nome</Text>
              <TextInput
                style={styles.input}
                value={novoNomeEspaco}
                onChangeText={setNovoNomeEspaco}
                placeholder="nome do espaço"
                placeholderTextColor="rgba(122,48,64,0.35)"
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={styles.botao}
                onPress={renomearEspaco}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#3d1a10" />
                ) : (
                  <Text style={styles.botaoTexto}>salvar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalRenomear(false)}
              >
                <Text style={styles.botaoCancelarTexto}>cancelar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ModalConfirmar
        visivel={modalSairEspaco}
        titulo="sair do espaço"
        mensagem="tem certeza que quer sair?"
        botaoTexto="sair"
        destrutivo
        onConfirmar={() => {
          setModalSairEspaco(false);
          sairDoEspacoConfirmado();
        }}
        onCancelar={() => setModalSairEspaco(false)}
      />

      <ModalConfirmar
        visivel={modalExcluirEspaco}
        titulo="excluir espaço"
        mensagem="isso vai remover todos os membros. tem certeza?"
        botaoTexto="excluir"
        destrutivo
        onConfirmar={() => {
          setModalExcluirEspaco(false);
          excluirEspacoConfirmado();
        }}
        onCancelar={() => setModalExcluirEspaco(false)}
      />
      <ModalConfirmar
        visivel={modalLogout}
        titulo="sair da conta"
        mensagem="tem certeza que quer sair?"
        botaoTexto="sair"
        destrutivo
        onConfirmar={() => {
          setModalLogout(false);
          logoutConfirmado();
        }}
        onCancelar={() => setModalLogout(false)}
      />

      <ModalConfirmar
        visivel={modalExcluirConta}
        titulo="excluir conta"
        mensagem="essa ação é irreversível. tem certeza?"
        botaoTexto="excluir"
        destrutivo
        onConfirmar={() => {
          setModalExcluirConta(false);
          excluirContaConfirmada();
        }}
        onCancelar={() => setModalExcluirConta(false)}
      />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  fundo: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 0,
  },
  topoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(232,160,176,0.6)',
    borderStyle: 'solid',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: 'rgba(200,120,140,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  apelido: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 22,
    color: '#3d1a10',
    marginBottom: 2,
  },
  aniversarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  aniversarioTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.55)',
  },
  email: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.4)',
    marginBottom: 12,
  },
  botaoEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,160,176,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  botaoEditarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: '#3d1a10',
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 20,
    marginBottom: 16,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  espacoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  espacoNome: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 16,
    color: '#3d1a10',
  },
  codigoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232,160,176,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codigoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: 'rgba(122,48,64,0.55)',
  },
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,160,176,0.3)',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  membroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  membroAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    marginRight: 8,
  },
  membroApelido: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
    flex: 1,
  },
  expulsarBtn: {
    padding: 4,
  },
  itemAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  itemAcaoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
    flex: 1,
  },
  versao: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.3)',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,26,16,0.15)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 28,
    paddingBottom: 40,
    backgroundColor: 'rgba(253,246,240,0.98)',
  },
  modalTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 18,
    color: '#3d1a10',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarModalWrapper: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarModal: {
    width: 80,
    height: 80,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(232,160,176,0.6)',
  },
  avatarModalBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(232,160,176,0.8)',
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
    flex: 1,
  },
  botao: {
    backgroundColor: 'rgba(232,160,176,0.55)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
  botaoCancelar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  botaoCancelarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
  },
  avatarOpcao: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOpcaoAtiva: {
    borderColor: '#c8607a',
  },
  avatarOpcaoImg: {
    width: 48,
    height: 48,
    borderRadius: 999,
  },
});
