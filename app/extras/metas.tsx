import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Target,
  Wallet,
  Plane,
  Home,
  Car,
  ShoppingBag,
  Briefcase,
  Heart,
  Book,
  Music,
  Gamepad2,
  Utensils,
  Dumbbell,
  Gift,
  Star,
} from 'lucide-react-native';
import ModalConfirmar from '../../components/ModalConfirmar';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Meta {
  id: string;
  spaceId: string;
  criadoPor: string;
  titulo: string;
  descricao?: string;
  valorAlvo: number;
  valorAtual: number;
  cor: string;
  icone: string;
  prazo?: string; // 'YYYY-MM-DD'
  concluida: boolean;
  criadoEm: Timestamp;
}

// ─── opções ───────────────────────────────────────────────────────────────────
const CORES = [
  {
    id: 'rosa',
    hex: '#f4b8c8',
    fundo: 'rgba(252,220,228,0.9)',
    borda: 'rgba(232,160,176,0.6)',
  },
  {
    id: 'lilas',
    hex: '#c8a8f0',
    fundo: 'rgba(232,220,255,0.9)',
    borda: 'rgba(190,160,240,0.6)',
  },
  {
    id: 'menta',
    hex: '#82c8a0',
    fundo: 'rgba(200,240,220,0.9)',
    borda: 'rgba(130,200,160,0.6)',
  },
  {
    id: 'amarelo',
    hex: '#dcc064',
    fundo: 'rgba(255,245,200,0.9)',
    borda: 'rgba(220,190,100,0.6)',
  },
  {
    id: 'azul',
    hex: '#8cb4f0',
    fundo: 'rgba(210,230,255,0.9)',
    borda: 'rgba(140,180,240,0.6)',
  },
  {
    id: 'pessego',
    hex: '#e6aa78',
    fundo: 'rgba(255,225,200,0.9)',
    borda: 'rgba(230,170,120,0.6)',
  },
  {
    id: 'verde',
    hex: '#6ab89a',
    fundo: 'rgba(180,230,210,0.9)',
    borda: 'rgba(100,180,150,0.6)',
  },
  {
    id: 'coral',
    hex: '#e8807a',
    fundo: 'rgba(255,210,205,0.9)',
    borda: 'rgba(230,150,140,0.6)',
  },
];

const ICONES: { id: string; comp: any }[] = [
  { id: 'target', comp: Target },
  { id: 'plane', comp: Plane },
  { id: 'home', comp: Home },
  { id: 'car', comp: Car },
  { id: 'bag', comp: ShoppingBag },
  { id: 'brief', comp: Briefcase },
  { id: 'heart', comp: Heart },
  { id: 'book', comp: Book },
  { id: 'music', comp: Music },
  { id: 'game', comp: Gamepad2 },
  { id: 'food', comp: Utensils },
  { id: 'gym', comp: Dumbbell },
  { id: 'gift', comp: Gift },
  { id: 'star', comp: Star },
];

function corPorId(id: string) {
  return CORES.find((c) => c.id === id) ?? CORES[0];
}
function iconePorId(id: string) {
  return ICONES.find((i) => i.id === id) ?? ICONES[0];
}
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function diasAte(s: string): string {
  const hoje = new Date();
  const alvo = new Date(s + 'T00:00:00');
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return 'vencido';
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return `${diff} dias`;
}
function fmtPrazo(s: string) {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Metas() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = auth.currentUser;

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(true);

  // modal form
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState<Meta | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [corSel, setCorSel] = useState(CORES[0].id);
  const [iconeSel, setIconeSel] = useState(ICONES[0].id);
  const [salvando, setSalvando] = useState(false);

  // modal aporte
  const [modalAporte, setModalAporte] = useState(false);
  const [metaAporte, setMetaAporte] = useState<Meta | null>(null);
  const [valorAporte, setValorAporte] = useState('');
  const [salvandoAporte, setSalvandoAporte] = useState(false);
  const [modalConfirmarConclusao, setModalConfirmarConclusao] = useState(false);
  const [pendingAporte, setPendingAporte] = useState<number | null>(null);
  const [modalFinalizarAdiantado, setModalFinalizarAdiantado] = useState(false);
  const [metaFinalizarAdiantado, setMetaFinalizarAdiantado] =
    useState<Meta | null>(null);
  // lançar como gasto
  const [modalLancar, setModalLancar] = useState(false);
  const [metaLancar, setMetaLancar] = useState<Meta | null>(null);
  const [valorLancar, setValorLancar] = useState('');
  const [salvandoLancar, setSalvandoLancar] = useState(false);

  // deletar
  const [modalDeletar, setModalDeletar] = useState(false);
  const [metaDeletar, setMetaDeletar] = useState<Meta | null>(null);

  // aba
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'concluidas'>('ativas');

  // espaço ativo
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setSpaceId(snap.data().espacoAtivo ?? null);
    });
    return unsub;
  }, [user]);

  // metas
  useEffect(() => {
    if (!spaceId) return;
    const unsub = onSnapshot(
      query(collection(db, 'goals'), where('spaceId', '==', spaceId)),
      (snap) => {
        setMetas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Meta));
        setCarregando(false);
      }
    );
    return unsub;
  }, [spaceId]);

  const metasAtivas = metas
    .filter((m) => !m.concluida)
    .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
  const metasConcluidas = metas
    .filter((m) => m.concluida)
    .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());

  function mascaraData(v: string) {
    const nums = v.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
    return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
  }

  // ─── form ─────────────────────────────────────────────────────────────────
  function abrirNova() {
    setEditando(null);
    setTitulo('');
    setDescricao('');
    setValorAlvo('');
    setPrazo('');
    setCorSel(CORES[0].id);
    setIconeSel(ICONES[0].id);
    setModalForm(true);
  }

  function abrirEditar(meta: Meta) {
    setEditando(meta);
    setTitulo(meta.titulo);
    setDescricao(meta.descricao ?? '');
    setValorAlvo(String(meta.valorAlvo));
    setPrazo(meta.prazo ? meta.prazo.split('-').reverse().join('/') : '');
    setCorSel(meta.cor);
    setIconeSel(meta.icone);
    setModalForm(true);
  }

  async function salvar() {
    if (!spaceId || !user || !titulo.trim() || !valorAlvo) return;
    const alvo = parseFloat(valorAlvo.replace(',', '.'));
    if (isNaN(alvo) || alvo <= 0) return;
    setSalvando(true);
    try {
      if (editando) {
        await updateDoc(doc(db, 'goals', editando.id), {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          valorAlvo: alvo,
          cor: corSel,
          icone: iconeSel,
          prazo:
            prazo.length === 10 ? prazo.split('/').reverse().join('-') : null,
        });
      } else {
        await addDoc(collection(db, 'goals'), {
          spaceId,
          criadoPor: user.uid,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          valorAlvo: alvo,
          valorAtual: 0,
          cor: corSel,
          icone: iconeSel,
          prazo: prazo.trim() || null,
          concluida: false,
          criadoEm: Timestamp.now(),
        });
      }
      setModalForm(false);
    } finally {
      setSalvando(false);
    }
  }

  // ─── aporte ───────────────────────────────────────────────────────────────
  function abrirAporte(meta: Meta) {
    setMetaAporte(meta);
    setValorAporte('');
    setModalAporte(true);
  }

  async function salvarAporte() {
    if (!metaAporte || !valorAporte) return;
    const v = parseFloat(valorAporte.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;

    const novoValor = Math.min(metaAporte.valorAtual + v, metaAporte.valorAlvo);
    const vaiconcluir = novoValor >= metaAporte.valorAlvo;

    if (vaiconcluir) {
      setPendingAporte(v);
      setModalConfirmarConclusao(true);
      return;
    }

    setSalvandoAporte(true);
    try {
      await updateDoc(doc(db, 'goals', metaAporte.id), {
        valorAtual: metaAporte.valorAtual + v,
        concluida: false,
      });
      setModalAporte(false);
      setMetaAporte(null);
    } finally {
      setSalvandoAporte(false);
    }
  }

  async function confirmarConclusao() {
    if (!metaAporte || pendingAporte === null) return;
    setSalvandoAporte(true);
    try {
      await updateDoc(doc(db, 'goals', metaAporte.id), {
        valorAtual: metaAporte.valorAtual + pendingAporte,
        concluida: true,
      });
      setModalConfirmarConclusao(false);
      setModalAporte(false);
      setMetaAporte(null);
      setPendingAporte(null);
    } finally {
      setSalvandoAporte(false);
    }
  }

  async function finalizarAdiantado() {
    if (!metaFinalizarAdiantado) return;
    await updateDoc(doc(db, 'goals', metaFinalizarAdiantado.id), {
      concluida: true,
    });
    setModalFinalizarAdiantado(false);
    setMetaFinalizarAdiantado(null);
  }

  function abrirLancar(meta: Meta) {
    setMetaLancar(meta);
    setValorLancar(String(meta.valorAtual));
    setModalLancar(true);
  }

  async function salvarLancar() {
    if (!metaLancar || !valorLancar || !spaceId || !user) return;
    const v = parseFloat(valorLancar.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    setSalvandoLancar(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        spaceId,
        userId: user.uid,
        categoriaId: '',
        descricao: `meta: ${metaLancar.titulo}`,
        valor: v,
        data: new Date().toISOString().split('T')[0],
        criadoEm: Timestamp.now(),
      });
      setModalLancar(false);
      setMetaLancar(null);
    } finally {
      setSalvandoLancar(false);
    }
  }

  // ─── deletar ──────────────────────────────────────────────────────────────
  async function deletar() {
    if (!metaDeletar) return;
    await deleteDoc(doc(db, 'goals', metaDeletar.id));
    setModalDeletar(false);
    setMetaDeletar(null);
  }

  // ─── card ─────────────────────────────────────────────────────────────────
  function MetaCard({ meta }: { meta: Meta }) {
    const cor = corPorId(meta.cor);
    const icone = iconePorId(meta.icone);
    const Icone = icone.comp;
    const pct =
      meta.valorAlvo > 0 ? Math.min(meta.valorAtual / meta.valorAlvo, 1) : 0;
    const concluida = meta.concluida;

    return (
      <LinearGradient
        colors={[
          'rgba(253,246,240,1)',
          'rgba(252,220,228,0.9)',
          'rgba(230,235,255,0.8)',
          'rgba(253,246,240,1)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.metaCard, concluida && styles.metaCardConcluida]}
      >
        {/* topo */}
        <View style={styles.metaTopo}>
          <View
            style={[
              styles.metaIconeWrap,
              { backgroundColor: cor.fundo, borderColor: cor.borda },
            ]}
          >
            <Icone size={18} color={cor.hex} strokeWidth={2} />
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.metaTitulo} numberOfLines={1}>
              {meta.titulo}
            </Text>
            {meta.descricao ? (
              <Text style={styles.metaDesc} numberOfLines={1}>
                {meta.descricao}
              </Text>
            ) : null}
          </View>
          {concluida && (
            <View style={styles.metaAcoes}>
              <CheckCircle
                size={18}
                color="#6ab89a"
                strokeWidth={2}
                fill="rgba(106,184,154,0.15)"
              />
              <TouchableOpacity
                onPress={() => {
                  setMetaDeletar(meta);
                  setModalDeletar(true);
                }}
                style={styles.acaoBotao}
              >
                <Trash2
                  size={13}
                  color="rgba(232,96,122,0.55)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          )}
          {!concluida && (
            <View style={styles.metaAcoes}>
              <TouchableOpacity
                onPress={() => abrirEditar(meta)}
                style={styles.acaoBotao}
              >
                <Pencil
                  size={13}
                  color="rgba(122,48,64,0.45)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMetaDeletar(meta);
                  setModalDeletar(true);
                }}
                style={styles.acaoBotao}
              >
                <Trash2
                  size={13}
                  color="rgba(232,96,122,0.55)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* valores */}
        <View style={styles.metaValores}>
          <Text style={styles.metaValorAtual}>{fmtMoeda(meta.valorAtual)}</Text>
          <Text style={styles.metaValorSep}>/</Text>
          <Text style={styles.metaValorAlvo}>{fmtMoeda(meta.valorAlvo)}</Text>
          {meta.prazo && !concluida && (
            <View style={styles.prazoBadge}>
              <Text style={styles.prazoTexto}>{diasAte(meta.prazo)}</Text>
            </View>
          )}
        </View>

        {/* barra */}
        <View style={styles.barraFundo}>
          <LinearGradient
            colors={
              concluida
                ? ['rgba(106,184,154,0.8)', 'rgba(106,184,154,0.6)']
                : [cor.fundo, cor.hex + 'aa', cor.fundo]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barraFill, { width: `${pct * 100}%` }]}
          />
        </View>
        <View style={styles.barraLegenda}>
          <Text style={styles.barraLegendaTexto}>{Math.round(pct * 100)}%</Text>
          {meta.prazo && !concluida && (
            <Text style={styles.barraLegendaTexto}>
              prazo: {fmtPrazo(meta.prazo)}
            </Text>
          )}
          {concluida && (
            <Text style={[styles.barraLegendaTexto, { color: '#6ab89a' }]}>
              concluída!
            </Text>
          )}
        </View>

        {/* botão aporte */}
        {!concluida && (
          <TouchableOpacity
            style={[styles.btnAporte, { borderColor: cor.borda }]}
            onPress={() => abrirAporte(meta)}
            activeOpacity={0.8}
          >
            <Plus size={13} color={cor.hex} strokeWidth={2.5} />
            <Text style={[styles.btnAporteTexto, { color: cor.hex }]}>
              adicionar valor
            </Text>
          </TouchableOpacity>
        )}
        {!concluida && (
          <TouchableOpacity
            style={styles.btnFinalizar}
            onPress={() => {
              setMetaFinalizarAdiantado(meta);
              setModalFinalizarAdiantado(true);
            }}
            activeOpacity={0.8}
          >
            <CheckCircle size={13} color="#9b7ec8" strokeWidth={2.5} />
            <Text style={styles.btnFinalizarTexto}>finalizar assim mesmo</Text>
          </TouchableOpacity>
        )}
        {concluida && (
          <TouchableOpacity
            style={styles.btnLancar}
            onPress={() => abrirLancar(meta)}
            activeOpacity={0.8}
          >
            <Wallet size={13} color="#4a7a4a" strokeWidth={2.5} />
            <Text style={styles.btnLancarTexto}>lançar como gasto</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
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
            <Text style={styles.tituloPagina}>metas</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* abas */}
          <View style={styles.abas}>
            {(['ativas', 'concluidas'] as const).map((aba) => (
              <TouchableOpacity
                key={aba}
                style={[styles.aba, abaAtiva === aba && styles.abaAtiva]}
                onPress={() => setAbaAtiva(aba)}
              >
                <Text
                  style={[
                    styles.abaTexto,
                    abaAtiva === aba && styles.abaTextoAtivo,
                  ]}
                >
                  {aba}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {carregando ? (
            <ActivityIndicator color="#c8607a" style={{ marginTop: 40 }} />
          ) : abaAtiva === 'ativas' ? (
            metasAtivas.length === 0 ? (
              <View style={styles.vazio}>
                <Text style={styles.vazioTexto}>
                  nenhuma meta ativa.{'\n'}crie uma nova!
                </Text>
              </View>
            ) : (
              metasAtivas.map((m) => <MetaCard key={m.id} meta={m} />)
            )
          ) : metasConcluidas.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                nenhuma meta concluída ainda.
              </Text>
            </View>
          ) : (
            metasConcluidas.map((m) => <MetaCard key={m.id} meta={m} />)
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

        {/* modal form */}
        <Modal visible={modalForm} transparent animationType="slide">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <View style={styles.modalOverlay}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ width: '100%' }}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'flex-end',
                }}
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
                  style={styles.modalCard}
                >
                  <Text style={styles.modalTitulo}>
                    {editando ? 'editar meta' : 'nova meta'}
                  </Text>

                  {/* cor */}
                  <Text style={styles.label}>cor</Text>
                  <View style={styles.coresRow}>
                    {CORES.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCorSel(c.id)}
                        style={[
                          styles.corBolinha,
                          { backgroundColor: c.hex },
                          corSel === c.id && styles.corBolinhaAtiva,
                        ]}
                      >
                        {corSel === c.id && (
                          <View style={styles.corBolinhaCheck} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ícone */}
                  <Text style={styles.label}>ícone</Text>
                  <View style={styles.iconesGrid}>
                    {ICONES.map((ic) => {
                      const Ic = ic.comp;
                      const ativo = iconeSel === ic.id;
                      const cor = corPorId(corSel);
                      return (
                        <TouchableOpacity
                          key={ic.id}
                          onPress={() => setIconeSel(ic.id)}
                          style={[
                            styles.iconeOpcao,
                            ativo && {
                              backgroundColor: cor.fundo,
                              borderColor: cor.borda,
                            },
                          ]}
                        >
                          <Ic
                            size={18}
                            color={ativo ? cor.hex : 'rgba(122,48,64,0.4)'}
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* título */}
                  <Text style={styles.label}>título</Text>
                  <TextInput
                    style={styles.input}
                    value={titulo}
                    onChangeText={setTitulo}
                    placeholder="ex: viagem para o japão"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                  />

                  {/* descrição */}
                  <Text style={styles.label}>descrição (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="detalhes da meta"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                  />

                  {/* valor alvo */}
                  <Text style={styles.label}>valor alvo (R$)</Text>
                  <TextInput
                    style={styles.input}
                    value={valorAlvo}
                    onChangeText={setValorAlvo}
                    placeholder="ex: 5000"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    keyboardType="decimal-pad"
                  />

                  {/* prazo */}
                  <Text style={styles.label}>
                    prazo (opcional) — DD/MM/AAAA
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={prazo}
                    onChangeText={(v) => setPrazo(mascaraData(v))}
                    placeholder="ex: 31/12/2025"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    keyboardType="numbers-and-punctuation"
                  />

                  <TouchableOpacity
                    style={styles.botao}
                    onPress={salvar}
                    disabled={salvando || !titulo.trim() || !valorAlvo}
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* modal aporte */}
        <Modal visible={modalAporte} transparent animationType="slide">
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
                <Text style={styles.modalTitulo}>adicionar valor</Text>
                {metaAporte && (
                  <Text style={styles.modalDesc}>
                    {metaAporte.titulo} · falta{' '}
                    {fmtMoeda(metaAporte.valorAlvo - metaAporte.valorAtual)}
                  </Text>
                )}
                <Text style={styles.label}>valor (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={valorAporte}
                  onChangeText={setValorAporte}
                  placeholder="ex: 200"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.aporteHint}>
                  só atualiza o progresso da meta
                </Text>
                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvarAporte}
                  disabled={salvandoAporte || !valorAporte}
                >
                  {salvandoAporte ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>confirmar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => {
                    setModalAporte(false);
                    setMetaAporte(null);
                  }}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* modal lançar como gasto */}
        <Modal visible={modalLancar} transparent animationType="slide">
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
                <Text style={styles.modalTitulo}>lançar como gasto</Text>
                {metaLancar && (
                  <Text style={styles.modalDesc}>
                    {metaLancar.titulo} · total guardado{' '}
                    {fmtMoeda(metaLancar.valorAtual)}
                  </Text>
                )}
                <Text style={styles.label}>valor a lançar (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={valorLancar}
                  onChangeText={setValorLancar}
                  placeholder="ex: 200"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.aporteHint}>
                  será lançado em finanças como saída
                </Text>
                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvarLancar}
                  disabled={salvandoLancar || !valorLancar}
                >
                  {salvandoLancar ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>confirmar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => {
                    setModalLancar(false);
                    setMetaLancar(null);
                  }}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <ModalConfirmar
          visivel={modalConfirmarConclusao}
          titulo="meta concluída!"
          mensagem="esse valor vai completar a meta. deseja marcar como concluída?"
          botaoTexto="confirmar"
          onConfirmar={confirmarConclusao}
          onCancelar={() => {
            setModalConfirmarConclusao(false);
            setPendingAporte(null);
          }}
        />

        <ModalConfirmar
          visivel={modalFinalizarAdiantado}
          titulo="finalizar meta?"
          mensagem="a meta será marcada como concluída com o valor atual, sem atingir o alvo."
          botaoTexto="finalizar"
          onConfirmar={finalizarAdiantado}
          onCancelar={() => {
            setModalFinalizarAdiantado(false);
            setMetaFinalizarAdiantado(null);
          }}
        />

        <ModalConfirmar
          visivel={modalDeletar}
          titulo="excluir meta?"
          mensagem="o progresso será perdido"
          botaoTexto="excluir"
          destrutivo
          onConfirmar={deletar}
          onCancelar={() => {
            setModalDeletar(false);
            setMetaDeletar(null);
          }}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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

  abas: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  aba: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    backgroundColor: 'rgba(253,242,246,0.6)',
    borderStyle: 'dashed',
  },
  abaAtiva: { borderColor: '#c8607a', backgroundColor: 'rgba(200,96,122,0.1)' },
  abaTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.5)',
  },
  abaTextoAtivo: { color: '#c8607a', fontFamily: 'Baloo2_800ExtraBold' },

  metaCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 18,
    marginBottom: 12,
    shadowColor: 'rgba(200,120,140,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  metaCardConcluida: { opacity: 0.85 },

  metaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  metaIconeWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  metaInfo: { flex: 1 },
  metaTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
  metaDesc: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
    marginTop: 2,
  },
  metaAcoes: { flexDirection: 'row', gap: 4 },
  acaoBotao: { padding: 4 },

  metaValores: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  metaValorAtual: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 20,
    color: '#3d1a10',
  },
  metaValorSep: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: 'rgba(122,48,64,0.4)',
  },
  metaValorAlvo: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 14,
    color: 'rgba(122,48,64,0.55)',
    flex: 1,
  },
  prazoBadge: {
    backgroundColor: 'rgba(200,96,122,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  prazoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 11,
    color: '#c8607a',
  },

  barraFundo: {
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(232,160,176,0.2)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barraFill: { height: 8, borderRadius: 8 },
  barraLegenda: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  barraLegendaTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
  },

  btnAporte: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  btnAporteTexto: { fontFamily: 'Baloo2_600SemiBold', fontSize: 13 },

  botoesCard: {
    flexDirection: 'row',
    gap: 8,
  },
  btnLancar: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74,122,74,0.4)',
    backgroundColor: 'rgba(74,122,74,0.06)',
  },
  btnLancarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#4a7a4a',
  },
  btnFinalizar: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(155,126,200,0.4)',
    backgroundColor: 'rgba(155,126,200,0.06)',
  },
  btnFinalizarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#9b7ec8',
  },

  vazio: { alignItems: 'center', paddingTop: 280 },
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
  modalDesc: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -12,
  },
  aporteHint: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(74,122,74,0.7)',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
  },

  coresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  corBolinha: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corBolinhaAtiva: { borderWidth: 2.5, borderColor: '#3d1a10' },
  corBolinhaCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d1a10',
  },

  iconesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconeOpcao: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.25)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(253,242,246,0.5)',
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
});
