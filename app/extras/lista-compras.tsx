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
  Vibration,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
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
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import {
  Plus,
  ChevronLeft,
  Check,
  Trash2,
  Pencil,
  ShoppingCart,
  Archive,
  RotateCcw,
  CircleCheck,
  DollarSign,
  Pin,
} from 'lucide-react-native';
import ModalConfirmar from '../../components/ModalConfirmar';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Lista {
  fixada?: boolean;
  id: string;
  spaceId: string;
  nome: string;
  status: 'ativa' | 'finalizada';
  isTemplate: boolean;
  criadoEm: Timestamp;
}

interface Item {
  id: string;
  listaId: string;
  spaceId: string;
  nome: string;
  quantidade: string;
  marcado: boolean;
  valor?: number;
  ordem: number;
}

const AVATAR_MAP: Record<string, any> = {
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
function avatarSrc(nome: string) {
  return AVATAR_MAP[nome] ?? AVATAR_MAP['default'];
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function ListaCompras() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = auth.currentUser;

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [listas, setListas] = useState<Lista[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [listaAberta, setListaAberta] = useState<Lista | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [membros, setMembros] = useState<
    Record<string, { apelido: string; avatarNome: string }>
  >({});

  // modais
  const [modalNovaLista, setModalNovaLista] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalDeletarLista, setModalDeletarLista] = useState(false);
  const [modalDeletarItem, setModalDeletarItem] = useState(false);
  const [modalEditarItem, setModalEditarItem] = useState(false);
  const [itemParaDeletar, setItemParaDeletar] = useState<string | null>(null);
  const [listaParaDeletar, setListaParaDeletar] = useState<string | null>(null);

  // form nova lista
  const [nomeNovaLista, setNomeNovaLista] = useState('');
  const [salvandoLista, setSalvandoLista] = useState(false);

  // input rápido de item (inline, rodapé)
  const [inputItem, setInputItem] = useState('');
  const [adicionandoItem, setAdicionandoItem] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // edição de item (modal simples)
  const [itemEditando, setItemEditando] = useState<Item | null>(null);
  const [nomeItemEdit, setNomeItemEdit] = useState('');
  const [qtdItemEdit, setQtdItemEdit] = useState('');
  const [salvandoItemEdit, setSalvandoItemEdit] = useState(false);

  // finalizar com valor
  const [valorFinalizar, setValorFinalizar] = useState('');

  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'templates'>('ativas');
  const [modalFixar, setModalFixar] = useState(false);
  const [listaParaFixar, setListaParaFixar] = useState<Lista | null>(null);

  // espaço ativo
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setSpaceId(snap.data().espacoAtivo ?? null);
    });
    return unsub;
  }, [user]);

  // listas
  useEffect(() => {
    if (!spaceId) return;
    const unsubMembros = onSnapshot(
      query(collection(db, 'space_members'), where('spaceId', '==', spaceId)),
      async (snap) => {
        const map: Record<string, { apelido: string; avatarNome: string }> = {};
        for (const m of snap.docs) {
          const mUid = m.data().userId;
          const mSnap = await getDoc(doc(db, 'users', mUid));
          if (mSnap.exists()) {
            const d = mSnap.data();
            map[mUid] = {
              apelido: d.apelido ?? '',
              avatarNome: d.avatarNome ?? '',
            };
          }
        }
        setMembros(map);
      }
    );
    const unsub = onSnapshot(
      query(collection(db, 'shopping_lists'), where('spaceId', '==', spaceId)),
      (snap) => {
        setListas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lista));
        setCarregando(false);
      }
    );
    return () => {
      unsub();
      unsubMembros();
    };
  }, [spaceId]);

  // itens
  useEffect(() => {
    if (!spaceId) return;
    const unsub = onSnapshot(
      query(collection(db, 'list_items'), where('spaceId', '==', spaceId)),
      (snap) =>
        setItens(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Item))
    );
    return unsub;
  }, [spaceId]);

  function itensLista(listaId: string) {
    return itens
      .filter((i) => i.listaId === listaId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  const listasAtivas = listas.filter(
    (l) => l.status === 'ativa' && !l.isTemplate
  );
  const templates = listas.filter((l) => l.isTemplate);

  // ─── adicionar item rápido (Enter) ────────────────────────────────────────
  async function adicionarItemRapido() {
    if (!listaAberta || !inputItem.trim() || !spaceId) return;
    setAdicionandoItem(true);
    const texto = inputItem.trim();
    setInputItem(''); // limpa imediatamente pra parecer instantâneo
    try {
      const ordem = itensLista(listaAberta.id).length;
      await addDoc(collection(db, 'list_items'), {
        listaId: listaAberta.id,
        spaceId,
        nome: texto,
        quantidade: '',
        marcado: false,
        ordem,
      });
    } finally {
      setAdicionandoItem(false);
      // devolve foco pro input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // ─── ações de lista ───────────────────────────────────────────────────────
  async function criarLista(nome: string, fromTemplate?: Lista) {
    if (!spaceId || !nome.trim()) return;
    setSalvandoLista(true);
    try {
      const novaRef = await addDoc(collection(db, 'shopping_lists'), {
        spaceId,
        nome: nome.trim(),
        status: 'ativa',
        isTemplate: false,
        criadoEm: Timestamp.now(),
      });
      if (fromTemplate) {
        const itensTemplate = itensLista(fromTemplate.id);
        for (const it of itensTemplate) {
          await addDoc(collection(db, 'list_items'), {
            listaId: novaRef.id,
            spaceId,
            nome: it.nome,
            quantidade: it.quantidade,
            marcado: false,
            ordem: it.ordem,
          });
        }
      }
      setModalNovaLista(false);
      setNomeNovaLista('');
    } finally {
      setSalvandoLista(false);
    }
  }

  async function deletarLista() {
    if (!listaParaDeletar) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'shopping_lists', listaParaDeletar));
    itens
      .filter((i) => i.listaId === listaParaDeletar)
      .forEach((i) => batch.delete(doc(db, 'list_items', i.id)));
    await batch.commit();
    if (listaAberta?.id === listaParaDeletar) setListaAberta(null);
    setModalDeletarLista(false);
    setListaParaDeletar(null);
  }

  async function toggleFixarLista(lista: Lista) {
    setListaParaFixar(lista);
    setModalFixar(true);
  }

  async function confirmarFixar() {
    if (!listaParaFixar) return;
    await updateDoc(doc(db, 'shopping_lists', listaParaFixar.id), {
      fixada: !listaParaFixar.fixada,
    });
    setModalFixar(false);
    setListaParaFixar(null);
  }

  async function finalizarLista(manter: boolean) {
    if (!listaAberta) return;
    // lança nas finanças se tiver valor
    const valor = parseFloat(valorFinalizar.replace(',', '.'));
    if (!isNaN(valor) && valor > 0 && spaceId && user) {
      await addDoc(collection(db, 'transactions'), {
        spaceId,
        criadoPor: user.uid,
        tipo: 'saida',
        descricao: listaAberta.nome,
        valor,
        data: new Date().toISOString().split('T')[0],
        categoria: 'compras',
        criadoEm: Timestamp.now(),
      });
    }
    if (manter) {
      await updateDoc(doc(db, 'shopping_lists', listaAberta.id), {
        isTemplate: true,
        status: 'finalizada',
      });
      const batch = writeBatch(db);
      itensLista(listaAberta.id).forEach((i) =>
        batch.update(doc(db, 'list_items', i.id), { marcado: false })
      );
      await batch.commit();
    } else {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'shopping_lists', listaAberta.id));
      itensLista(listaAberta.id).forEach((i) =>
        batch.delete(doc(db, 'list_items', i.id))
      );
      await batch.commit();
    }
    setListaAberta(null);
    setModalFinalizar(false);
    setValorFinalizar('');
  }

  async function usarTemplate(template: Lista) {
    await criarLista(template.nome, template);
    setAbaAtiva('ativas');
  }

  // ─── ações de item ────────────────────────────────────────────────────────
  async function toggleItem(item: Item) {
    await updateDoc(doc(db, 'list_items', item.id), { marcado: !item.marcado });
  }

  async function deletarItem() {
    if (!itemParaDeletar) return;
    await deleteDoc(doc(db, 'list_items', itemParaDeletar));
    setModalDeletarItem(false);
    setItemParaDeletar(null);
  }

  async function salvarEdicaoItem() {
    if (!itemEditando || !nomeItemEdit.trim()) return;
    setSalvandoItemEdit(true);
    try {
      await updateDoc(doc(db, 'list_items', itemEditando.id), {
        nome: nomeItemEdit.trim(),
        quantidade: qtdItemEdit.trim(),
      });
      setModalEditarItem(false);
      setItemEditando(null);
    } finally {
      setSalvandoItemEdit(false);
    }
  }

  function abrirEditarItem(item: Item) {
    setItemEditando(item);
    setNomeItemEdit(item.nome);
    setQtdItemEdit(item.quantidade ?? '');
    setModalEditarItem(true);
  }

  const progresso = listaAberta
    ? (() => {
        const its = itensLista(listaAberta.id);
        if (its.length === 0) return 0;
        return its.filter((i) => i.marcado).length / its.length;
      })()
    : 0;

  // ─── view lista aberta ────────────────────────────────────────────────────
  if (listaAberta) {
    const its = itensLista(listaAberta.id);
    const marcados = its.filter((i) => i.marcado).length;

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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
          {/* lista de itens */}
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingTop: insets.top + 16, paddingBottom: 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setListaAberta(null)}
                style={styles.btnVoltar}
              >
                <ChevronLeft size={20} color="#c8607a" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.titulo} numberOfLines={1}>
                {listaAberta.nome}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setListaParaDeletar(listaAberta.id);
                  setModalDeletarLista(true);
                }}
              >
                <Trash2
                  size={16}
                  color="rgba(232,96,122,0.55)"
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>

            {/* progresso */}
            <LinearGradient
              colors={[
                'rgba(253,246,240,1)',
                'rgba(252,220,228,0.9)',
                'rgba(230,235,255,0.8)',
                'rgba(253,246,240,1)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.progressoCard}
            >
              <View style={styles.progressoTopo}>
                <Text style={styles.progressoTexto}>
                  {marcados} de {its.length}{' '}
                  {its.length === 1 ? 'item' : 'itens'}
                </Text>
                <Text style={styles.progressoPct}>
                  {Math.round(progresso * 100)}%
                </Text>
              </View>
              <View style={styles.progressoBarFundo}>
                <LinearGradient
                  colors={[
                    'rgba(252,200,220,0.9)',
                    'rgba(210,200,255,0.85)',
                    'rgba(252,220,200,0.9)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressoBarFill,
                    { width: `${progresso * 100}%` },
                  ]}
                />
              </View>
              {progresso === 1 && its.length > 0 && (
                <TouchableOpacity
                  style={styles.btnFinalizar}
                  onPress={() => setModalFinalizar(true)}
                >
                  <CircleCheck size={14} color="#6ab89a" strokeWidth={2} />
                  <Text style={styles.btnFinalizarTexto}>
                    tudo marcado! finalizar lista
                  </Text>
                </TouchableOpacity>
              )}
            </LinearGradient>

            {/* itens pendentes */}
            {its.filter((i) => !i.marcado).length > 0 && (
              <>
                <Text style={styles.labelSecao}>pendentes</Text>
                {its
                  .filter((i) => !i.marcado)
                  .map((item) => (
                    <LinearGradient
                      key={item.id}
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
                      <TouchableOpacity
                        style={styles.checkBox}
                        onPress={() => toggleItem(item)}
                      >
                        <View style={styles.checkBoxInner} />
                      </TouchableOpacity>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNome}>{item.nome}</Text>
                        {item.quantidade ? (
                          <Text style={styles.itemQtd}>{item.quantidade}</Text>
                        ) : null}
                      </View>
                      <View style={styles.itemAcoes}>
                        <TouchableOpacity
                          onPress={() => abrirEditarItem(item)}
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
                            setItemParaDeletar(item.id);
                            setModalDeletarItem(true);
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
                    </LinearGradient>
                  ))}
              </>
            )}

            {/* itens marcados */}
            {its.filter((i) => i.marcado).length > 0 && (
              <>
                <Text style={[styles.labelSecao, { marginTop: 8 }]}>
                  no carrinho
                </Text>
                {its
                  .filter((i) => i.marcado)
                  .map((item) => (
                    <LinearGradient
                      key={item.id}
                      colors={[
                        'rgba(253,246,240,0.6)',
                        'rgba(230,235,255,0.5)',
                        'rgba(253,246,240,0.6)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.itemCard, { opacity: 0.75 }]}
                    >
                      <TouchableOpacity
                        style={[styles.checkBox, styles.checkBoxMarcado]}
                        onPress={() => toggleItem(item)}
                      >
                        <Check size={12} color="#6ab89a" strokeWidth={3} />
                      </TouchableOpacity>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemNome, styles.itemNomeMarcado]}>
                          {item.nome}
                        </Text>
                        {item.quantidade ? (
                          <Text style={styles.itemQtd}>{item.quantidade}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setItemParaDeletar(item.id);
                          setModalDeletarItem(true);
                        }}
                        style={styles.acaoBotao}
                      >
                        <Trash2
                          size={13}
                          color="rgba(232,96,122,0.4)"
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  ))}
              </>
            )}

            {its.length === 0 && (
              <View style={styles.vazio}>
                <Text style={styles.vazioTexto}>
                  nenhum item ainda.{'\n'}digite abaixo e pressione enter!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* ── input rápido fixo no rodapé ─────────────────────────────── */}
          <View
            style={[styles.inputRodape, { paddingBottom: insets.bottom + 12 }]}
          >
            <LinearGradient
              colors={[
                'rgba(253,246,240,0.98)',
                'rgba(252,220,228,0.95)',
                'rgba(230,235,255,0.92)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputRodapeInner}
            >
              <TextInput
                ref={inputRef}
                style={styles.inputInline}
                value={inputItem}
                onChangeText={setInputItem}
                placeholder="adicionar item..."
                placeholderTextColor="rgba(122,48,64,0.35)"
                underlineColorAndroid="transparent"
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={adicionarItemRapido}
              />
              {adicionandoItem ? (
                <ActivityIndicator
                  size="small"
                  color="#c8607a"
                  style={{ marginRight: 4 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={adicionarItemRapido}
                  style={styles.btnAdicionarInline}
                  disabled={!inputItem.trim()}
                >
                  <Plus
                    size={18}
                    color={
                      inputItem.trim() ? '#c8607a' : 'rgba(200,96,122,0.3)'
                    }
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {/* modal editar item */}
          <Modal visible={modalEditarItem} transparent animationType="slide">
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
                  <Text style={styles.modalTitulo}>editar item</Text>
                  <Text style={styles.label}>nome</Text>
                  <TextInput
                    style={styles.input}
                    value={nomeItemEdit}
                    onChangeText={setNomeItemEdit}
                    placeholder="ex: arroz"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                    autoFocus
                  />
                  <Text style={styles.label}>quantidade (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={qtdItemEdit}
                    onChangeText={setQtdItemEdit}
                    placeholder="ex: 2kg, 3 unid"
                    placeholderTextColor="rgba(122,48,64,0.35)"
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.botao}
                    onPress={salvarEdicaoItem}
                    disabled={salvandoItemEdit}
                  >
                    {salvandoItemEdit ? (
                      <ActivityIndicator color="#3d1a10" />
                    ) : (
                      <Text style={styles.botaoTexto}>salvar</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.botaoCancelar}
                    onPress={() => {
                      setModalEditarItem(false);
                      setItemEditando(null);
                    }}
                  >
                    <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* modal finalizar */}
          <Modal visible={modalFinalizar} transparent animationType="fade">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
              <View
                style={[
                  styles.modalOverlay,
                  { justifyContent: 'center', paddingHorizontal: 32 },
                ]}
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
                  style={[styles.modalCard, { borderRadius: 20 }]}
                >
                  <Text style={styles.modalTitulo}>finalizar lista</Text>
                  <Text style={styles.modalDesc}>
                    o que fazer com "{listaAberta?.nome}"?
                  </Text>

                  {/* campo valor opcional */}
                  <View style={styles.valorWrap}>
                    <DollarSign
                      size={14}
                      color="rgba(122,48,64,0.45)"
                      strokeWidth={2}
                    />
                    <TextInput
                      style={styles.inputValor}
                      value={valorFinalizar}
                      onChangeText={setValorFinalizar}
                      placeholder="valor gasto (opcional)"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      underlineColorAndroid="transparent"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {valorFinalizar.trim() !== '' && (
                    <Text style={styles.valorHint}>
                      será lançado em finanças como saída
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[styles.opcaoFinalizar, { marginTop: 16 }]}
                    onPress={() => finalizarLista(true)}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(106,184,154,0.15)',
                        'rgba(106,184,154,0.08)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.opcaoFinalizarGrad}
                    >
                      <Archive size={18} color="#6ab89a" strokeWidth={2} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.opcaoFinalizarTitulo,
                            { color: '#6ab89a' },
                          ]}
                        >
                          salvar como template
                        </Text>
                        <Text style={styles.opcaoFinalizarDesc}>
                          reaproveite essa lista na próxima vez
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.opcaoFinalizar}
                    onPress={() => finalizarLista(false)}
                  >
                    <LinearGradient
                      colors={['rgba(232,96,122,0.1)', 'rgba(232,96,122,0.05)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.opcaoFinalizarGrad}
                    >
                      <Trash2 size={18} color="#e8607a" strokeWidth={2} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.opcaoFinalizarTitulo,
                            { color: '#e8607a' },
                          ]}
                        >
                          descartar
                        </Text>
                        <Text style={styles.opcaoFinalizarDesc}>
                          apaga a lista e todos os itens
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botaoCancelar}
                    onPress={() => {
                      setModalFinalizar(false);
                      setValorFinalizar('');
                    }}
                  >
                    <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          <ModalConfirmar
            visivel={modalDeletarItem}
            titulo="excluir item?"
            mensagem="essa ação não pode ser desfeita"
            botaoTexto="excluir"
            destrutivo
            onConfirmar={deletarItem}
            onCancelar={() => {
              setModalDeletarItem(false);
              setItemParaDeletar(null);
            }}
          />
          <ModalConfirmar
            visivel={modalDeletarLista}
            titulo="excluir lista?"
            mensagem="todos os itens serão apagados"
            botaoTexto="excluir"
            destrutivo
            onConfirmar={deletarLista}
            onCancelar={() => {
              setModalDeletarLista(false);
              setListaParaDeletar(null);
            }}
          />
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // ─── view principal (hub de listas) ──────────────────────────────────────
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
            <Text style={styles.titulo}>lista de compras</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* abas */}
          <View style={styles.abas}>
            {(['ativas', 'templates'] as const).map((aba) => (
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
            <>
              {listasAtivas.length === 0 ? (
                <View style={styles.vazio}>
                  <Text style={styles.vazioTexto}>
                    nenhuma lista ativa. crie uma nova!
                  </Text>
                </View>
              ) : (
                listasAtivas
                  .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis())
                  .map((lista) => {
                    const its = itensLista(lista.id);
                    const marcados = its.filter((i) => i.marcado).length;
                    const pct = its.length > 0 ? marcados / its.length : 0;
                    return (
                      <TouchableOpacity
                        key={lista.id}
                        onPress={() => setListaAberta(lista)}
                        onLongPress={() => {
                          Vibration.vibrate(40);
                          toggleFixarLista(lista);
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[
                            'rgba(253,246,240,1)',
                            'rgba(252,220,228,0.9)',
                            'rgba(230,235,255,0.8)',
                            'rgba(253,246,240,1)',
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.listaCard}
                        >
                          <View
                            style={[
                              styles.listaIconeWrap,
                              { backgroundColor: 'rgba(106,159,216,0.15)' },
                            ]}
                          >
                            <ShoppingCart
                              size={18}
                              color="#6a9fd8"
                              strokeWidth={2}
                            />
                          </View>
                          {lista.fixada && (
                            <Pin
                              size={12}
                              color="#c8607a"
                              strokeWidth={2}
                              style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                              }}
                            />
                          )}
                          <View style={styles.listaInfo}>
                            <Text style={styles.listaNome}>{lista.nome}</Text>
                            <Text style={styles.listaSub}>
                              {marcados}/{its.length} itens
                            </Text>
                            <View style={styles.miniBarFundo}>
                              <LinearGradient
                                colors={[
                                  'rgba(252,200,220,0.9)',
                                  'rgba(210,200,255,0.85)',
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.miniBarFill,
                                  { width: `${pct * 100}%` },
                                ]}
                              />
                            </View>
                          </View>
                          {membros[(lista as any).criadoPor] && (
                            <Image
                              source={avatarSrc(
                                membros[(lista as any).criadoPor].avatarNome
                              )}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                marginRight: 4,
                              }}
                              resizeMode="cover"
                            />
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              setListaParaDeletar(lista.id);
                              setModalDeletarLista(true);
                            }}
                            style={styles.acaoBotao}
                          >
                            <Trash2
                              size={14}
                              color="rgba(232,96,122,0.45)"
                              strokeWidth={2}
                            />
                          </TouchableOpacity>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })
              )}
            </>
          ) : (
            <>
              {templates.length === 0 ? (
                <View style={styles.vazio}>
                  <Text style={styles.vazioTexto}>
                    nenhum template ainda. ao finalizar uma lista, escolha
                    salvar como template.
                  </Text>
                </View>
              ) : (
                templates.map((t) => {
                  const its = itensLista(t.id);
                  return (
                    <LinearGradient
                      key={t.id}
                      colors={[
                        'rgba(253,246,240,1)',
                        'rgba(252,220,228,0.9)',
                        'rgba(230,235,255,0.8)',
                        'rgba(253,246,240,1)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.listaCard}
                    >
                      <View
                        style={[
                          styles.listaIconeWrap,
                          { backgroundColor: 'rgba(106,184,154,0.15)' },
                        ]}
                      >
                        <Archive size={18} color="#6ab89a" strokeWidth={2} />
                      </View>
                      <View style={styles.listaInfo}>
                        <Text style={styles.listaNome}>{t.nome}</Text>
                        <Text style={styles.listaSub}>
                          {its.length} {its.length === 1 ? 'item' : 'itens'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.acaoBotao, styles.btnUsar]}
                          onPress={() => usarTemplate(t)}
                        >
                          <RotateCcw
                            size={13}
                            color="#6ab89a"
                            strokeWidth={2}
                          />
                          <Text style={styles.btnUsarTexto}>usar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setListaParaDeletar(t.id);
                            setModalDeletarLista(true);
                          }}
                          style={styles.acaoBotao}
                        >
                          <Trash2
                            size={14}
                            color="rgba(232,96,122,0.45)"
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* FAB nova lista */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 14 }]}
          onPress={() => {
            setNomeNovaLista('');
            setModalNovaLista(true);
          }}
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

        {/* modal nova lista */}
        <Modal visible={modalNovaLista} transparent animationType="slide">
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
                <Text style={styles.modalTitulo}>nova lista</Text>
                <Text style={styles.label}>nome</Text>
                <TextInput
                  style={styles.input}
                  value={nomeNovaLista}
                  onChangeText={setNomeNovaLista}
                  placeholder='ex: "feira de janeiro"'
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => criarLista(nomeNovaLista)}
                />
                <TouchableOpacity
                  style={styles.botao}
                  onPress={() => criarLista(nomeNovaLista)}
                  disabled={salvandoLista}
                >
                  {salvandoLista ? (
                    <ActivityIndicator color="#3d1a10" />
                  ) : (
                    <Text style={styles.botaoTexto}>criar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoCancelar}
                  onPress={() => setModalNovaLista(false)}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <ModalConfirmar
          visivel={modalDeletarLista}
          titulo="excluir lista?"
          mensagem="todos os itens serão apagados"
          botaoTexto="excluir"
          destrutivo
          onConfirmar={deletarLista}
          onCancelar={() => {
            setModalDeletarLista(false);
            setListaParaDeletar(null);
          }}
        />
        <ModalConfirmar
          visivel={modalFixar}
          titulo={listaParaFixar?.fixada ? 'desafixar lista?' : 'fixar lista?'}
          mensagem={
            listaParaFixar?.fixada
              ? 'ela vai sair do dashboard'
              : 'ela vai aparecer no dashboard'
          }
          botaoTexto={listaParaFixar?.fixada ? 'desafixar' : 'fixar'}
          onConfirmar={confirmarFixar}
          onCancelar={() => {
            setModalFixar(false);
            setListaParaFixar(null);
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
  titulo: {
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

  listaCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(200,120,140,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  listaIconeWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listaInfo: { flex: 1 },
  listaNome: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 14,
    color: '#3d1a10',
    marginBottom: 2,
  },
  listaSub: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
    marginBottom: 6,
  },
  miniBarFundo: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(232,160,176,0.2)',
    overflow: 'hidden',
  },
  miniBarFill: { height: 4, borderRadius: 4 },

  progressoCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
    shadowColor: 'rgba(200,120,140,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 6,
  },
  progressoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  progressoPct: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 13,
    color: '#c8607a',
  },
  progressoBarFundo: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(232,160,176,0.2)',
    overflow: 'hidden',
  },
  progressoBarFill: { height: 6, borderRadius: 6 },
  btnFinalizar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  btnFinalizarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: '#6ab89a',
  },

  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

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
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253,242,246,0.7)',
  },
  checkBoxInner: {
    width: 8,
    height: 8,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  checkBoxMarcado: {
    backgroundColor: 'rgba(106,184,154,0.15)',
    borderColor: '#6ab89a',
  },
  itemInfo: { flex: 1 },
  itemNome: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 14,
    color: '#3d1a10',
  },
  itemNomeMarcado: {
    textDecorationLine: 'line-through',
    color: 'rgba(122,48,64,0.4)',
  },
  itemQtd: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
    marginTop: 1,
  },
  itemAcoes: { flexDirection: 'row', gap: 6 },
  acaoBotao: { padding: 4 },

  btnUsar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(106,184,154,0.4)',
    borderStyle: 'dashed',
  },
  btnUsarTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: '#6ab89a',
  },

  vazio: { alignItems: 'center', paddingTop: 80 },
  vazioTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── input rodapé ──────────────────────────────────────────────────────────
  inputRodape: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,160,176,0.25)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputRodapeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  inputInline: {
    flex: 1,
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: '#3d1a10',
    paddingVertical: 10,
  },
  btnAdicionarInline: {
    padding: 6,
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

  valorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253,242,246,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    paddingHorizontal: 12,
    gap: 6,
  },
  inputValor: {
    flex: 1,
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: '#3d1a10',
    paddingVertical: 10,
  },
  valorHint: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(74,122,74,0.7)',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },

  opcaoFinalizar: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    borderStyle: 'dashed',
  },
  opcaoFinalizarGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  opcaoFinalizarTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 14,
    marginBottom: 2,
  },
  opcaoFinalizarDesc: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
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
