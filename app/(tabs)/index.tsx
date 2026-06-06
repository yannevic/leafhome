import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
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
  doc,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import {
  Wallet,
  Wrench,
  Cake,
  Clock,
  ChevronRight,
  AlertTriangle,
  Pin,
} from 'lucide-react-native';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface UserData {
  apelido: string;
  avatarNome: string;
  espacoAtivo: string;
}

interface Membro {
  userId: string;
  apelido: string;
  avatarNome: string;
  aniversario?: string; // 'DD/MM/AAAA'
  aniversarioVisivel?: boolean;
}

interface Transacao {
  id: string;
  valor: number;
  data: string;
  descricao: string;
  categoriaId: string;
}

interface Categoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
}

interface Evento {
  id: string;
  tipo: 'evento' | 'pagamento' | 'manutencao';
  titulo: string;
  proximaData?: string; // 'DD/MM/AAAA'
  data: string;
  cor?: string;
}

interface Nota {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  fixada: boolean;
}

const CORES_NOTAS = [
  {
    id: 'rosa',
    fundo: 'rgba(252,220,228,0.95)',
    borda: 'rgba(232,160,176,0.6)',
  },
  {
    id: 'lilas',
    fundo: 'rgba(232,220,255,0.95)',
    borda: 'rgba(190,160,240,0.6)',
  },
  {
    id: 'menta',
    fundo: 'rgba(200,240,220,0.95)',
    borda: 'rgba(130,200,160,0.6)',
  },
  {
    id: 'amarelo',
    fundo: 'rgba(255,245,200,0.95)',
    borda: 'rgba(220,190,100,0.6)',
  },
  {
    id: 'azul',
    fundo: 'rgba(210,230,255,0.95)',
    borda: 'rgba(140,180,240,0.6)',
  },
  {
    id: 'pessego',
    fundo: 'rgba(255,225,200,0.95)',
    borda: 'rgba(230,170,120,0.6)',
  },
];

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
function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'bom dia';
  if (h < 18) return 'boa tarde';
  return 'boa noite';
}
function avatarSource(nome: string) {
  const map: Record<string, any> = {
    tito: require('../../assets/avatars/tito.png'),
    larah: require('../../assets/avatars/larah.png'),
    mingau: require('../../assets/avatars/mingau.png'),
    pipoca: require('../../assets/avatars/pipoca.png'),
    gigi: require('../../assets/avatars/gigi.png'),
    lumis: require('../../assets/avatars/lumis.png'),
    spark: require('../../assets/avatars/spark.png'),
    fuba: require('../../assets/avatars/fuba.png'),
    mimo: require('../../assets/avatars/mimo.png'),
    mike: require('../../assets/avatars/mike.png'),
    default: require('../../assets/avatars/default.png'),
  };
  return map[nome] ?? map['default'];
}

// converte 'DD/MM/AAAA' → Date no ano atual (para comparar aniversário)
function anivParaDataEsteAno(s: string): Date | null {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length < 2) return null;
  const hoje = new Date();
  return new Date(hoje.getFullYear(), Number(parts[1]) - 1, Number(parts[0]));
}

// converte 'DD/MM/AAAA' → Date real
function ddmmaaaaParaDate(s: string): Date | null {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length < 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function strParaExibicao(s: string) {
  // 'YYYY-MM-DD' → 'DD/MM'
  const [, mes, dia] = s.split('-');
  return `${dia}/${mes}`;
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Inicio() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = auth.currentUser;
  const hoje = new Date();
  const hojeStr = dataParaStr(hoje);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [membros, setMembros] = useState<Membro[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  // usuário
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserData({
          apelido: d.apelido ?? '',
          avatarNome: d.avatarNome ?? 'default',
          espacoAtivo: d.espacoAtivo ?? '',
        });
        setSpaceId(d.espacoAtivo ?? null);
      }
    });
    return unsub;
  }, [user]);

  // espaço + membros
  useEffect(() => {
    if (!spaceId) return;

    // nome do espaço
    const unsubSpace = onSnapshot(doc(db, 'spaces', spaceId), (snap) => {
      if (snap.exists()) setNomeEspaco(snap.data().nome ?? '');
    });

    // membros do espaço
    const unsubMembers = onSnapshot(
      query(collection(db, 'space_members'), where('spaceId', '==', spaceId)),
      async (snap) => {
        const lista: Membro[] = [];
        for (const m of snap.docs) {
          const uid = m.data().userId;
          const userSnap = await getDocs(
            query(collection(db, 'users'), where('__name__', '==', uid))
          );
          if (!userSnap.empty) {
            const ud = userSnap.docs[0].data();
            lista.push({
              userId: uid,
              apelido: ud.apelido ?? '',
              avatarNome: ud.avatarNome ?? 'default',
              aniversario: ud.aniversario ?? '',
              aniversarioVisivel: ud.aniversarioVisivel ?? true,
            });
          }
        }
        setMembros(lista);
      }
    );

    // transações
    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), where('spaceId', '==', spaceId)),
      (snap) => {
        setTransacoes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transacao)
        );
        setCarregando(false);
      }
    );

    // categorias
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), where('spaceId', '==', spaceId)),
      (snap) =>
        setCategorias(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria)
        )
    );

    // eventos (para manutenções)
    const unsubEventos = onSnapshot(
      query(collection(db, 'calendar_events'), where('spaceId', '==', spaceId)),
      (snap) =>
        setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evento))
    );

    // notas
    const unsubNotas = onSnapshot(
      query(collection(db, 'notes'), where('spaceId', '==', spaceId)),
      (snap) =>
        setNotas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Nota))
    );

    return () => {
      unsubSpace();
      unsubMembers();
      unsubTx();
      unsubCats();
      unsubEventos();
      unsubNotas();
    };
  }, [spaceId]);

  // ─── dados computados ───────────────────────────────────────────────────────

  // gastos do mês
  const prefixoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const txDoMes = transacoes.filter((t) => t.data.startsWith(prefixoMes));
  const totalMes = txDoMes.reduce((s, t) => s + t.valor, 0);

  // últimas 3 transações
  const ultimasTx = [...transacoes]
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
    .slice(0, 3);

  // aniversários do mês atual
  const anivDoMes = membros
    .filter((m) => {
      if (!m.aniversario || !m.aniversarioVisivel) return false;
      const parts = m.aniversario.split('/');
      if (parts.length < 2) return false;
      return Number(parts[1]) === hoje.getMonth() + 1;
    })
    .sort((a, b) => {
      const da = Number(a.aniversario!.split('/')[0]);
      const db2 = Number(b.aniversario!.split('/')[0]);
      return da - db2;
    });

  // manutenções vencendo nos próximos 30 dias
  const limite30 = new Date(hoje);
  limite30.setDate(hoje.getDate() + 30);
  const manutencoes = eventos
    .filter((e) => e.tipo === 'manutencao' && e.proximaData)
    .map((e) => ({ ev: e, data: ddmmaaaaParaDate(e.proximaData!) }))
    .filter(({ data }) => data && data >= hoje && data <= limite30)
    .sort((a, b) => a.data!.getTime() - b.data!.getTime());

  function getCat(id: string) {
    return categorias.find((c) => c.id === id);
  }

  function fmtAniv(s: string) {
    const parts = s.split('/');
    if (parts.length < 2) return s;
    return `${parts[0]} de ${MESES[Number(parts[1]) - 1]}`;
  }

  function diasAte(d: Date) {
    const diff = Math.round(
      (d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    return `em ${diff} dias`;
  }

  return (
    <View style={{ flex: 1 }}>
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
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom - 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── saudação ─── */}
          <View style={styles.saudacaoRow}>
            <View style={styles.saudacaoTextos}>
              {nomeEspaco ? (
                <Text style={styles.nomeEspaco}>{nomeEspaco}</Text>
              ) : null}
              <Text style={styles.saudacaoLabel}>{saudacao()},</Text>
              <Text style={styles.saudacaoNome}>
                {userData?.apelido || '...'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/perfil')}>
              <LinearGradient
                colors={[
                  'rgba(252,220,228,0.8)',
                  'rgba(230,220,255,0.7)',
                  'rgba(252,240,220,0.8)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarWrap}
              >
                {userData && (
                  <Image
                    source={avatarSource(userData.avatarNome)}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ─── card gastos do mês ─── */}
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
            <View style={styles.cardTopo}>
              <View style={styles.cardTopoEsq}>
                <View
                  style={[
                    styles.cardIconeWrap,
                    { backgroundColor: 'rgba(200,96,122,0.12)' },
                  ]}
                >
                  <Wallet size={16} color="#c8607a" strokeWidth={2} />
                </View>
                <Text style={styles.labelSecao}>
                  gastos em {MESES[hoje.getMonth()]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.linkVer}
                onPress={() => router.push('/(tabs)/financas')}
              >
                <Text style={styles.linkVerTexto}>ver tudo</Text>
                <ChevronRight size={12} color="#c8607a" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {carregando ? (
              <ActivityIndicator
                color="#c8607a"
                style={{ marginVertical: 8 }}
              />
            ) : (
              <>
                <Text style={styles.resumoValor}>{fmtMoeda(totalMes)}</Text>
                <Text style={styles.resumoSub}>
                  {txDoMes.length}{' '}
                  {txDoMes.length === 1 ? 'transação' : 'transações'}
                </Text>
              </>
            )}
          </LinearGradient>

          {/* ─── últimas transações ─── */}
          {ultimasTx.length > 0 && (
            <>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoTitulo}>últimas transações</Text>
                <TouchableOpacity
                  style={styles.linkVer}
                  onPress={() => router.push('/(tabs)/financas')}
                >
                  <Text style={styles.linkVerTexto}>finanças</Text>
                  <ChevronRight size={12} color="#c8607a" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              {ultimasTx.map((tx) => {
                const cat = getCat(tx.categoriaId);
                return (
                  <LinearGradient
                    key={tx.id}
                    colors={[
                      'rgba(253,246,240,1)',
                      'rgba(252,220,228,0.9)',
                      'rgba(230,235,255,0.8)',
                      'rgba(253,246,240,1)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.itemCard}
                  >
                    <View
                      style={[
                        styles.dotCor,
                        { backgroundColor: cat?.cor ?? '#b8919a' },
                      ]}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitulo}>{tx.descricao}</Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemSub}>
                          {cat?.nome ?? 'outros'}
                        </Text>
                        <Text style={styles.itemSub}>·</Text>
                        <Text style={styles.itemSub}>
                          {strParaExibicao(tx.data)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.txValor}>{fmtMoeda(tx.valor)}</Text>
                  </LinearGradient>
                );
              })}
            </>
          )}

          {/* ─── aniversários do mês ─── */}
          {anivDoMes.length > 0 && (
            <>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoTitulo}>
                  aniversários em {MESES[hoje.getMonth()]}
                </Text>
              </View>
              {anivDoMes.map((m) => (
                <LinearGradient
                  key={m.userId}
                  colors={[
                    'rgba(253,246,240,1)',
                    'rgba(252,220,228,0.9)',
                    'rgba(255,248,220,0.7)',
                    'rgba(253,246,240,1)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itemCard}
                >
                  <Image
                    source={avatarSource(m.avatarNome)}
                    style={styles.membroAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitulo}>{m.apelido}</Text>
                    <View style={styles.itemMeta}>
                      <Cake
                        size={10}
                        color="rgba(122,48,64,0.45)"
                        strokeWidth={2}
                      />
                      <Text style={styles.itemSub}>
                        {fmtAniv(m.aniversario!)}
                      </Text>
                    </View>
                  </View>
                  {(() => {
                    const d = anivParaDataEsteAno(m.aniversario!);
                    if (!d) return null;
                    const diff = Math.round(
                      (d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (diff < 0 || diff > 7) return null;
                    return (
                      <View style={styles.badge}>
                        <Text style={styles.badgeTexto}>
                          {diff === 0 ? 'hoje! 🎂' : `${diff}d`}
                        </Text>
                      </View>
                    );
                  })()}
                </LinearGradient>
              ))}
            </>
          )}

          {/* ─── manutenções vencendo ─── */}
          {manutencoes.length > 0 && (
            <>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoTitulo}>manutenções em breve</Text>
                <TouchableOpacity
                  style={styles.linkVer}
                  onPress={() => router.push('/(tabs)/calendario')}
                >
                  <Text style={styles.linkVerTexto}>calendário</Text>
                  <ChevronRight size={12} color="#c8607a" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              {manutencoes.map(({ ev, data }) => (
                <LinearGradient
                  key={ev.id}
                  colors={[
                    'rgba(253,246,240,1)',
                    'rgba(255,248,220,0.9)',
                    'rgba(255,235,200,0.7)',
                    'rgba(253,246,240,1)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itemCard}
                >
                  <View
                    style={[
                      styles.cardIconeWrap,
                      { backgroundColor: 'rgba(212,168,75,0.15)' },
                    ]}
                  >
                    <Wrench size={14} color="#d4a84b" strokeWidth={2} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitulo}>{ev.titulo}</Text>
                    <View style={styles.itemMeta}>
                      <Clock
                        size={10}
                        color="rgba(122,48,64,0.45)"
                        strokeWidth={2}
                      />
                      <Text style={styles.itemSub}>{diasAte(data!)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: 'rgba(212,168,75,0.15)' },
                    ]}
                  >
                    <Text style={[styles.badgeTexto, { color: '#d4a84b' }]}>
                      {ev.proximaData!.slice(0, 5)}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </>
          )}
          {/* ─── notas fixadas ─── */}
          {(() => {
            const fixadas = notas.filter((n) => n.fixada);
            if (fixadas.length === 0) return null;
            return (
              <>
                <View style={styles.secaoHeader}>
                  <Text style={styles.secaoTitulo}>notas fixadas</Text>
                  <TouchableOpacity
                    style={styles.linkVer}
                    onPress={() => router.push('/extras/notas')}
                  >
                    <Text style={styles.linkVerTexto}>ver todas</Text>
                    <ChevronRight size={12} color="#c8607a" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 8 }}
                >
                  {fixadas.map((n) => {
                    const cor =
                      CORES_NOTAS.find((c) => c.id === n.cor) ?? CORES_NOTAS[0];
                    return (
                      <TouchableOpacity
                        key={n.id}
                        onPress={() => router.push('/extras/notas')}
                        activeOpacity={0.8}
                        style={{ marginRight: 10 }}
                      >
                        <View
                          style={[
                            styles.notaCard,
                            {
                              backgroundColor: cor.fundo,
                              borderColor: cor.borda,
                            },
                          ]}
                        >
                          {n.titulo ? (
                            <Text style={styles.notaTitulo}>{n.titulo}</Text>
                          ) : null}
                          <Text style={styles.notaTexto} numberOfLines={4}>
                            {n.texto}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            );
          })()}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },

  // saudação
  saudacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  saudacaoTextos: { flex: 1 },
  nomeEspaco: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: 'rgba(122,48,64,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  saudacaoLabel: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: 'rgba(122,48,64,0.6)',
  },
  saudacaoNome: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#3d1a10',
    lineHeight: 34,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },

  // card principal
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 20,
    marginBottom: 24,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTopoEsq: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIconeWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resumoValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 34,
    color: '#3d1a10',
    marginBottom: 2,
  },
  resumoSub: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.45)',
  },

  // seções
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  secaoTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  linkVer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkVerTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: '#c8607a',
  },

  // item genérico
  itemCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.35)',
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(200,120,140,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  dotCor: { width: 10, height: 10, borderRadius: 5 },
  itemInfo: { flex: 1 },
  itemTitulo: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
    marginBottom: 2,
  },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemSub: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
  },
  txValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 14,
    color: '#3d1a10',
  },

  // aniversários
  membroAvatar: { width: 34, height: 34, borderRadius: 17 },

  // badge
  badge: {
    backgroundColor: 'rgba(200,96,122,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 11,
    color: '#c8607a',
  },
  notaCard: {
    width: 160,
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 12,
  },
  notaTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 12,
    color: '#3d1a10',
    marginBottom: 4,
  },
  notaTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(61,26,16,0.75)',
    lineHeight: 17,
  },
});
