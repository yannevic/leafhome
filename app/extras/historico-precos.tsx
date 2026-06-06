import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import { db, auth } from '../../lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import ModalConfirmar from '../../components/ModalConfirmar';

interface Registro {
  id: string;
  nome: string;
  valor: number;
  data: string;
  criadoEm: Timestamp;
}

interface ItemAgrupado {
  nome: string;
  ultimo: number;
  ultimaData: string;
  anterior: number | null;
  registros: Registro[];
}

function mascararData(txt: string) {
  const s = txt.replace(/\D/g, '').slice(0, 8);
  if (s.length <= 2) return s;
  if (s.length <= 4) return s.slice(0, 2) + '/' + s.slice(2);
  return s.slice(0, 2) + '/' + s.slice(2, 4) + '/' + s.slice(4);
}

function dataParaISO(d: string) {
  const [dia, mes, ano] = d.split('/');
  return `${ano}-${mes}-${dia}`;
}

function isoParaDisplay(d: string) {
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

function dataValida(d: string) {
  if (d.length !== 10) return false;
  const [dia, mes, ano] = d.split('/').map(Number);
  if (!dia || !mes || !ano) return false;
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;
  if (ano < 2000 || ano > 2100) return false;
  return true;
}

export default function HistoricoPrecos() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [filtro, setFiltro] = useState('');
  const [itemAberto, setItemAberto] = useState<ItemAgrupado | null>(null);
  const [modalAdd, setModalAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [deletarModal, setDeletarModal] = useState(false);
  const [registroParaDeletar, setRegistroParaDeletar] =
    useState<Registro | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (snap.exists()) setSpaceId(snap.data().espacoAtivo || '');
    });
  }, []);

  useEffect(() => {
    if (!spaceId) return;
    const q = query(
      collection(db, 'price_history'),
      where('spaceId', '==', spaceId),
      orderBy('data', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setRegistros(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Registro)
      );
    });
    return unsub;
  }, [spaceId]);

  function agrupar(lista: Registro[]): ItemAgrupado[] {
    const mapa: Record<string, Registro[]> = {};
    lista.forEach((r) => {
      const chave = r.nome.toLowerCase().trim();
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(r);
    });
    return Object.entries(mapa)
      .map(([, regs]) => {
        const ordenados = [...regs].sort((a, b) =>
          b.data.localeCompare(a.data)
        );
        return {
          nome: ordenados[0].nome,
          ultimo: ordenados[0].valor,
          ultimaData: ordenados[0].data,
          anterior: ordenados.length > 1 ? ordenados[1].valor : null,
          registros: ordenados,
        };
      })
      .sort((a, b) => b.ultimaData.localeCompare(a.ultimaData));
  }

  const agrupados = agrupar(registros);
  const nomesCadastrados = [...new Set(registros.map((r) => r.nome))];

  const filtrados = filtro
    ? agrupados.filter((i) =>
        i.nome.toLowerCase().includes(filtro.toLowerCase())
      )
    : agrupados;

  function abrirAdd() {
    setNome('');
    setValor('');
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    setData(`${dd}/${mm}/${yyyy}`);
    setErros({});
    setMostrarSugestoes(false);
    setModalAdd(true);
  }

  function handleNome(txt: string) {
    setNome(txt);
    if (txt.length >= 1) {
      const s = nomesCadastrados.filter((n) =>
        n.toLowerCase().includes(txt.toLowerCase())
      );
      setSugestoes(s);
      setMostrarSugestoes(s.length > 0);
    } else {
      setMostrarSugestoes(false);
    }
  }

  function selecionarSugestao(s: string) {
    setNome(s);
    setMostrarSugestoes(false);
  }

  async function salvar() {
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = 'informe o nome';
    const v = parseFloat(valor.replace(',', '.'));
    if (!valor || isNaN(v) || v <= 0)
      novosErros.valor = 'informe um valor válido';
    if (!dataValida(data)) novosErros.data = 'data inválida';
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }
    setSalvando(true);
    try {
      await addDoc(collection(db, 'price_history'), {
        spaceId,
        nome: nome.trim(),
        valor: v,
        data: dataParaISO(data),
        criadoEm: Timestamp.now(),
      });
      setModalAdd(false);
    } catch (e) {
      console.error(e);
    }
    setSalvando(false);
  }

  async function deletarRegistro() {
    if (!registroParaDeletar) return;
    await deleteDoc(doc(db, 'price_history', registroParaDeletar.id));
    setDeletarModal(false);
    setRegistroParaDeletar(null);
    if (itemAberto) {
      const novos = itemAberto.registros.filter(
        (r) => r.id !== registroParaDeletar.id
      );
      if (novos.length === 0) setItemAberto(null);
      else setItemAberto({ ...itemAberto, registros: novos });
    }
  }

  function variacaoTexto(ultimo: number, anterior: number) {
    const diff = ((ultimo - anterior) / anterior) * 100;
    return { diff, texto: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` };
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
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
          {/* header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.btnVoltar}
            >
              <ChevronLeft size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.tituloPagina}>histórico de preços</Text>
            <TouchableOpacity onPress={abrirAdd} style={styles.btnAdd}>
              <Plus size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* filtro */}
          <View style={styles.filtroWrap}>
            <Search
              size={14}
              color="rgba(122,48,64,0.4)"
              strokeWidth={2}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.filtroInput}
              placeholder="buscar item..."
              placeholderTextColor="rgba(122,48,64,0.35)"
              value={filtro}
              onChangeText={setFiltro}
              underlineColorAndroid="transparent"
            />
            {filtro.length > 0 && (
              <TouchableOpacity onPress={() => setFiltro('')}>
                <X size={14} color="rgba(122,48,64,0.4)" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* lista */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 32,
              gap: 10,
              paddingTop: 4,
            }}
          >
            {filtrados.length === 0 && (
              <Text style={styles.vazio}>nenhum item registrado ainda</Text>
            )}
            {filtrados.map((item) => {
              const variacao =
                item.anterior !== null
                  ? variacaoTexto(item.ultimo, item.anterior)
                  : null;
              return (
                <TouchableOpacity
                  key={item.nome}
                  onPress={() => setItemAberto(item)}
                  activeOpacity={0.8}
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardNome}>{item.nome}</Text>
                      <Text style={styles.cardData}>
                        {isoParaDisplay(item.ultimaData)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.cardValor}>
                        R$ {item.ultimo.toFixed(2).replace('.', ',')}
                      </Text>
                      {variacao !== null && (
                        <View
                          style={[
                            styles.variacaoBadge,
                            {
                              backgroundColor:
                                variacao.diff > 0
                                  ? 'rgba(232,96,122,0.1)'
                                  : variacao.diff < 0
                                    ? 'rgba(74,122,74,0.1)'
                                    : 'rgba(122,48,64,0.08)',
                            },
                          ]}
                        >
                          {variacao.diff > 0 ? (
                            <TrendingUp
                              size={11}
                              color="#e8607a"
                              strokeWidth={2}
                            />
                          ) : variacao.diff < 0 ? (
                            <TrendingDown
                              size={11}
                              color="#4a7a4a"
                              strokeWidth={2}
                            />
                          ) : (
                            <Minus
                              size={11}
                              color="rgba(122,48,64,0.4)"
                              strokeWidth={2}
                            />
                          )}
                          <Text
                            style={[
                              styles.variacaoTexto,
                              {
                                color:
                                  variacao.diff > 0
                                    ? '#e8607a'
                                    : variacao.diff < 0
                                      ? '#4a7a4a'
                                      : 'rgba(122,48,64,0.4)',
                              },
                            ]}
                          >
                            {variacao.texto}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight
                      size={16}
                      color="rgba(122,48,64,0.3)"
                      strokeWidth={2}
                      style={{ marginLeft: 8 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* modal histórico do item */}
      <Modal visible={!!itemAberto} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[
              'rgba(253,246,240,1)',
              'rgba(252,220,228,0.95)',
              'rgba(230,235,255,0.9)',
              'rgba(255,248,220,0.85)',
              'rgba(232,220,255,0.9)',
              'rgba(253,246,240,1)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{itemAberto?.nome}</Text>
              <TouchableOpacity onPress={() => setItemAberto(null)}>
                <X size={20} color="#c8607a" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {itemAberto?.registros.map((r, idx) => {
                const prox = itemAberto.registros[idx + 1];
                const variacao = prox
                  ? variacaoTexto(r.valor, prox.valor)
                  : null;
                return (
                  <View key={r.id} style={styles.registroLinha}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.registroData}>
                        {isoParaDisplay(r.data)}
                      </Text>
                      {variacao && (
                        <View
                          style={[
                            styles.variacaoBadge,
                            {
                              backgroundColor:
                                variacao.diff > 0
                                  ? 'rgba(232,96,122,0.1)'
                                  : variacao.diff < 0
                                    ? 'rgba(74,122,74,0.1)'
                                    : 'rgba(122,48,64,0.08)',
                              alignSelf: 'flex-start',
                              marginTop: 2,
                            },
                          ]}
                        >
                          {variacao.diff > 0 ? (
                            <TrendingUp
                              size={11}
                              color="#e8607a"
                              strokeWidth={2}
                            />
                          ) : variacao.diff < 0 ? (
                            <TrendingDown
                              size={11}
                              color="#4a7a4a"
                              strokeWidth={2}
                            />
                          ) : (
                            <Minus
                              size={11}
                              color="rgba(122,48,64,0.4)"
                              strokeWidth={2}
                            />
                          )}
                          <Text
                            style={[
                              styles.variacaoTexto,
                              {
                                color:
                                  variacao.diff > 0
                                    ? '#e8607a'
                                    : variacao.diff < 0
                                      ? '#4a7a4a'
                                      : 'rgba(122,48,64,0.4)',
                              },
                            ]}
                          >
                            {variacao.texto}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.registroValor}>
                      R$ {r.valor.toFixed(2).replace('.', ',')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRegistroParaDeletar(r);
                        setDeletarModal(true);
                      }}
                      style={styles.btnDeletar}
                    >
                      <Trash2
                        size={15}
                        color="rgba(232,96,122,0.5)"
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      {/* modal adicionar */}
      <Modal visible={modalAdd} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={[
                'rgba(253,246,240,1)',
                'rgba(252,220,228,0.95)',
                'rgba(230,235,255,0.9)',
                'rgba(255,248,220,0.85)',
                'rgba(232,220,255,0.9)',
                'rgba(253,246,240,1)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>novo registro</Text>
                <TouchableOpacity onPress={() => setModalAdd(false)}>
                  <X size={20} color="#c8607a" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* nome */}
              <Text style={styles.label}>item</Text>
              <View style={{ position: 'relative', zIndex: 10 }}>
                <TextInput
                  style={[styles.input, erros.nome ? styles.inputErro : null]}
                  placeholder="ex: arroz 5kg"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  value={nome}
                  onChangeText={handleNome}
                  underlineColorAndroid="transparent"
                />
                {mostrarSugestoes && (
                  <View style={styles.sugestoesList}>
                    {sugestoes.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => selecionarSugestao(s)}
                        style={styles.sugestaoItem}
                      >
                        <Text style={styles.sugestaoTexto}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              {erros.nome ? (
                <Text style={styles.erro}>{erros.nome}</Text>
              ) : null}

              {/* valor */}
              <Text style={[styles.label, { marginTop: 14 }]}>valor (R$)</Text>
              <TextInput
                style={[styles.input, erros.valor ? styles.inputErro : null]}
                placeholder="0,00"
                placeholderTextColor="rgba(122,48,64,0.35)"
                value={valor}
                onChangeText={setValor}
                keyboardType="decimal-pad"
                underlineColorAndroid="transparent"
              />
              {erros.valor ? (
                <Text style={styles.erro}>{erros.valor}</Text>
              ) : null}

              {/* data */}
              <Text style={[styles.label, { marginTop: 14 }]}>data</Text>
              <TextInput
                style={[styles.input, erros.data ? styles.inputErro : null]}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="rgba(122,48,64,0.35)"
                value={data}
                onChangeText={(t) => setData(mascararData(t))}
                keyboardType="numeric"
                underlineColorAndroid="transparent"
              />
              {erros.data ? (
                <Text style={styles.erro}>{erros.data}</Text>
              ) : null}

              <LinearGradient
                colors={[
                  'rgba(252,200,220,0.9)',
                  'rgba(210,200,255,0.85)',
                  'rgba(252,220,200,0.9)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.botaoGradiente, { marginTop: 20 }]}
              >
                <TouchableOpacity
                  onPress={salvar}
                  style={styles.botao}
                  disabled={salvando}
                >
                  <Text style={styles.botaoTexto}>
                    {salvando ? 'salvando...' : 'salvar'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ModalConfirmar
        visivel={deletarModal}
        titulo="excluir registro?"
        mensagem="esse registro será removido permanentemente."
        botaoTexto="excluir"
        destrutivo
        onConfirmar={deletarRegistro}
        onCancelar={() => {
          setDeletarModal(false);
          setRegistroParaDeletar(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  btnVoltar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAdd: {
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
  filtroWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253,242,246,0.7)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  filtroInput: {
    flex: 1,
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: '#3d1a10',
  },
  vazio: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.45)',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  cardNome: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
  cardData: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
    marginTop: 2,
  },
  cardValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 16,
    color: '#3d1a10',
  },
  variacaoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  variacaoTexto: { fontFamily: 'Baloo2_600SemiBold', fontSize: 11 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30,10,20,0.45)',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 24,
    backgroundColor: 'rgba(253,246,240,0.98)',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 18,
    color: '#3d1a10',
  },
  registroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,160,176,0.2)',
    borderStyle: 'dashed',
  },
  registroData: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  registroValor: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
    marginRight: 12,
  },
  btnDeletar: { padding: 4 },
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
  },
  inputErro: { borderColor: 'rgba(232,96,122,0.5)' },
  erro: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: '#e8607a',
    marginTop: 4,
  },
  sugestoesList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(253,246,240,0.98)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.3)',
    zIndex: 999,
    elevation: 10,
  },
  sugestaoItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,160,176,0.15)',
  },
  sugestaoTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: '#3d1a10',
  },
  botaoGradiente: { borderRadius: 12 },
  botao: { paddingVertical: 13, alignItems: 'center' },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
});
