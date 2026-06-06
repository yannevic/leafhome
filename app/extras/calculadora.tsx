import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft, Delete } from 'lucide-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Calculadora() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [display, setDisplay] = useState('0');
  const [expressao, setExpressao] = useState('');
  const [novoNumero, setNovoNumero] = useState(true);
  const [expressaoViva, setExpressaoViva] = useState('');
  const [expressaoDisplay, setExpressaoDisplay] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@calc_ultimo').then((val) => {
      if (val) {
        setDisplay(val);
        setExpressaoViva(val);
      }
    });
  }, []);

  useEffect(() => {
    if (display !== '0') {
      AsyncStorage.setItem('@calc_ultimo', display);
    }
  }, [display]);

  function pressNumero(n: string) {
    let novo: string;
    if (novoNumero) {
      novo = n === '.' ? '0.' : n;
      setNovoNumero(false);
    } else {
      if (n === '.' && display.includes('.')) return;
      novo = display === '0' ? (n === '.' ? '0.' : n) : display + n;
    }
    setDisplay(novo);
    setExpressaoViva(expressaoDisplay + novo);
  }

  function pressOperador(op: string) {
    if (expressao && !novoNumero) {
      const partes = expressao.trim().split(' ');
      const a = parseFloat(partes[0]);
      const opAnterior = partes[1];
      const b = parseFloat(display);
      let resultado = 0;
      if (opAnterior === '+') resultado = a + b;
      else if (opAnterior === '-') resultado = a - b;
      else if (opAnterior === '×') resultado = a * b;
      else if (opAnterior === '÷') resultado = b !== 0 ? a / b : 0;
      const str = parseFloat(resultado.toFixed(10)).toString();
      setDisplay(str);
      setExpressao(str + ' ' + op);
      const novaExprDisplay = expressaoDisplay + display + ' ' + op + ' ';
      setExpressaoDisplay(novaExprDisplay);
      setExpressaoViva(novaExprDisplay);
      setNovoNumero(true);
      return;
    }
    setExpressao(display + ' ' + op);
    const novaExprDisplay = expressaoDisplay + display + ' ' + op + ' ';
    setExpressaoDisplay(novaExprDisplay);
    setExpressaoViva(novaExprDisplay);
    setNovoNumero(true);
  }

  async function pressIgual() {
    if (!expressao) return;
    try {
      const partes = expressao.trim().split(' ');
      const a = parseFloat(partes[0]);
      const op = partes[1];
      const b = parseFloat(display);
      let resultado = 0;
      if (op === '+') resultado = a + b;
      else if (op === '-') resultado = a - b;
      else if (op === '×') resultado = a * b;
      else if (op === '÷') resultado = b !== 0 ? a / b : 0;
      const str = parseFloat(resultado.toFixed(10)).toString();
      setDisplay(str);
      setExpressao('');
      setExpressaoDisplay('');
      setExpressaoViva(str);
      setNovoNumero(true);
      await AsyncStorage.setItem('@calc_ultimo', str);
    } catch {
      setDisplay('erro');
      setExpressao('');
      setExpressaoDisplay('');
      setExpressaoViva('');
      setNovoNumero(true);
    }
  }

  function pressLimpar() {
    setDisplay('0');
    setExpressao('');
    setExpressaoDisplay('');
    setExpressaoViva('0');
    setNovoNumero(true);
  }

  function pressDeletar() {
    if (novoNumero || display.length <= 1) {
      setDisplay('0');
      setNovoNumero(true);
      setExpressaoViva(expressaoDisplay || '0');
    } else {
      const novo = display.slice(0, -1);
      setDisplay(novo);
      setExpressaoViva(expressaoDisplay + novo);
    }
  }

  function pressPorcentagem() {
    const v = parseFloat(display);
    if (isNaN(v)) return;
    let novo: string;
    if (expressao) {
      const partes = expressao.trim().split(' ');
      const a = parseFloat(partes[0]);
      if (!isNaN(a)) {
        novo = parseFloat(((a * v) / 100).toFixed(10)).toString();
        setDisplay(novo);
        const base = partes[0] + ' ' + partes[1];
        setExpressaoViva(base + ' ' + novo);
        return;
      }
    }
    novo = parseFloat((v / 100).toFixed(10)).toString();
    setDisplay(novo);
    setExpressaoViva(novo);
  }

  function pressPlusMinus() {
    if (display === '0') return;
    setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
  }

  const botoes: {
    label: string | 'del';
    tipo: 'num' | 'op' | 'acao' | 'igual';
  }[][] = [
    [
      { label: 'C', tipo: 'acao' },
      { label: '+/-', tipo: 'acao' },
      { label: '%', tipo: 'acao' },
      { label: '÷', tipo: 'op' },
    ],
    [
      { label: '7', tipo: 'num' },
      { label: '8', tipo: 'num' },
      { label: '9', tipo: 'num' },
      { label: '×', tipo: 'op' },
    ],
    [
      { label: '4', tipo: 'num' },
      { label: '5', tipo: 'num' },
      { label: '6', tipo: 'num' },
      { label: '-', tipo: 'op' },
    ],
    [
      { label: '1', tipo: 'num' },
      { label: '2', tipo: 'num' },
      { label: '3', tipo: 'num' },
      { label: '+', tipo: 'op' },
    ],
    [
      { label: 'del', tipo: 'num' },
      { label: '0', tipo: 'num' },
      { label: '.', tipo: 'num' },
      { label: '=', tipo: 'igual' },
    ],
  ];

  function handleBotao(label: string, tipo: string) {
    if (tipo === 'num') {
      if (label === 'del') pressDeletar();
      else pressNumero(label);
    } else if (tipo === 'op') {
      pressOperador(label);
    } else if (tipo === 'igual') {
      pressIgual();
    } else if (tipo === 'acao') {
      if (label === 'C') pressLimpar();
      else if (label === '+/-') pressPlusMinus();
      else if (label === '%') pressPorcentagem();
    }
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
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.btnVoltar}
            >
              <ChevronLeft size={20} color="#c8607a" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.tituloPagina}>calculadora</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* display */}
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
            style={styles.displayCard}
          >
            <Text style={styles.expressaoTexto} numberOfLines={1}>
              {expressaoViva}
            </Text>
            <Text
              style={styles.displayTexto}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {display}
            </Text>
          </LinearGradient>

          {/* botões */}
          <View style={styles.botoesContainer}>
            {botoes.map((linha, li) => (
              <View key={li} style={styles.linha}>
                {linha.map((b) => (
                  <TouchableOpacity
                    key={b.label}
                    onPress={() => handleBotao(b.label, b.tipo)}
                    activeOpacity={0.75}
                    style={styles.botaoWrap}
                  >
                    <LinearGradient
                      colors={
                        b.tipo === 'igual'
                          ? [
                              'rgba(252,200,220,0.95)',
                              'rgba(210,200,255,0.9)',
                              'rgba(252,220,200,0.95)',
                            ]
                          : b.tipo === 'op'
                            ? [
                                'rgba(232,160,176,0.5)',
                                'rgba(210,180,255,0.45)',
                                'rgba(232,160,176,0.5)',
                              ]
                            : b.tipo === 'acao'
                              ? [
                                  'rgba(253,242,246,0.9)',
                                  'rgba(240,235,255,0.85)',
                                  'rgba(253,242,246,0.9)',
                                ]
                              : [
                                  'rgba(253,246,240,0.95)',
                                  'rgba(252,228,235,0.9)',
                                  'rgba(253,246,240,0.95)',
                                ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.botao}
                    >
                      {b.label === 'del' ? (
                        <Delete size={20} color="#3d1a10" strokeWidth={2} />
                      ) : (
                        <Text
                          style={[
                            styles.botaoTexto,
                            b.tipo === 'op' && styles.botaoTextoOp,
                            b.tipo === 'igual' && styles.botaoTextoIgual,
                            b.tipo === 'acao' && styles.botaoTextoAcao,
                          ]}
                        >
                          {b.label}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  displayCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 20,
    marginBottom: 20,
    alignItems: 'flex-end',
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  expressaoTexto: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 14,
    color: 'rgba(122,48,64,0.45)',
    marginBottom: 4,
  },
  displayTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 48,
    color: '#3d1a10',
    minWidth: '100%',
    textAlign: 'right',
  },
  botoesContainer: {
    flex: 1,
    gap: 10,
  },
  linha: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  botaoWrap: {
    flex: 1,
  },
  botao: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.35)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 22,
    color: '#3d1a10',
  },
  botaoTextoOp: {
    color: '#c8607a',
    fontSize: 24,
  },
  botaoTextoIgual: {
    color: '#3d1a10',
  },
  botaoTextoAcao: {
    fontSize: 18,
    color: 'rgba(122,48,64,0.7)',
  },
});
