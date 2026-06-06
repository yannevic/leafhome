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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Repeat,
  Wrench,
  CalendarDays,
  Check,
  Clock,
  AlertCircle,
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
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import ModalConfirmar from '../../components/ModalConfirmar';

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

const RECORRENCIAS = [
  { label: 'mensal', meses: 1 },
  { label: 'bimestral', meses: 2 },
  { label: 'trimestral', meses: 3 },
  { label: 'semestral', meses: 6 },
  { label: 'anual', meses: 12 },
];

type Evento = {
  id: string;
  spaceId: string;
  criadoPor: string;
  tipo: 'evento' | 'pagamento' | 'manutencao';
  titulo: string;
  descricao?: string;
  data: string; // YYYY-MM-DD
  hora?: string;
  cor?: string;
  recorrente?: boolean;
  duracaoMeses?: number | null;
  intervaloMeses?: number; // novo: intervalo entre ocorrências
  diaDoMes?: number;
  custo?: number;
  proximaData?: string;
  categoriaId?: string; // para integração com finanças
};

type Confirmacao = {
  id: string;
  spaceId: string;
  eventoId: string;
  dataOriginal: string; // YYYY-MM-DD
  dataConfirmada: string; // YYYY-MM-DD
  valor: number;
  userId: string;
  criadoEm: Timestamp;
};

// helpers de data
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoParaExib(s: string) {
  if (!s) return '';
  const [ano, mes, dia] = s.split('-');
  return `${dia}/${mes}/${ano}`;
}

function exibParaISO(s: string) {
  const [dia, mes, ano] = s.split('/');
  if (!dia || !mes || !ano || ano.length < 4) return '';
  return `${ano}-${mes}-${dia}`;
}

function mascaraData(txt: string) {
  const nums = txt.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return nums.slice(0, 2) + '/' + nums.slice(2);
  return nums.slice(0, 2) + '/' + nums.slice(2, 4) + '/' + nums.slice(4);
}

function mascaraHora(txt: string) {
  const nums = txt.replace(/\D/g, '').slice(0, 4);
  if (nums.length <= 2) return nums;
  return nums.slice(0, 2) + ':' + nums.slice(2);
}

function dataValida(s: string) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

export default function Calendario() {
  const insets = useSafeAreaInsets();
  const uid = auth.currentUser!.uid;
  const hoje = new Date();

  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [categorias, setCategorias] = useState<
    { id: string; nome: string; icone: string; cor: string }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [espacoId, setEspacoId] = useState('');
  const [modalNavegar, setModalNavegar] = useState(false);
  const [anoTemp, setAnoTemp] = useState(anoAtual);

  const [modalDia, setModalDia] = useState(false);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<string | null>(
    null
  );
  const [eventoParaConfirmar, setEventoParaConfirmar] = useState<Evento | null>(
    null
  );
  const [ocorrenciaParaConfirmar, setOcorrenciaParaConfirmar] = useState<
    string | null
  >(null);

  // form criar
  const [tipo, setTipo] = useState<'evento' | 'pagamento' | 'manutencao'>(
    'evento'
  );
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [hora, setHora] = useState('');
  const [cor, setCor] = useState(CORES_OPCOES[0]);
  const [duracaoMeses, setDuracaoMeses] = useState<number | null>(12);
  const [intervaloMeses, setIntervaloMeses] = useState(1);
  const [custo, setCusto] = useState('');
  const [proximaData, setProximaData] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');

  // form confirmar
  const [dataConfirmadaExib, setDataConfirmadaExib] = useState('');
  const [valorConfirmado, setValorConfirmado] = useState('');
  const [salvandoConf, setSalvandoConf] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      const eId = snap.data()?.espacoAtivo ?? '';
      setEspacoId(eId);
      if (!eId) {
        setCarregando(false);
        return;
      }

      const unsubEv = onSnapshot(
        query(collection(db, 'calendar_events'), where('spaceId', '==', eId)),
        (snap) => {
          setEventos(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evento)
          );
          setCarregando(false);
        }
      );
      const unsubConf = onSnapshot(
        query(
          collection(db, 'payment_confirmations'),
          where('spaceId', '==', eId)
        ),
        (snap) =>
          setConfirmacoes(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Confirmacao)
          )
      );
      const unsubCats = onSnapshot(
        query(collection(db, 'categories'), where('spaceId', '==', eId)),
        (snap) =>
          setCategorias(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)
          )
      );
      return () => {
        unsubEv();
        unsubConf();
        unsubCats();
      };
    });
  }, [uid]);

  // gera ocorrências de um evento recorrente dentro de um range
  function gerarOcorrencias(
    ev: Evento,
    dataInicio: string,
    dataFim: string
  ): string[] {
    if (!ev.recorrente)
      return ev.data >= dataInicio && ev.data <= dataFim ? [ev.data] : [];
    const resultado: string[] = [];
    const base = new Date(ev.data + 'T00:00:00');
    const intervalo = ev.intervaloMeses ?? 1;
    const maxMeses = ev.duracaoMeses ?? 240;
    // inclui data base
    if (ev.data >= dataInicio && ev.data <= dataFim) resultado.push(ev.data);
    for (let m = intervalo; m <= maxMeses; m += intervalo) {
      const d = new Date(
        base.getFullYear(),
        base.getMonth() + m,
        base.getDate()
      );
      const s = toISO(d);
      if (s > dataFim) break;
      if (s >= dataInicio) resultado.push(s);
    }
    return resultado;
  }

  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const dias: (number | null)[] = [];
    for (let i = 0; i < primeiroDia; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(i);
    return dias;
  }, [anoAtual, mesAtual]);

  const inicioMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`;
  const fimMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(new Date(anoAtual, mesAtual + 1, 0).getDate()).padStart(2, '0')}`;

  // mapa dia → { cores, temPendente, temConfirmado }
  const infosPorDia = useMemo(() => {
    const mapa: Record<
      string,
      { cores: string[]; pendente: boolean; confirmado: boolean }
    > = {};

    eventos.forEach((ev) => {
      const ocs = gerarOcorrencias(ev, inicioMes, fimMes);
      ocs.forEach((data) => {
        if (!mapa[data])
          mapa[data] = { cores: [], pendente: false, confirmado: false };
        if (ev.cor && !mapa[data].cores.includes(ev.cor))
          mapa[data].cores.push(ev.cor);

        if (ev.tipo === 'pagamento' || ev.tipo === 'manutencao') {
          const confirmado = confirmacoes.some(
            (c) => c.eventoId === ev.id && c.dataOriginal === data
          );
          if (confirmado) {
            mapa[data].confirmado = true;
          } else if (data <= toISO(hoje)) {
            mapa[data].pendente = true;
          }
        }
      });
    });
    return mapa;
  }, [eventos, confirmacoes, inicioMes, fimMes]);

  function dataStr(dia: number) {
    return `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  function eventosNoDia(data: string): { ev: Evento; ocorrencia: string }[] {
    const result: { ev: Evento; ocorrencia: string }[] = [];
    eventos.forEach((ev) => {
      const ocs = gerarOcorrencias(ev, data, data);
      if (ocs.includes(data)) result.push({ ev, ocorrencia: data });
    });
    return result;
  }

  function isConfirmado(eventoId: string, data: string) {
    return confirmacoes.some(
      (c) => c.eventoId === eventoId && c.dataOriginal === data
    );
  }

  function isPendente(ev: Evento, data: string) {
    if (ev.tipo !== 'pagamento' && ev.tipo !== 'manutencao') return false;
    return !isConfirmado(ev.id, data) && data <= toISO(hoje);
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
    setIntervaloMeses(1);
    setCusto('');
    setProximaData('');
    setCategoriaId(categorias[0]?.id ?? '');
    setModalCriar(true);
  }

  async function salvarEvento() {
    if (!titulo.trim() || !diaSelecionado) return;
    setSalvando(true);
    await addDoc(collection(db, 'calendar_events'), {
      spaceId: espacoId,
      criadoPor: uid,
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data: diaSelecionado,
      hora: hora.trim(),
      cor: tipo === 'pagamento' || tipo === 'manutencao' ? cor : '#c8607a',
      recorrente: tipo === 'pagamento' || tipo === 'manutencao',
      duracaoMeses:
        tipo === 'pagamento' || tipo === 'manutencao' ? duracaoMeses : null,
      intervaloMeses:
        tipo === 'pagamento' || tipo === 'manutencao' ? intervaloMeses : null,
      diaDoMes:
        tipo === 'pagamento' || tipo === 'manutencao'
          ? new Date(diaSelecionado).getDate()
          : null,
      custo:
        tipo === 'pagamento' || tipo === 'manutencao'
          ? parseFloat(custo) || 0
          : null,
      proximaData:
        tipo === 'manutencao'
          ? proximaData
            ? exibParaISO(proximaData)
            : null
          : null,
      categoriaId:
        tipo === 'pagamento' || tipo === 'manutencao' ? categoriaId : null,
    });
    setSalvando(false);
    setModalCriar(false);
  }

  function abrirConfirmar(ev: Evento, ocorrencia: string) {
    setEventoParaConfirmar(ev);
    setOcorrenciaParaConfirmar(ocorrencia);
    setDataConfirmadaExib(isoParaExib(ocorrencia));
    setValorConfirmado(ev.custo ? String(ev.custo) : '');
    setModalConfirmar(true);
  }

  async function salvarConfirmacao() {
    if (!eventoParaConfirmar || !ocorrenciaParaConfirmar) return;
    if (!dataValida(dataConfirmadaExib)) return;
    setSalvandoConf(true);
    const dataConf = exibParaISO(dataConfirmadaExib);
    const valor = parseFloat(valorConfirmado.replace(',', '.')) || 0;

    // salva confirmação
    await addDoc(collection(db, 'payment_confirmations'), {
      spaceId: espacoId,
      eventoId: eventoParaConfirmar.id,
      dataOriginal: ocorrenciaParaConfirmar,
      dataConfirmada: dataConf,
      valor,
      userId: uid,
      criadoEm: Timestamp.now(),
    });

    // lança nas finanças se tiver categoria
    if (eventoParaConfirmar.categoriaId && valor > 0) {
      await addDoc(collection(db, 'transactions'), {
        spaceId: espacoId,
        userId: uid,
        categoriaId: eventoParaConfirmar.categoriaId,
        descricao: eventoParaConfirmar.titulo.toLowerCase(),
        valor,
        data: dataConf,
        criadoEm: Timestamp.now(),
        origem: 'calendario',
      });
    }

    setSalvandoConf(false);
    setModalConfirmar(false);
    setEventoParaConfirmar(null);
    setOcorrenciaParaConfirmar(null);
  }

  async function excluirEvento(id: string) {
    await deleteDoc(doc(db, 'calendar_events', id));
    setEventoParaExcluir(null);
    setModalExcluir(false);
    setModalDia(false);
  }

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

  const nomeMes = new Date(anoAtual, mesAtual).toLocaleString('pt-BR', {
    month: 'long',
  });
  const eventosDia = diaSelecionado ? eventosNoDia(diaSelecionado) : [];

  // próximos eventos (todos os tipos, próximos 60 dias)
  const hojeISO = toISO(hoje);
  const limite = toISO(
    new Date(hoje.getFullYear(), hoje.getMonth() + 2, hoje.getDate())
  );
  const proximosEventos = useMemo(() => {
    const lista: { ev: Evento; data: string }[] = [];
    eventos.forEach((ev) => {
      const ocs = gerarOcorrencias(ev, hojeISO, limite);
      ocs.forEach((d) => lista.push({ ev, data: d }));
    });
    return lista.sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8);
  }, [eventos, hojeISO, limite]);

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
            { paddingTop: insets.top + 16, paddingBottom: 32 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.tituloPagina}>calendário</Text>
          </View>

          {/* nav mês */}
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

          {/* grade */}
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
            <View style={styles.semanaRow}>
              {DIAS_SEMANA.map((d) => (
                <Text key={d} style={styles.diaSemana}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grade}>
              {diasDoMes.map((dia, i) => {
                if (!dia)
                  return <View key={`empty-${i}`} style={styles.diaCell} />;
                const ds = dataStr(dia);
                const info = infosPorDia[ds];
                const isHoje = ds === hojeISO;
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
                    {info && (
                      <View style={styles.bolinhasRow}>
                        {info.pendente && (
                          <View
                            style={[
                              styles.bolinha,
                              { backgroundColor: '#e8607a' },
                            ]}
                          />
                        )}
                        {info.confirmado && (
                          <View
                            style={[
                              styles.bolinha,
                              { backgroundColor: '#6ab89a' },
                            ]}
                          />
                        )}
                        {info.cores.slice(0, 2).map((c, ci) => (
                          <View
                            key={ci}
                            style={[styles.bolinha, { backgroundColor: c }]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>

          {/* legenda */}
          <View style={styles.legendaRow}>
            <View style={styles.legendaItem}>
              <View style={[styles.bolinha, { backgroundColor: '#e8607a' }]} />
              <Text style={styles.legendaTexto}>pendente</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.bolinha, { backgroundColor: '#6ab89a' }]} />
              <Text style={styles.legendaTexto}>confirmado</Text>
            </View>
          </View>

          {/* próximos eventos */}
          <Text style={styles.labelSecao}>próximos eventos</Text>
          {proximosEventos.length === 0 ? (
            <Text style={styles.vazio}>nenhum evento nos próximos dias</Text>
          ) : (
            proximosEventos.map(({ ev, data }) => {
              const conf = isConfirmado(ev.id, data);
              const pend = isPendente(ev, data);
              return (
                <LinearGradient
                  key={`${ev.id}-${data}`}
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
                      { backgroundColor: ev.cor ?? '#c8607a' },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventoTitulo}>{ev.titulo}</Text>
                    <Text style={styles.eventoData}>
                      {isoParaExib(data)}
                      {ev.hora ? ` · ${ev.hora}` : ''}
                    </Text>
                  </View>
                  {conf && (
                    <View style={styles.badgeConf}>
                      <Check size={11} color="#6ab89a" strokeWidth={2.5} />
                    </View>
                  )}
                  {pend && (
                    <View style={styles.badgePend}>
                      <AlertCircle size={11} color="#e8607a" strokeWidth={2} />
                    </View>
                  )}
                  {ev.tipo === 'pagamento' && (
                    <Repeat
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                  {ev.tipo === 'manutencao' && (
                    <Wrench
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                  {ev.tipo === 'evento' && (
                    <CalendarDays
                      size={13}
                      color="rgba(122,48,64,0.4)"
                      strokeWidth={2}
                    />
                  )}
                </LinearGradient>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>

      {/* modal navegar */}
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
            <View style={styles.mesesGrade}>
              {Array.from({ length: 12 }, (_, i) => {
                const nome = new Date(anoTemp, i)
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
                      {nome}
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
              <Text style={styles.modalTitulo}>
                {diaSelecionado ? isoParaExib(diaSelecionado) : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalDia(false)}>
                <X size={18} color="rgba(122,48,64,0.55)" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 340 }}
            >
              {eventosDia.length === 0 ? (
                <Text style={styles.vazio}>nenhum evento neste dia</Text>
              ) : (
                eventosDia.map(({ ev, ocorrencia }) => {
                  const conf = isConfirmado(ev.id, ocorrencia);
                  const pend = isPendente(ev, ocorrencia);
                  return (
                    <View
                      key={`${ev.id}-${ocorrencia}`}
                      style={styles.eventoItemRow}
                    >
                      <View
                        style={[
                          styles.eventoCor,
                          { backgroundColor: ev.cor ?? '#c8607a' },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventoTitulo}>{ev.titulo}</Text>
                        {ev.hora ? (
                          <Text style={styles.eventoData}>{ev.hora}</Text>
                        ) : null}
                        {ev.descricao ? (
                          <Text style={styles.eventoData}>{ev.descricao}</Text>
                        ) : null}
                        {ev.custo ? (
                          <Text style={styles.eventoData}>
                            R$ {ev.custo.toFixed(2)}
                          </Text>
                        ) : null}
                        {conf && (
                          <Text
                            style={[styles.eventoData, { color: '#6ab89a' }]}
                          >
                            ✓ confirmado
                          </Text>
                        )}
                        {pend && (
                          <Text
                            style={[styles.eventoData, { color: '#e8607a' }]}
                          >
                            pendente
                          </Text>
                        )}
                      </View>
                      <View style={{ gap: 6 }}>
                        {(ev.tipo === 'pagamento' ||
                          ev.tipo === 'manutencao') &&
                          !conf && (
                            <TouchableOpacity
                              style={styles.btnCheck}
                              onPress={() => {
                                setModalDia(false);
                                abrirConfirmar(ev, ocorrencia);
                              }}
                            >
                              <Check
                                size={14}
                                color="#6ab89a"
                                strokeWidth={2.5}
                              />
                            </TouchableOpacity>
                          )}
                        <TouchableOpacity
                          onPress={() => {
                            setEventoParaExcluir(ev.id);
                            setModalExcluir(true);
                          }}
                          style={{ padding: 4 }}
                        >
                          <X size={14} color="#e8607a" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
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

      {/* modal criar */}
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
                <Text style={styles.labelData}>
                  {diaSelecionado ? isoParaExib(diaSelecionado) : ''}
                </Text>

                {/* tipo */}
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

                {tipo === 'evento' && (
                  <>
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

                {(tipo === 'pagamento' || tipo === 'manutencao') && (
                  <>
                    <Text style={styles.label}>valor (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={custo}
                      onChangeText={setCusto}
                      placeholder="0,00"
                      placeholderTextColor="rgba(122,48,64,0.35)"
                      keyboardType="decimal-pad"
                      underlineColorAndroid="transparent"
                    />

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

                    <Text style={styles.label}>recorrência</Text>
                    <View style={styles.duracaoRow}>
                      {RECORRENCIAS.map((r) => (
                        <TouchableOpacity
                          key={r.label}
                          style={[
                            styles.duracaoBotao,
                            intervaloMeses === r.meses &&
                              styles.duracaoBotaoAtivo,
                          ]}
                          onPress={() => setIntervaloMeses(r.meses)}
                        >
                          <Text
                            style={[
                              styles.duracaoTexto,
                              intervaloMeses === r.meses &&
                                styles.duracaoTextoAtivo,
                            ]}
                          >
                            {r.label}
                          </Text>
                        </TouchableOpacity>
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

                    <Text style={styles.label}>categoria nas finanças</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 16 }}
                      contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.catChip,
                          !categoriaId && styles.catChipAtivo,
                        ]}
                        onPress={() => setCategoriaId('')}
                      >
                        <Text
                          style={[
                            styles.catChipTexto,
                            !categoriaId && styles.catChipTextoAtivo,
                          ]}
                        >
                          nenhuma
                        </Text>
                      </TouchableOpacity>
                      {categorias.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.catChip,
                            categoriaId === cat.id && styles.catChipAtivo,
                          ]}
                          onPress={() => setCategoriaId(cat.id)}
                        >
                          <Text
                            style={[
                              styles.catChipTexto,
                              categoriaId === cat.id &&
                                styles.catChipTextoAtivo,
                            ]}
                          >
                            {cat.nome}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
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

      {/* modal confirmar pagamento/manutenção */}
      <Modal visible={modalConfirmar} transparent animationType="slide">
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
                confirmar{' '}
                {eventoParaConfirmar?.tipo === 'pagamento'
                  ? 'pagamento'
                  : 'manutenção'}
              </Text>
              <Text style={styles.eventoTitulo}>
                {eventoParaConfirmar?.titulo}
              </Text>

              <Text style={[styles.label, { marginTop: 16 }]}>
                data de pagamento
              </Text>
              <TextInput
                style={styles.input}
                value={dataConfirmadaExib}
                onChangeText={(t) => setDataConfirmadaExib(mascaraData(t))}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="rgba(122,48,64,0.35)"
                keyboardType="numeric"
                maxLength={10}
                underlineColorAndroid="transparent"
              />

              <Text style={styles.label}>valor pago (R$)</Text>
              <TextInput
                style={styles.input}
                value={valorConfirmado}
                onChangeText={setValorConfirmado}
                placeholder="0,00"
                placeholderTextColor="rgba(122,48,64,0.35)"
                keyboardType="decimal-pad"
                underlineColorAndroid="transparent"
              />

              {eventoParaConfirmar?.categoriaId && (
                <Text style={styles.infoConf}>
                  será lançado nas finanças automaticamente
                </Text>
              )}

              <TouchableOpacity
                style={styles.botao}
                onPress={salvarConfirmacao}
                disabled={salvandoConf}
              >
                {salvandoConf ? (
                  <ActivityIndicator color="#3d1a10" />
                ) : (
                  <Text style={styles.botaoTexto}>confirmar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalConfirmar(false)}
              >
                <Text style={styles.botaoCancelarTexto}>cancelar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ModalConfirmar
        visivel={modalExcluir}
        titulo="excluir evento"
        mensagem="o evento será removido permanentemente."
        botaoTexto="excluir"
        destrutivo
        onConfirmar={() =>
          eventoParaExcluir && excluirEvento(eventoParaExcluir)
        }
        onCancelar={() => {
          setModalExcluir(false);
          setEventoParaExcluir(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  tituloPagina: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#3d1a10',
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
    marginBottom: 12,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  semanaRow: { flexDirection: 'row', marginBottom: 8 },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 10,
    color: 'rgba(122,48,64,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  diaCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 2,
  },
  diaCellHoje: { backgroundColor: 'rgba(232,160,176,0.2)' },
  diaCellSel: { backgroundColor: 'rgba(200,96,122,0.15)' },
  diaNum: { fontFamily: 'Baloo2_600SemiBold', fontSize: 13, color: '#3d1a10' },
  diaNumHoje: { color: '#c8607a', fontFamily: 'Baloo2_800ExtraBold' },
  diaNumSel: { color: '#c8607a' },
  bolinhasRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  bolinha: { width: 4, height: 4, borderRadius: 999 },
  legendaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(122,48,64,0.5)',
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
  eventoCor: { width: 8, height: 8, borderRadius: 999 },
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
  badgeConf: {
    backgroundColor: 'rgba(106,184,154,0.15)',
    borderRadius: 6,
    padding: 4,
  },
  badgePend: {
    backgroundColor: 'rgba(232,96,122,0.12)',
    borderRadius: 6,
    padding: 4,
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
    maxHeight: '90%',
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
    textAlign: 'center',
    marginBottom: 8,
  },
  labelData: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: 'rgba(122,48,64,0.45)',
    textAlign: 'center',
    marginBottom: 20,
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
  btnCheck: {
    backgroundColor: 'rgba(106,184,154,0.15)',
    borderRadius: 8,
    padding: 6,
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
  tipoRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  tipoTextoAtivo: { color: '#c8607a', fontFamily: 'Baloo2_800ExtraBold' },
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
  corOpcaoAtiva: { borderColor: '#3d1a10', transform: [{ scale: 1.15 }] },
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
  catChipAtivo: {
    borderColor: '#c8607a',
    backgroundColor: 'rgba(200,96,122,0.12)',
  },
  catChipTexto: {
    fontFamily: 'Baloo2_600SemiBold',
    fontSize: 12,
    color: 'rgba(122,48,64,0.5)',
  },
  catChipTextoAtivo: { color: '#c8607a' },
  infoConf: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 11,
    color: 'rgba(106,184,154,0.9)',
    textAlign: 'center',
    marginBottom: 12,
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
  botaoCancelar: { alignItems: 'center', paddingVertical: 8 },
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
  mesOpcaoTextoAtivo: { color: '#c8607a', fontFamily: 'Baloo2_800ExtraBold' },
});
