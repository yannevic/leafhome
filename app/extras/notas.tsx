import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { ChevronLeft, Plus, Pin, Trash2, Pencil } from 'lucide-react-native';
import ModalConfirmar from '../../components/ModalConfirmar';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Nota {
  id: string;
  spaceId: string;
  criadoPor: string;
  titulo: string;
  texto: string;
  cor: string;
  fixada: boolean;
  criadoEm: Timestamp;
}

// ─── cores disponíveis ────────────────────────────────────────────────────────
const CORES = [
  {
    id: 'rosa',
    fundo: 'rgba(252,220,228,0.95)',
    borda: 'rgba(232,160,176,0.6)',
    label: '#f4b8c8',
  },
  {
    id: 'lilas',
    fundo: 'rgba(232,220,255,0.95)',
    borda: 'rgba(190,160,240,0.6)',
    label: '#c8a8f0',
  },
  {
    id: 'menta',
    fundo: 'rgba(200,240,220,0.95)',
    borda: 'rgba(130,200,160,0.6)',
    label: '#82c8a0',
  },
  {
    id: 'amarelo',
    fundo: 'rgba(255,245,200,0.95)',
    borda: 'rgba(220,190,100,0.6)',
    label: '#dcc064',
  },
  {
    id: 'azul',
    fundo: 'rgba(210,230,255,0.95)',
    borda: 'rgba(140,180,240,0.6)',
    label: '#8cb4f0',
  },
  {
    id: 'pessego',
    fundo: 'rgba(255,225,200,0.95)',
    borda: 'rgba(230,170,120,0.6)',
    label: '#e6aa78',
  },
];

function corPorId(id: string) {
  return CORES.find((c) => c.id === id) ?? CORES[0];
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Notas() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = auth.currentUser;

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  // modal criar/editar
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState<Nota | null>(null);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [corSel, setCorSel] = useState(CORES[0].id);
  const [salvando, setSalvando] = useState(false);

  // menu de ações (segurar)
  const [menuNota, setMenuNota] = useState<Nota | null>(null);
  const [modalDeletar, setModalDeletar] = useState(false);

  // espaço ativo
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setSpaceId(snap.data().espacoAtivo ?? null);
    });
    return unsub;
  }, [user]);

  // notas
  useEffect(() => {
    if (!spaceId) return;
    const unsub = onSnapshot(
      query(collection(db, 'notes'), where('spaceId', '==', spaceId)),
      (snap) => {
        setNotas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Nota));
        setCarregando(false);
      }
    );
    return unsub;
  }, [spaceId]);

  // ordena: fixadas primeiro, depois por data desc
  const notasOrdenadas = [...notas].sort((a, b) => {
    if (a.fixada && !b.fixada) return -1;
    if (!a.fixada && b.fixada) return 1;
    return b.criadoEm.toMillis() - a.criadoEm.toMillis();
  });

  const fixadas = notasOrdenadas.filter((n) => n.fixada);
  const restantes = notasOrdenadas.filter((n) => !n.fixada);

  // ─── ações ────────────────────────────────────────────────────────────────
  function abrirNova() {
    setEditando(null);
    setTitulo('');
    setTexto('');
    setCorSel(CORES[0].id);
    setModalForm(true);
  }

  function abrirEditar(nota: Nota) {
    setEditando(nota);
    setTitulo(nota.titulo);
    setTexto(nota.texto);
    setCorSel(nota.cor);
    setMenuNota(null);
    setModalForm(true);
  }

  async function salvar() {
    if (!spaceId || !user || !texto.trim()) return;
    setSalvando(true);
    try {
      if (editando) {
        await updateDoc(doc(db, 'notes', editando.id), {
          titulo: titulo.trim(),
          texto: texto.trim(),
          cor: corSel,
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          spaceId,
          criadoPor: user.uid,
          titulo: titulo.trim(),
          texto: texto.trim(),
          cor: corSel,
          fixada: false,
          criadoEm: Timestamp.now(),
        });
      }
      setModalForm(false);
    } finally {
      setSalvando(false);
    }
  }

  async function toggleFixar(nota: Nota) {
    await updateDoc(doc(db, 'notes', nota.id), { fixada: !nota.fixada });
    setMenuNota(null);
  }

  async function deletar() {
    if (!menuNota) return;
    await deleteDoc(doc(db, 'notes', menuNota.id));
    setModalDeletar(false);
    setMenuNota(null);
  }

  // ─── card de nota ─────────────────────────────────────────────────────────
  function NotaCard({ nota }: { nota: Nota }) {
    const cor = corPorId(nota.cor);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => setMenuNota(nota)}
        delayLongPress={400}
        style={styles.notaWrap}
      >
        <View
          style={[
            styles.notaCard,
            { backgroundColor: cor.fundo, borderColor: cor.borda },
          ]}
        >
          {nota.fixada && (
            <View style={styles.pinBadge}>
              <Pin size={10} color="#c8607a" strokeWidth={2.5} fill="#c8607a" />
            </View>
          )}
          {nota.titulo ? (
            <Text style={styles.notaTitulo} numberOfLines={1}>
              {nota.titulo}
            </Text>
          ) : null}
          <Text style={styles.notaTexto} numberOfLines={6}>
            {nota.texto}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────
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
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.btnVoltar}
            >
              <ChevronLeft size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.tituloPagina}>notas rápidas</Text>
            <View style={{ width: 32 }} />
          </View>

          {carregando ? (
            <ActivityIndicator color="#c8607a" style={{ marginTop: 40 }} />
          ) : notas.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                nenhuma nota ainda.{'\n'}toque em + para criar!
              </Text>
            </View>
          ) : (
            <>
              {/* fixadas */}
              {fixadas.length > 0 && (
                <>
                  <Text style={styles.labelSecao}>fixadas</Text>
                  <View style={styles.grade}>
                    {fixadas.map((n) => (
                      <NotaCard key={n.id} nota={n} />
                    ))}
                  </View>
                </>
              )}

              {/* restantes */}
              {restantes.length > 0 && (
                <>
                  {fixadas.length > 0 && (
                    <Text style={[styles.labelSecao, { marginTop: 8 }]}>
                      notas
                    </Text>
                  )}
                  <View style={styles.grade}>
                    {restantes.map((n) => (
                      <NotaCard key={n.id} nota={n} />
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 14 }]}
          onPress={abrirNova}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[
              'rgba(252,200,220,0.95)',
              'rgba(210,200,255,0.9)',
              'rgba(252,220,200,0.95)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradiente}
          >
            <Plus size={24} color="#3d1a10" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        {/* modal criar/editar */}
        <Modal visible={modalForm} transparent animationType="slide">
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
                <Text style={styles.modalTitulo}>
                  {editando ? 'editar nota' : 'nova nota'}
                </Text>

                {/* seletor de cor */}
                <Text style={styles.label}>cor</Text>
                <View style={styles.coresRow}>
                  {CORES.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCorSel(c.id)}
                      style={[
                        styles.corBolinha,
                        { backgroundColor: c.label },
                        corSel === c.id && styles.corBolinhaAtiva,
                      ]}
                    >
                      {corSel === c.id && (
                        <View style={styles.corBolinhaCheck} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>título (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="ex: lista de filmes"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>nota</Text>
                <TextInput
                  style={[styles.input, styles.inputMultilinha]}
                  value={texto}
                  onChangeText={setTexto}
                  placeholder="escreva aqui..."
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  autoCapitalize="none"
                  multiline
                  autoFocus={!editando}
                />

                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvar}
                  disabled={salvando || !texto.trim()}
                >
                  {salvando ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>
                      {editando ? 'salvar' : 'criar'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => setModalForm(false)}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* menu de ações (segurar) */}
        <Modal visible={!!menuNota} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setMenuNota(null)}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <LinearGradient
                  colors={[
                    'rgba(253,246,240,1)',
                    'rgba(252,220,228,0.9)',
                    'rgba(230,235,255,0.8)',
                    'rgba(253,246,240,1)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuCard}
                >
                  {menuNota?.titulo ? (
                    <Text style={styles.menuTituloNota} numberOfLines={1}>
                      {menuNota.titulo}
                    </Text>
                  ) : (
                    <Text style={styles.menuTituloNota} numberOfLines={1}>
                      {menuNota?.texto}
                    </Text>
                  )}

                  <View style={styles.menuSep} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => menuNota && abrirEditar(menuNota)}
                  >
                    <Pencil size={16} color="#3d1a10" strokeWidth={2} />
                    <Text style={styles.menuItemTexto}>editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => menuNota && toggleFixar(menuNota)}
                  >
                    <Pin
                      size={16}
                      color={menuNota?.fixada ? '#c8607a' : '#3d1a10'}
                      strokeWidth={2}
                      fill={menuNota?.fixada ? '#c8607a' : 'transparent'}
                    />
                    <Text
                      style={[
                        styles.menuItemTexto,
                        menuNota?.fixada && { color: '#c8607a' },
                      ]}
                    >
                      {menuNota?.fixada ? 'desafixar' : 'fixar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setModalDeletar(true)}
                  >
                    <Trash2 size={16} color="#e8607a" strokeWidth={2} />
                    <Text style={[styles.menuItemTexto, { color: '#e8607a' }]}>
                      excluir
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <ModalConfirmar
          visivel={modalDeletar}
          titulo="excluir nota?"
          mensagem="essa ação não pode ser desfeita"
          botaoTexto="excluir"
          destrutivo
          onConfirmar={deletar}
          onCancelar={() => {
            setModalDeletar(false);
            setMenuNota(null);
          }}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  btnVoltar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloPagina: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 22,
    color: '#3d1a10',
    flex: 1,
    textAlign: 'center',
  },

  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  notaWrap: {
    width: '47.5%',
  },
  notaCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
    minHeight: 100,
    shadowColor: 'rgba(200,120,140,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  pinBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  notaTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 13,
    color: '#3d1a10',
    marginBottom: 6,
    paddingRight: 16,
  },
  notaTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(61,26,16,0.75)',
    lineHeight: 18,
  },

  vazio: { alignItems: 'center', paddingTop: 300 },
  vazioTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },

  fab: {
    position: 'absolute',
    right: 20,
    shadowColor: 'rgba(200,120,140,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  fabGradiente: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,160,176,0.5)',
  },

  // modal form
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

  coresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  corBolinha: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corBolinhaAtiva: {
    borderWidth: 2.5,
    borderColor: '#3d1a10',
  },
  corBolinhaCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d1a10',
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
  inputMultilinha: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  botaoCancelar: { alignItems: 'center', paddingVertical: 8 },
  botaoCancelarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
  },

  // menu ações (segurar)
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,26,16,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  menuCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 8,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  menuTituloNota: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuSep: {
    height: 1,
    backgroundColor: 'rgba(232,160,176,0.3)',
    marginHorizontal: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 14,
    color: '#3d1a10',
  },
});
