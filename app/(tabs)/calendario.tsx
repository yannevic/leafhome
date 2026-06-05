import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Repeat,
  Wrench,
  CalendarDays,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const CORES_OPCOES = [
  '#c8607a',
  '#e8a87c',
  '#7cb9e8',
  '#7ce8a8',
  '#a87ce8',
  '#e8e87c',
  '#e87ca8',
  '#7ce8e8',
];

const DURACOES = [
  { label: '3 meses', meses: 3 },
  { label: '6 meses', meses: 6 },
  { label: '1 ano', meses: 12 },
  { label: '2 anos', meses: 24 },
  { label: 'sempre', meses: null },
];

type Evento = {
  id: string;
  spaceId: string;
  criadoPor: string;
  tipo: 'evento' | 'pagamento' | 'manutencao';
  titulo: string;
  descricao?: string;
  data: string;
  hora?: string;
  cor?: string;
  recorrente?: boolean;
  duracaoMeses?: number | null;
  diaDoMes?: number;
  custo?: number;
  proximaData?: string;
};

export default function Calendario() {
  const insets = useSafeAreaInsets();
  const uid = auth.currentUser!.uid;

  const hoje = new Date();
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [espacoId, setEspacoId] = useState('');
  const [modalNavegar, setModalNavegar] = useState(false);
  const [anoTemp, setAnoTemp] = useState(anoAtual);

  const [modalDia, setModalDia] = useState(false);
  const [modalCriar, setModalCriar] = useState(false);

  // form
  const [tipo, setTipo] = useState<'evento' | 'pagamento' | 'manutencao'>(
    'evento'
  );
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [hora, setHora] = useState('');
  const [cor, setCor] = useState(CORES_OPCOES[0]);
  const [duracaoMeses, setDuracaoMeses] = useState<number | null>(12);
  const [custo, setCusto] = useState('');
  const [proximaData, setProximaData] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    const userSnap = await getDoc(doc(db, 'users', uid));
    const eId = userSnap.data()?.espacoAtivo ?? '';
    setEspacoId(eId);
    if (eId) {
      const snap = await getDocs(
        query(collection(db, 'calendar_events'), where('spaceId', '==', eId))
      );
      const lista: Evento[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Evento
      );
      setEventos(lista);
    }
    setCarregando(false);
  }

  // gera todos os dias do mês atual incluindo padding
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const dias: (number | null)[] = [];
    for (let i = 0; i < primeiroDia; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(i);
    return dias;
  }, [anoAtual, mesAtual]);

  // mapeia data → cores dos eventos daquele dia
  const eventosPorDia = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    eventos.forEach((e) => {
      if (!mapa[e.data]) mapa[e.data] = [];
      mapa[e.data].push(e.cor ?? '#c8607a');
    });
    // pagamentos recorrentes — expandir pelas datas
    eventos
      .filter((e) => e.tipo === 'pagamento' && e.recorrente)
      .forEach((e) => {
        const base = new Date(e.data);
        const maxMeses = e.duracaoMeses ?? 240;
        for (let m = 1; m <= maxMeses; m++) {
          const d = new Date(
            base.getFullYear(),
            base.getMonth() + m,
            base.getDate()
          );
          const key = d.toISOString().split('T')[0];
          if (!mapa[key]) mapa[key] = [];
          mapa[key].push(e.cor ?? '#c8607a');
        }
      });
    return mapa;
  }, [eventos]);

  function dataStr(dia: number) {
    const m = String(mesAtual + 1).padStart(2, '0');
    const d = String(dia).padStart(2, '0');
    return `${anoAtual}-${m}-${d}`;
  }

  function eventosNoDia(data: string) {
    return eventos.filter((e) => {
      if (e.data === data) return true;
      if (e.tipo === 'pagamento' && e.recorrente) {
        const base = new Date(e.data);
        const alvo = new Date(data);
        const diffMeses =
          (alvo.getFullYear() - base.getFullYear()) * 12 +
          (alvo.getMonth() - base.getMonth());
        if (diffMeses <= 0) return false;
        if (e.duracaoMeses != null && diffMeses > e.duracaoMeses) return false;
        return base.getDate() === alvo.getDate();
      }
      return false;
    });
  }

  function abrirDia(dia: number) {
    setDiaSelecionado(dataStr(dia));
    setModalDia(true);
  }

  function abrirCriar() {
    setTipo('evento');
    setTitulo('');
    setDescricao('');
    setHora('');
    setCor(CORES_OPCOES[0]);
    setDuracaoMeses(12);
    setCusto('');
    setProximaData('');
    setModalCriar(true);
  }

  async function salvarEvento() {
    if (!titulo.trim()) return;
    setSalvando(true);
    await addDoc(collection(db, 'calendar_events'), {
      spaceId: espacoId,
      criadoPor: uid,
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data: diaSelecionado!,
      hora: hora.trim(),
      cor: tipo === 'pagamento' ? cor : '#c8607a',
      recorrente: tipo === 'pagamento',
      duracaoMeses: tipo === 'pagamento' ? duracaoMeses : null,
      diaDoMes:
        tipo === 'pagamento' ? new Date(diaSelecionado!).getDate() : null,
      custo: tipo === 'manutencao' ? parseFloat(custo) || 0 : null,
      proximaData: tipo === 'manutencao' ? proximaData.trim() : null,
    });
    await carregarDados();
    setSalvando(false);
    setModalCriar(false);
  }

  async function excluirEvento(id: string) {
    await deleteDoc(doc(db, 'calendar_events', id));
    setEventos((prev) => prev.filter((e) => e.id !== id));
  }

  function mascaraHora(txt: string) {
    const nums = txt.replace(/\D/g, '').slice(0, 4);
    if (nums.length <= 2) return nums;
    return nums.slice(0, 2) + ':' + nums.slice(2);
  }

  function mascaraData(txt: string) {
    const nums = txt.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return nums.slice(0, 2) + '/' + nums.slice(2);
    return nums.slice(0, 2) + '/' + nums.slice(2, 4) + '/' + nums.slice(4);
  }

  const nomeMes = new Date(anoAtual, mesAtual).toLocaleString('pt-BR', {
    month: 'long',
  });

  function avancarMes() {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual((a) => a + 1);
    } else setMesAtual((m) => m + 1);
  }

  function voltarMes() {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual((a) => a - 1);
    } else setMesAtual((m) => m - 1);
  }

  const eventosDia = diaSelecionado ? eventosNoDia(diaSelecionado) : [];

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
          contentContainerStyle={[
            styles.fundo,
            { paddingBottom: 32 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* header mês */}
          <View style={styles.headerMes}>
            <TouchableOpacity onPress={voltarMes} style={styles.navBtn}>
              <ChevronLeft size={20} color="#c8607a" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setAnoTemp(anoAtual);
                setModalNavegar(true);
              }}
            >
              <Text style={styles.tituloMes}>
                {nomeMes} {anoAtual}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={avancarMes} style={styles.navBtn}>
              <ChevronRight size={20} color="#c8607a" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* card calendário */}
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
            {/* dias da semana */}
            <View style={styles.semanaRow}>
              {DIAS_SEMANA.map((d) => (
                <Text key={d} style={styles.diaSemana}>
                  {d}
                </Text>
              ))}
            </View>

            {/* grade de dias */}
            <View style={styles.grade}>
              {diasDoMes.map((dia, i) => {
                if (!dia)
                  return <View key={`empty-${i}`} style={styles.diaCell} />;
                const ds = dataStr(dia);
                const cores = eventosPorDia[ds] ?? [];
                const isHoje = ds === hoje.toISOString().split('T')[0];
                const isSel = ds === diaSelecionado;
                return (
                  <TouchableOpacity
                    key={ds}
                    style={[
                      styles.diaCell,
                      isHoje && styles.diaCellHoje,
                      isSel && styles.diaCellSel,
                    ]}
                    onPress={() => abrirDia(dia)}
                  >
                    <Text
                      style={[
                        styles.diaNum,
                        isHoje && styles.diaNumHoje,
                        isSel && styles.diaNumSel,
                      ]}
                    >
                      {dia}
                    </Text>
                    <View style={styles.bolinhasRow}>
                      {cores.slice(0, 3).map((c, ci) => (
                        <View
                          key={ci}
                          style={[styles.bolinha, { backgroundColor: c }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>

          {/* lista próximos eventos */}
          <Text style={styles.labelSecao}>próximos eventos</Text>
          {eventos.length === 0 ? (
            <Text style={styles.vazio}>nenhum evento ainda</Text>
          ) : (
            eventos
              .filter((e) => e.data >= hoje.toISOString().split('T')[0])
              .sort((a, b) => a.data.localeCompare(b.data))
              .slice(0, 5)
              .map((e) => (
                <LinearGradient
                  key={e.id}
                  colors={[
                    'rgba(253,246,240,1)',
                    'rgba(252,220,228,0.9)',
                    'rgba(230,235,255,0.8)',
                    'rgba(253,246,240,1)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eventoCard}
                >
                  <View
                    style={[
                      styles.eventoCor,
                      { backgroundColor: e.cor ?? '#c8607a' },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventoTitulo}>{e.titulo}</Text>
                    <Text style={styles.eventoData}>
                      {e.data}
                      {e.hora ? ` · ${e.hora}` : ''}
                    </Text>
                  </View>
                  {e.tipo === 'pagamento' && (
                    <Repeat
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                  {e.tipo === 'manutencao' && (
                    <Wrench
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                  {e.tipo === 'evento' && (
                    <CalendarDays
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                </LinearGradient>
              ))
          )}
        </ScrollView>
      </LinearGradient>

      {/* modal navegar mês/ano */}
      <Modal visible={modalNavegar} transparent animationType="fade">
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
            style={[styles.modalCard, { maxHeight: '70%' }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>ir para</Text>
              <TouchableOpacity onPress={() => setModalNavegar(false)}>
                <X size={18} color="rgba(122,48,64,0.55)" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* seletor ano */}
            <View style={styles.anoRow}>
              <TouchableOpacity
                onPress={() => setAnoTemp((a) => a - 1)}
                style={styles.navBtn}
              >
                <ChevronLeft size={18} color="#c8607a" strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.anoTexto}>{anoTemp}</Text>
              <TouchableOpacity
                onPress={() => setAnoTemp((a) => a + 1)}
                style={styles.navBtn}
              >
                <ChevronRight size={18} color="#c8607a" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* grade de meses */}
            <View style={styles.mesesGrade}>
              {Array.from({ length: 12 }, (_, i) => {
                const nomeMesOpcao = new Date(anoTemp, i)
                  .toLocaleString('pt-BR', { month: 'short' })
                  .replace('.', '');
                const isAtivo = i === mesAtual && anoTemp === anoAtual;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.mesOpcao, isAtivo && styles.mesOpcaoAtiva]}
                    onPress={() => {
                      setMesAtual(i);
                      setAnoAtual(anoTemp);
                      setModalNavegar(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.mesOpcaoTexto,
                        isAtivo && styles.mesOpcaoTextoAtivo,
                      ]}
                    >
                      {nomeMesOpcao}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* modal dia */}
      <Modal visible={modalDia} transparent animationType="slide">
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{diaSelecionado}</Text>
              <TouchableOpacity onPress={() => setModalDia(false)}>
                <X size={18} color="rgba(122,48,64,0.55)" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {eventosDia.length === 0 ? (
              <Text style={styles.vazio}>nenhum evento neste dia</Text>
            ) : (
              eventosDia.map((e) => (
                <View key={e.id} style={styles.eventoItemRow}>
                  <View
                    style={[
                      styles.eventoCor,
                      { backgroundColor: e.cor ?? '#c8607a' },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventoTitulo}>{e.titulo}</Text>
                    {e.hora ? (
                      <Text style={styles.eventoData}>{e.hora}</Text>
                    ) : null}
                    {e.descricao ? (
                      <Text style={styles.eventoData}>{e.descricao}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => excluirEvento(e.id)}
                    style={{ padding: 4 }}
                  >
                    <X size={14} color="#e8607a" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.botaoNovo}
              onPress={() => {
                setModalDia(false);
                abrirCriar();
              }}
            >
              <Plus size={14} color="#3d1a10" strokeWidth={2} />
              <Text style={styles.botaoNovoTexto}>novo evento</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* modal criar evento */}
      <Modal visible={modalCriar} transparent animationType="slide">
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
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitulo}>novo evento</Text>

                {/* seletor tipo */}
                <View style={styles.tipoRow}>
                  {(['evento', 'pagamento', 'manutencao'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tipoBotao,
                        tipo === t && styles.tipoBotaoAtivo,
                      ]}
                      onPress={() => setTipo(t)}
                    >
                      <Text
                        style={[
                          styles.tipoTexto,
                          tipo === t && styles.tipoTextoAtivo,
                        ]}
                      >
                        {t === 'evento'
                          ? 'evento'
                          : t === 'pagamento'
                            ? 'pagamento'
                            : 'manutenção'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>título</Text>
                <TextInput
                  style={styles.input}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="nome do evento"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.label}>hora</Text>
                <TextInput
                  style={styles.input}
                  value={hora}
                  onChangeText={(t) => setHora(mascaraHora(t))}
                  placeholder="hh:mm"
                  placeholderTextColor="rgba(122,48,64,0.35)"
                  keyboardType="numeric"
                  maxLength={5}
                  underlineColorAndroid="transparent"
                />

                {tipo !== 'pagamento' && (
                  <>
                    <Text style={styles.label}>descrição</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { height: 72, textAlignVertical: 'top' },
                      ]}
                      value={descricao}
                      onChangeText={setDescricao}
                      placeholder="detalhes opcionais"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      multiline
                      underlineColorAndroid="transparent"
                    />
                  </>
                )}

                {tipo === 'pagamento' && (
                  <>
                    <Text style={styles.label}>cor</Text>
                    <View style={styles.coresRow}>
                      {CORES_OPCOES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.corOpcao,
                            { backgroundColor: c },
                            cor === c && styles.corOpcaoAtiva,
                          ]}
                          onPress={() => setCor(c)}
                        />
                      ))}
                    </View>

                    <Text style={styles.label}>duração</Text>
                    <View style={styles.duracaoRow}>
                      {DURACOES.map((d) => (
                        <TouchableOpacity
                          key={d.label}
                          style={[
                            styles.duracaoBotao,
                            duracaoMeses === d.meses &&
                              styles.duracaoBotaoAtivo,
                          ]}
                          onPress={() => setDuracaoMeses(d.meses)}
                        >
                          <Text
                            style={[
                              styles.duracaoTexto,
                              duracaoMeses === d.meses &&
                                styles.duracaoTextoAtivo,
                            ]}
                          >
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {tipo === 'manutencao' && (
                  <>
                    <Text style={styles.label}>custo (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={custo}
                      onChangeText={setCusto}
                      placeholder="0,00"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      keyboardType="numeric"
                      underlineColorAndroid="transparent"
                    />

                    <Text style={styles.label}>próxima manutenção</Text>
                    <TextInput
                      style={styles.input}
                      value={proximaData}
                      onChangeText={(t) => setProximaData(mascaraData(t))}
                      placeholder="dd/mm/aaaa"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      keyboardType="numeric"
                      maxLength={10}
                      underlineColorAndroid="transparent"
                    />
                  </>
                )}

                <TouchableOpacity
                  style={styles.botao}
                  onPress={salvarEvento}
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
                  onPress={() => setModalCriar(false)}
                >
                  <Text style={styles.botaoCancelarTexto}>cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: {
    padding: 24,
    paddingTop: 48,
  },
  headerMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
    backgroundColor: 'rgba(232,160,176,0.2)',
    borderRadius: 10,
  },
  tituloMes: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 20,
    color: '#3d1a10',
    textTransform: 'capitalize',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 24,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  semanaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  diaCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 2,
  },
  diaCellHoje: {
    backgroundColor: 'rgba(232,160,176,0.2)',
  },
  diaCellSel: {
    backgroundColor: 'rgba(200,96,122,0.15)',
  },
  diaNum: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  diaNumHoje: {
    color: '#c8607a',
    fontFamily: 'Baloo2_800ExtraBold',
  },
  diaNumSel: {
    color: '#c8607a',
  },
  bolinhasRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  bolinha: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  labelSecao: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  vazio: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.4)',
    textAlign: 'center',
    marginVertical: 16,
  },
  eventoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 12,
    marginBottom: 8,
  },
  eventoCor: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  eventoTitulo: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  eventoData: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.55)',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 18,
    color: '#3d1a10',
  },
  eventoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,160,176,0.2)',
    borderStyle: 'dashed',
  },
  botaoNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(232,160,176,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  botaoNovoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 13,
    color: '#3d1a10',
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tipoBotao: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(232,160,176,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.2)',
  },
  tipoBotaoAtivo: {
    backgroundColor: 'rgba(200,96,122,0.15)',
    borderColor: '#c8607a',
  },
  tipoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 11,
    color: 'rgba(122,48,64,0.55)',
  },
  tipoTextoAtivo: {
    color: '#c8607a',
    fontFamily: 'Baloo2_800ExtraBold',
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
  coresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  corOpcao: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corOpcaoAtiva: {
    borderColor: '#3d1a10',
    transform: [{ scale: 1.15 }],
  },
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
  duracaoTextoAtivo: {
    color: '#c8607a',
    fontFamily: 'Baloo2_800ExtraBold',
  },
  botao: {
    backgroundColor: 'rgba(232,160,176,0.55)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
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
  anoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
  },
  anoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 22,
    color: '#3d1a10',
    minWidth: 60,
    textAlign: 'center',
  },
  mesesGrade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  mesOpcao: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(232,160,176,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.2)',
  },
  mesOpcaoAtiva: {
    backgroundColor: 'rgba(200,96,122,0.15)',
    borderColor: '#c8607a',
  },
  mesOpcaoTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'capitalize',
  },
  mesOpcaoTextoAtivo: {
    color: '#c8607a',
    fontFamily: 'Baloo2_800ExtraBold',
  },
});
