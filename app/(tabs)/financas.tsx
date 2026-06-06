import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
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
  ShoppingCart,
  Home,
  Car,
  Heart,
  Pill,
  Smile,
  UtensilsCrossed,
  RefreshCw,
  Circle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Tag,
  Check,
  Bike,
  Bus,
  Coffee,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  Music,
  PawPrint,
  Plane,
  Shirt,
  Smartphone,
  Tv,
  Utensils,
  Wallet,
  Wrench,
  Baby,
  BookOpen,
  Briefcase,
  Building,
  CalendarDays,
  Camera,
  Candy,
  Droplets,
  Flower2,
  Globe,
  Hammer,
  Headphones,
  Leaf,
  Package,
  Star,
  Zap,
} from 'lucide-react-native';
import ModalConfirmar from '../../components/ModalConfirmar';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  spaceId: string;
  nome: string;
  icone: string;
  cor: string;
  default: boolean;
}

interface Transacao {
  id: string;
  spaceId: string;
  userId: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  data: string;
  criadoEm: Timestamp;
}

// ─── defaults ────────────────────────────────────────────────────────────────
const CATEGORIAS_DEFAULT = [
  { nome: 'mercado', icone: 'ShoppingCart', cor: '#c8607a' },
  { nome: 'moradia', icone: 'Home', cor: '#9b7ec8' },
  { nome: 'transporte', icone: 'Car', cor: '#6a9fd8' },
  { nome: 'saúde', icone: 'Heart', cor: '#e07070' },
  { nome: 'farmácia', icone: 'Pill', cor: '#6ab89a' },
  { nome: 'lazer', icone: 'Smile', cor: '#d4a84b' },
  { nome: 'alimentação', icone: 'UtensilsCrossed', cor: '#d4824b' },
  { nome: 'assinatura', icone: 'RefreshCw', cor: '#7ab8c8' },
  { nome: 'outros', icone: 'Circle', cor: '#b8919a' },
];

const CORES_PICKER = [
  '#c8607a',
  '#e07070',
  '#d4824b',
  '#d4a84b',
  '#6ab89a',
  '#5a9a7a',
  '#6a9fd8',
  '#7ab8c8',
  '#9b7ec8',
  '#8b7bc8',
  '#b87ec8',
  '#c87aaa',
  '#b8919a',
  '#7a8ab8',
  '#4a9ab8',
  '#6a9ab8',
  '#b8a46a',
  '#8ab86a',
  '#c8a07a',
  '#a87a6a',
];

const ICONES_DISPONIVEIS = [
  'ShoppingCart',
  'Home',
  'Car',
  'Heart',
  'Pill',
  'Smile',
  'UtensilsCrossed',
  'RefreshCw',
  'Circle',
  'Bike',
  'Bus',
  'Coffee',
  'Dumbbell',
  'Gamepad2',
  'Gift',
  'GraduationCap',
  'Music',
  'PawPrint',
  'Plane',
  'Shirt',
  'Smartphone',
  'Tv',
  'Utensils',
  'Wallet',
  'Wrench',
  'Baby',
  'BookOpen',
  'Briefcase',
  'Building',
  'Camera',
  'Candy',
  'Droplets',
  'Flower2',
  'Globe',
  'Hammer',
  'Headphones',
  'Leaf',
  'Package',
  'Star',
  'Zap',
];

function IconeCategoria({
  nome,
  cor,
  tamanho = 16,
}: {
  nome: string;
  cor: string;
  tamanho?: number;
}) {
  const p = { size: tamanho, color: cor, strokeWidth: 2 };
  switch (nome) {
    case 'ShoppingCart':
      return <ShoppingCart {...p} />;
    case 'Home':
      return <Home {...p} />;
    case 'Car':
      return <Car {...p} />;
    case 'Heart':
      return <Heart {...p} />;
    case 'Pill':
      return <Pill {...p} />;
    case 'Smile':
      return <Smile {...p} />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed {...p} />;
    case 'RefreshCw':
      return <RefreshCw {...p} />;
    case 'Bike':
      return <Bike {...p} />;
    case 'Bus':
      return <Bus {...p} />;
    case 'Coffee':
      return <Coffee {...p} />;
    case 'Dumbbell':
      return <Dumbbell {...p} />;
    case 'Gamepad2':
      return <Gamepad2 {...p} />;
    case 'Gift':
      return <Gift {...p} />;
    case 'GraduationCap':
      return <GraduationCap {...p} />;
    case 'Music':
      return <Music {...p} />;
    case 'PawPrint':
      return <PawPrint {...p} />;
    case 'Plane':
      return <Plane {...p} />;
    case 'Shirt':
      return <Shirt {...p} />;
    case 'Smartphone':
      return <Smartphone {...p} />;
    case 'Tv':
      return <Tv {...p} />;
    case 'Utensils':
      return <Utensils {...p} />;
    case 'Wallet':
      return <Wallet {...p} />;
    case 'Wrench':
      return <Wrench {...p} />;
    case 'Baby':
      return <Baby {...p} />;
    case 'BookOpen':
      return <BookOpen {...p} />;
    case 'Briefcase':
      return <Briefcase {...p} />;
    case 'Building':
      return <Building {...p} />;
    case 'Camera':
      return <Camera {...p} />;
    case 'Candy':
      return <Candy {...p} />;
    case 'Droplets':
      return <Droplets {...p} />;
    case 'Flower2':
      return <Flower2 {...p} />;
    case 'Globe':
      return <Globe {...p} />;
    case 'Hammer':
      return <Hammer {...p} />;
    case 'Headphones':
      return <Headphones {...p} />;
    case 'Leaf':
      return <Leaf {...p} />;
    case 'Package':
      return <Package {...p} />;
    case 'Star':
      return <Star {...p} />;
    case 'Zap':
      return <Zap {...p} />;
    default:
      return <Circle {...p} />;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function dataParaStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function strParaExibicao(s: string) {
  const [ano, mes, dia] = s.split('-');
  return `${dia}/${mes}/${ano}`;
}
function exibicaoParaStr(s: string) {
  const [dia, mes, ano] = s.split('/');
  if (!dia || !mes || !ano) return s;
  return `${ano}-${mes}-${dia}`;
}
function dataValida(s: string) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}
function mascararData(texto: string) {
  const nums = texto.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Financas() {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const hoje = new Date();

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  // modal tx
  const [modalTx, setModalTx] = useState(false);
  const [txEditando, setTxEditando] = useState<Transacao | null>(null);
  const [txDescricao, setTxDescricao] = useState('');
  const [txValor, setTxValor] = useState('');
  const [txCategoriaId, setTxCategoriaId] = useState('');
  const [txDataExib, setTxDataExib] = useState(
    strParaExibicao(dataParaStr(hoje))
  );
  const [salvandoTx, setSalvandoTx] = useState(false);
  const [txAdicionarCalendario, setTxAdicionarCalendario] = useState(false);
  const [txRecorrente, setTxRecorrente] = useState(false);
  const [txDuracaoMeses, setTxDuracaoMeses] = useState<number | null>(12);
  const [txCor, setTxCor] = useState('#c8607a');

  // modal categorias
  const [modalCats, setModalCats] = useState(false);
  const [modalEditCat, setModalEditCat] = useState(false);
  const [catEditando, setCatEditando] = useState<Categoria | null>(null);
  const [catNome, setCatNome] = useState('');
  const [catIcone, setCatIcone] = useState('Circle');
  const [catCor, setCatCor] = useState('#c8607a');
  const [salvandoCat, setSalvandoCat] = useState(false);

  // confirmar deletar
  const [modalDeletarTx, setModalDeletarTx] = useState(false);
  const [txParaDeletar, setTxParaDeletar] = useState<string | null>(null);
  const [modalDeletarCat, setModalDeletarCat] = useState(false);
  const [catParaDeletar, setCatParaDeletar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setSpaceId(snap.data().espacoAtivo ?? null);
    });
    return unsub;
  }, [user]);

  const garantirCategorias = useCallback(async (sid: string) => {
    const { getDocs } = await import('firebase/firestore');
    const snap = await getDocs(
      query(collection(db, 'categories'), where('spaceId', '==', sid))
    );
    if (snap.empty) {
      for (const cat of CATEGORIAS_DEFAULT) {
        await addDoc(collection(db, 'categories'), {
          spaceId: sid,
          ...cat,
          default: true,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!spaceId) return;
    garantirCategorias(spaceId);
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), where('spaceId', '==', spaceId)),
      (snap) =>
        setCategorias(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria)
        )
    );
    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), where('spaceId', '==', spaceId)),
      (snap) => {
        setTransacoes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transacao)
        );
        setCarregando(false);
      }
    );
    return () => {
      unsubCats();
      unsubTx();
    };
  }, [spaceId, garantirCategorias]);

  const prefixoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
  const txDoMes = transacoes.filter((t) => t.data.startsWith(prefixoMes));
  const txFiltradas = filtroCategoria
    ? txDoMes.filter((t) => t.categoriaId === filtroCategoria)
    : txDoMes;
  const totalMes = txDoMes.reduce((s, t) => s + t.valor, 0);
  const txOrdenadas = [...txFiltradas].sort((a, b) =>
    b.data.localeCompare(a.data)
  );

  const txPorData: Record<string, Transacao[]> = {};
  for (const tx of txOrdenadas) {
    if (!txPorData[tx.data]) txPorData[tx.data] = [];
    txPorData[tx.data].push(tx);
  }
  const datasOrdenadas = Object.keys(txPorData).sort((a, b) =>
    b.localeCompare(a)
  );

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual((a) => a - 1);
    } else setMesAtual((m) => m - 1);
  }
  function mesProximo() {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual((a) => a + 1);
    } else setMesAtual((m) => m + 1);
  }

  async function salvarTransacao() {
    if (!spaceId || !user) return;
    const val = parseFloat(txValor.replace(',', '.'));
    if (
      !txDescricao.trim() ||
      isNaN(val) ||
      val <= 0 ||
      !txCategoriaId ||
      !dataValida(txDataExib)
    )
      return;
    setSalvandoTx(true);
    try {
      const dataInterno = exibicaoParaStr(txDataExib);
      if (txEditando) {
        await updateDoc(doc(db, 'transactions', txEditando.id), {
          descricao: txDescricao.trim().toLowerCase(),
          valor: val,
          categoriaId: txCategoriaId,
          data: dataInterno,
        });
      } else {
        const docRef = await addDoc(collection(db, 'transactions'), {
          spaceId,
          userId: user.uid,
          categoriaId: txCategoriaId,
          descricao: txDescricao.trim().toLowerCase(),
          valor: val,
          data: dataInterno,
          criadoEm: Timestamp.now(),
        });

        if (txAdicionarCalendario) {
          await addDoc(collection(db, 'calendar_events'), {
            spaceId,
            criadoPor: user.uid,
            tipo: txRecorrente ? 'pagamento' : 'evento',
            titulo: txDescricao.trim().toLowerCase(),
            data: dataInterno,
            cor: txCor,
            recorrente: txRecorrente,
            duracaoMeses: txRecorrente ? txDuracaoMeses : null,
            recorrenciaMeses: txRecorrente ? 1 : null,
            diaDoMes: txRecorrente ? new Date(dataInterno).getDate() : null,
            origemFinancas: docRef.id,
          });
        }
      }
      fecharModalTx();
    } finally {
      setSalvandoTx(false);
    }
  }

  function abrirNovaTx() {
    setTxEditando(null);
    setTxDescricao('');
    setTxValor('');
    setTxCategoriaId(categorias[0]?.id ?? '');
    setTxDataExib(strParaExibicao(dataParaStr(hoje)));
    setModalTx(true);
    setTxAdicionarCalendario(false);
    setTxRecorrente(false);
    setTxDuracaoMeses(12);
    setTxCor('#c8607a');
  }
  function abrirEditarTx(tx: Transacao) {
    setTxEditando(tx);
    setTxDescricao(tx.descricao);
    setTxValor(String(tx.valor));
    setTxCategoriaId(tx.categoriaId);
    setTxDataExib(strParaExibicao(tx.data));
    setModalTx(true);
  }
  function fecharModalTx() {
    setModalTx(false);
    setTxEditando(null);
  }

  async function deletarTransacao() {
    if (!txParaDeletar) return;
    await deleteDoc(doc(db, 'transactions', txParaDeletar));
    setModalDeletarTx(false);
    setTxParaDeletar(null);
  }

  function abrirNovaCat() {
    setCatEditando(null);
    setCatNome('');
    setCatIcone('Circle');
    setCatCor('#c8607a');
    setModalEditCat(true);
  }
  function abrirEditarCat(cat: Categoria) {
    setCatEditando(cat);
    setCatNome(cat.nome);
    setCatIcone(cat.icone);
    setCatCor(cat.cor);
    setModalEditCat(true);
  }
  async function salvarCategoria() {
    if (!spaceId || !catNome.trim()) return;
    setSalvandoCat(true);
    try {
      if (catEditando) {
        await updateDoc(doc(db, 'categories', catEditando.id), {
          nome: catNome.trim().toLowerCase(),
          icone: catIcone,
          cor: catCor,
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          spaceId,
          nome: catNome.trim().toLowerCase(),
          icone: catIcone,
          cor: catCor,
          default: false,
        });
      }
      setModalEditCat(false);
    } finally {
      setSalvandoCat(false);
    }
  }
  async function deletarCategoria() {
    if (!catParaDeletar) return;
    await deleteDoc(doc(db, 'categories', catParaDeletar));
    setModalDeletarCat(false);
    setCatParaDeletar(null);
  }

  function getCat(id: string) {
    return categorias.find((c) => c.id === id);
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
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.titulo}>finanças</Text>
            <TouchableOpacity
              style={styles.btnCategorias}
              onPress={() => setModalCats(true)}
            >
              <Tag size={15} color="#9b7ec8" strokeWidth={2} />
              <Text style={styles.btnCategoriasTexto}>categorias</Text>
            </TouchableOpacity>
          </View>

          {/* nav mês */}
          <View style={styles.navMes}>
            <TouchableOpacity onPress={mesAnterior} style={styles.navBtn}>
              <ChevronLeft size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.navMesTexto}>
              {MESES[mesAtual]} {anoAtual}
            </Text>
            <TouchableOpacity onPress={mesProximo} style={styles.navBtn}>
              <ChevronRight size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* card resumo */}
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
            <Text style={styles.labelSecao}>
              total gasto em {MESES[mesAtual]}
            </Text>
            <Text style={styles.resumoValor}>{fmtMoeda(totalMes)}</Text>
            <Text style={styles.resumoQtd}>
              {txDoMes.length}{' '}
              {txDoMes.length === 1 ? 'transação' : 'transações'}
            </Text>
          </LinearGradient>

          {/* filtro categorias */}
          {categorias.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtroScroll}
              contentContainerStyle={styles.filtroContainer}
            >
              <TouchableOpacity
                style={[
                  styles.chipFiltro,
                  !filtroCategoria && styles.chipFiltroAtivo,
                ]}
                onPress={() => setFiltroCategoria(null)}
              >
                <Text
                  style={[
                    styles.chipFiltroTexto,
                    !filtroCategoria && styles.chipFiltroTextoAtivo,
                  ]}
                >
                  todos
                </Text>
              </TouchableOpacity>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chipFiltro,
                    filtroCategoria === cat.id && {
                      borderColor: cat.cor,
                      backgroundColor: cat.cor + '22',
                    },
                  ]}
                  onPress={() =>
                    setFiltroCategoria(
                      filtroCategoria === cat.id ? null : cat.id
                    )
                  }
                >
                  <IconeCategoria
                    nome={cat.icone}
                    cor={
                      filtroCategoria === cat.id
                        ? cat.cor
                        : 'rgba(122,48,64,0.4)'
                    }
                    tamanho={12}
                  />
                  <Text
                    style={[
                      styles.chipFiltroTexto,
                      filtroCategoria === cat.id && { color: cat.cor },
                    ]}
                  >
                    {cat.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* lista */}
          {carregando ? (
            <ActivityIndicator color="#c8607a" style={{ marginTop: 40 }} />
          ) : datasOrdenadas.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                nenhuma transação{filtroCategoria ? ' nessa categoria' : ''} em{' '}
                {MESES[mesAtual]}
              </Text>
            </View>
          ) : (
            datasOrdenadas.map((data) => (
              <View key={data}>
                <View style={styles.separadorData}>
                  <View style={styles.separadorLinha} />
                  <Text style={styles.separadorTexto}>
                    {strParaExibicao(data)}
                  </Text>
                  <View style={styles.separadorLinha} />
                </View>
                {txPorData[data].map((tx) => {
                  const cat = getCat(tx.categoriaId);
                  return (
                    <LinearGradient
                      key={tx.id}
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
                      style={styles.cardTx}
                    >
                      <View
                        style={[
                          styles.txIconeWrap,
                          { backgroundColor: (cat?.cor ?? '#b8919a') + '22' },
                        ]}
                      >
                        <IconeCategoria
                          nome={cat?.icone ?? 'Circle'}
                          cor={cat?.cor ?? '#b8919a'}
                          tamanho={18}
                        />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txDescricao}>{tx.descricao}</Text>
                        <Text style={styles.txCategoria}>
                          {cat?.nome ?? 'outros'}
                        </Text>
                      </View>
                      <View style={styles.txDireita}>
                        <Text style={styles.txValor}>{fmtMoeda(tx.valor)}</Text>
                        <View style={styles.txAcoes}>
                          <TouchableOpacity
                            onPress={() => abrirEditarTx(tx)}
                            style={styles.txAcaoBotao}
                          >
                            <Pencil
                              size={13}
                              color="rgba(122,48,64,0.45)"
                              strokeWidth={2}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setTxParaDeletar(tx.id);
                              setModalDeletarTx(true);
                            }}
                            style={styles.txAcaoBotao}
                          >
                            <Trash2
                              size={13}
                              color="rgba(232,96,122,0.55)"
                              strokeWidth={2}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* FAB — logo acima das tabs */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom - 30 }]}
          onPress={abrirNovaTx}
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

        {/* ─── modal nova/editar transação ─── */}
        <Modal visible={modalTx} transparent animationType="slide">
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
                  {txEditando ? 'editar transação' : 'nova transação'}
                </Text>

                <Text style={styles.label}>descrição</Text>
                <TextInput
                  style={styles.input}
                  value={txDescricao}
                  onChangeText={setTxDescricao}
                  placeholder="ex: supermercado"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  autoCapitalize="none"
                />

                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>valor (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={txValor}
                      onChangeText={setTxValor}
                      placeholder="0,00"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      keyboardType="decimal-pad"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>data</Text>
                    <TextInput
                      style={styles.input}
                      value={txDataExib}
                      onChangeText={(t) => setTxDataExib(mascararData(t))}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      keyboardType="numeric"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>

                <Text style={styles.label}>categoria</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
                >
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        txCategoriaId === cat.id && {
                          borderColor: cat.cor,
                          backgroundColor: cat.cor + '22',
                        },
                      ]}
                      onPress={() => setTxCategoriaId(cat.id)}
                    >
                      <IconeCategoria
                        nome={cat.icone}
                        cor={
                          txCategoriaId === cat.id
                            ? cat.cor
                            : 'rgba(122,48,64,0.4)'
                        }
                        tamanho={14}
                      />
                      <Text
                        style={[
                          styles.catChipTexto,
                          txCategoriaId === cat.id && { color: cat.cor },
                        ]}
                      >
                        {cat.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* adicionar ao calendário */}
                <TouchableOpacity
                  style={styles.calendarToggle}
                  onPress={() =>
                    setTxAdicionarCalendario(!txAdicionarCalendario)
                  }
                >
                  <CalendarDays
                    size={14}
                    color={
                      txAdicionarCalendario ? '#c8607a' : 'rgba(122,48,64,0.4)'
                    }
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.calendarToggleTexto,
                      txAdicionarCalendario && { color: '#c8607a' },
                    ]}
                  >
                    adicionar ao calendário
                  </Text>
                  <View
                    style={[
                      styles.toggleBox,
                      txAdicionarCalendario && styles.toggleBoxAtivo,
                    ]}
                  >
                    {txAdicionarCalendario && (
                      <Check size={10} color="#fff" strokeWidth={3} />
                    )}
                  </View>
                </TouchableOpacity>

                {txAdicionarCalendario && (
                  <View style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      style={styles.recorrenteToggle}
                      onPress={() => setTxRecorrente(!txRecorrente)}
                    >
                      <Text
                        style={[
                          styles.recorrenteTexto,
                          txRecorrente && { color: '#c8607a' },
                        ]}
                      >
                        pagamento recorrente
                      </Text>
                      <View
                        style={[
                          styles.toggleBox,
                          txRecorrente && styles.toggleBoxAtivo,
                        ]}
                      >
                        {txRecorrente && (
                          <Check size={10} color="#fff" strokeWidth={3} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {txRecorrente && (
                      <>
                        <Text style={[styles.label, { marginTop: 12 }]}>
                          duração
                        </Text>
                        <View style={styles.duracaoRow}>
                          {[
                            { label: '3 meses', meses: 3 },
                            { label: '6 meses', meses: 6 },
                            { label: '1 ano', meses: 12 },
                            { label: '2 anos', meses: 24 },
                            { label: 'sempre', meses: null },
                          ].map((d) => (
                            <TouchableOpacity
                              key={d.label}
                              style={[
                                styles.duracaoBotao,
                                txDuracaoMeses === d.meses &&
                                  styles.duracaoBotaoAtivo,
                              ]}
                              onPress={() => setTxDuracaoMeses(d.meses)}
                            >
                              <Text
                                style={[
                                  styles.duracaoTexto,
                                  txDuracaoMeses === d.meses &&
                                    styles.duracaoTextoAtivo,
                                ]}
                              >
                                {d.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.label}>cor no calendário</Text>
                        <View style={styles.coresRow}>
                          {[
                            '#c8607a',
                            '#e8a87c',
                            '#7cb9e8',
                            '#7ce8a8',
                            '#a87ce8',
                            '#e8e87c',
                            '#e87ca8',
                            '#7ce8e8',
                          ].map((c) => (
                            <TouchableOpacity
                              key={c}
                              style={[
                                styles.corOpcao,
                                { backgroundColor: c },
                                txCor === c && styles.corOpcaoAtiva,
                              ]}
                              onPress={() => setTxCor(c)}
                            />
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvarTransacao}
                  disabled={salvandoTx}
                >
                  {salvandoTx ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>
                      {txEditando ? 'salvar alterações' : 'adicionar'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={fecharModalTx}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ─── modal categorias ─── */}
        <Modal visible={modalCats} transparent animationType="slide">
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
              <View style={styles.catsHeader}>
                <Text style={styles.modalTitulo}>categorias</Text>
                <TouchableOpacity
                  style={styles.btnNovaCat}
                  onPress={abrirNovaCat}
                >
                  <Plus size={14} color="#9b7ec8" strokeWidth={2.5} />
                  <Text style={styles.btnNovaCatTexto}>nova</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 340 }}
              >
                {categorias.map((cat) => (
                  <View key={cat.id} style={styles.catRow}>
                    <View
                      style={[
                        styles.catIconeWrap,
                        { backgroundColor: cat.cor + '22' },
                      ]}
                    >
                      <IconeCategoria
                        nome={cat.icone}
                        cor={cat.cor}
                        tamanho={16}
                      />
                    </View>
                    <Text style={styles.catRowNome}>{cat.nome}</Text>
                    <View style={styles.catRowAcoes}>
                      <TouchableOpacity
                        onPress={() => abrirEditarCat(cat)}
                        style={styles.txAcaoBotao}
                      >
                        <Pencil
                          size={14}
                          color="rgba(122,48,64,0.45)"
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                      {!cat.default && (
                        <TouchableOpacity
                          onPress={() => {
                            setCatParaDeletar(cat.id);
                            setModalDeletarCat(true);
                          }}
                          style={styles.txAcaoBotao}
                        >
                          <Trash2
                            size={14}
                            color="rgba(232,96,122,0.55)"
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.botaoCancelar, { marginTop: 8 }]}
                onPress={() => setModalCats(false)}
              >
                <Text style={styles.botaoCancelarTexto}>fechar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>

        {/* ─── modal nova/editar categoria ─── */}
        <Modal visible={modalEditCat} transparent animationType="slide">
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
                  {catEditando ? 'editar categoria' : 'nova categoria'}
                </Text>

                <Text style={styles.label}>nome</Text>
                <TextInput
                  style={styles.input}
                  value={catNome}
                  onChangeText={setCatNome}
                  placeholder="ex: pets"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>ícone</Text>
                <FlatList
                  data={ICONES_DISPONIVEIS}
                  numColumns={8}
                  keyExtractor={(ic) => ic}
                  scrollEnabled={false}
                  style={{ marginBottom: 14 }}
                  renderItem={({ item: ic }) => (
                    <TouchableOpacity
                      style={[
                        styles.iconeOpcao,
                        catIcone === ic && {
                          borderColor: catCor,
                          backgroundColor: catCor + '22',
                        },
                      ]}
                      onPress={() => setCatIcone(ic)}
                    >
                      <IconeCategoria
                        nome={ic}
                        cor={catIcone === ic ? catCor : 'rgba(122,48,64,0.4)'}
                        tamanho={18}
                      />
                    </TouchableOpacity>
                  )}
                  columnWrapperStyle={{ gap: 6, marginBottom: 6 }}
                />

                <Text style={styles.label}>cor</Text>
                <FlatList
                  data={CORES_PICKER}
                  numColumns={10}
                  keyExtractor={(c) => c}
                  scrollEnabled={false}
                  style={{ marginBottom: 20 }}
                  renderItem={({ item: cor }) => (
                    <TouchableOpacity
                      style={[
                        styles.corOpcao,
                        { backgroundColor: cor },
                        catCor === cor && styles.corOpcaoAtiva,
                      ]}
                      onPress={() => setCatCor(cor)}
                    >
                      {catCor === cor && (
                        <Check size={11} color="#fff" strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  )}
                  columnWrapperStyle={{ gap: 6, marginBottom: 6 }}
                />

                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvarCategoria}
                  disabled={salvandoCat}
                >
                  {salvandoCat ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>salvar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => setModalEditCat(false)}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <ModalConfirmar
          visivel={modalDeletarTx}
          titulo="excluir transação?"
          mensagem="essa ação não pode ser desfeita"
          botaoTexto="excluir"
          destrutivo
          onConfirmar={deletarTransacao}
          onCancelar={() => {
            setModalDeletarTx(false);
            setTxParaDeletar(null);
          }}
        />
        <ModalConfirmar
          visivel={modalDeletarCat}
          titulo="excluir categoria?"
          mensagem="as transações dessa categoria não serão excluídas"
          botaoTexto="excluir"
          destrutivo
          onConfirmar={deletarCategoria}
          onCancelar={() => {
            setModalDeletarCat(false);
            setCatParaDeletar(null);
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
  titulo: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 28, color: '#3d1a10' },
  btnCategorias: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(155,126,200,0.4)',
    backgroundColor: 'rgba(155,126,200,0.08)',
  },
  btnCategoriasTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: '#9b7ec8',
  },

  navMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { padding: 8 },
  navMesTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
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
    alignItems: 'center',
  },
  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  resumoValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 32,
    color: '#3d1a10',
    marginBottom: 2,
  },
  resumoQtd: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.4)',
  },

  filtroScroll: { marginBottom: 16 },
  filtroContainer: { gap: 8, paddingRight: 4 },
  chipFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    backgroundColor: 'rgba(253,242,246,0.7)',
  },
  chipFiltroAtivo: {
    borderColor: '#c8607a',
    backgroundColor: 'rgba(200,96,122,0.12)',
  },
  chipFiltroTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
  },
  chipFiltroTextoAtivo: { color: '#c8607a' },

  separadorData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  separadorLinha: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,160,176,0.35)',
  },
  separadorTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  cardTx: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,160,176,0.4)',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  txIconeWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txDescricao: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
    marginBottom: 1,
  },
  txCategoria: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
  },
  txDireita: { alignItems: 'flex-end', gap: 4 },
  txValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 14,
    color: '#3d1a10',
  },
  txAcoes: { flexDirection: 'row', gap: 6 },
  txAcaoBotao: { padding: 4 },

  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 180,
  },
  vazioTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
    textAlign: 'center',
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

  inputRow: { flexDirection: 'row', alignItems: 'flex-start' },
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

  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    backgroundColor: 'rgba(253,242,246,0.7)',
  },
  catChipTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: 'rgba(122,48,64,0.5)',
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

  catsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  btnNovaCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(155,126,200,0.4)',
    backgroundColor: 'rgba(155,126,200,0.08)',
  },
  btnNovaCatTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: '#9b7ec8',
  },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,160,176,0.2)',
    borderStyle: 'dashed',
  },
  catIconeWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRowNome: {
    flex: 1,
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  catRowAcoes: { flexDirection: 'row', gap: 8 },

  iconeOpcao: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    borderRadius: 10,
    backgroundColor: 'rgba(253,242,246,0.7)',
  },
  coresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,160,176,0.2)',
    borderStyle: 'dashed',
  },
  calendarToggleTexto: {
    flex: 1,
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.5)',
  },
  recorrenteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  recorrenteTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: 'rgba(122,48,64,0.5)',
  },
  toggleBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253,242,246,0.7)',
  },
  toggleBoxAtivo: { backgroundColor: '#c8607a', borderColor: '#c8607a' },
  duracaoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  duracaoBotao: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(232,160,176,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.2)',
  },
  duracaoBotaoAtivo: {
    backgroundColor: 'rgba(200,96,122,0.15)',
    borderColor: '#c8607a',
  },
  duracaoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: 'rgba(122,48,64,0.55)',
  },
  duracaoTextoAtivo: { color: '#c8607a', fontFamily: 'Baloo2_800ExtraBold' },
  coresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  corOpcao: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corOpcaoAtiva: { borderColor: '#3d1a10', transform: [{ scale: 1.15 }] },
});
