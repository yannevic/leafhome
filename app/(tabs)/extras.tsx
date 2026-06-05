import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ShoppingCart,
  StickyNote,
  Target,
  TrendingUp,
  Calculator,
  ChevronRight,
} from 'lucide-react-native';

const CARDS = [
  {
    rota: '/extras/lista-compras',
    icone: ShoppingCart,
    titulo: 'lista de compras',
    descricao: 'múltiplas listas, checklists e templates',
    cor: '#c8607a',
    gradiente: ['rgba(252,200,220,0.55)', 'rgba(232,160,176,0.35)'] as const,
  },
  {
    rota: '/extras/notas',
    icone: StickyNote,
    titulo: 'notas rápidas',
    descricao: 'post-its para não esquecer nada',
    cor: '#9b7ac8',
    gradiente: ['rgba(210,200,255,0.55)', 'rgba(180,160,240,0.35)'] as const,
  },
  {
    rota: '/extras/metas',
    icone: Target,
    titulo: 'metas',
    descricao: 'acompanhe seus objetivos financeiros',
    cor: '#4a7a4a',
    gradiente: ['rgba(180,220,180,0.55)', 'rgba(140,200,140,0.35)'] as const,
  },
  {
    rota: '/extras/historico-precos',
    icone: TrendingUp,
    titulo: 'histórico de preços',
    descricao: 'compare preços ao longo do tempo',
    cor: '#c87a28',
    gradiente: ['rgba(255,220,170,0.55)', 'rgba(240,190,120,0.35)'] as const,
  },
  {
    rota: '/extras/calculadora',
    icone: Calculator,
    titulo: 'calculadora',
    descricao: 'cálculos rápidos do dia a dia',
    cor: '#3a7ac8',
    gradiente: ['rgba(180,210,255,0.55)', 'rgba(140,185,240,0.35)'] as const,
  },
];

export default function ExtrasScreen() {
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
      style={styles.fundo}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* cabeçalho */}
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>extras</Text>
            <Text style={styles.subtitulo}>ferramentas do dia a dia</Text>
          </View>

          {/* cards */}
          <View style={styles.lista}>
            {CARDS.map((card) => {
              const Icone = card.icone;
              return (
                <TouchableOpacity
                  key={card.rota}
                  activeOpacity={0.75}
                  onPress={() => router.push(card.rota as any)}
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
                    {/* ícone com fundo colorido */}
                    <LinearGradient
                      colors={card.gradiente}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconeBg}
                    >
                      <Icone size={22} color={card.cor} strokeWidth={2} />
                    </LinearGradient>

                    {/* texto */}
                    <View style={styles.cardTexto}>
                      <Text style={styles.cardTitulo}>{card.titulo}</Text>
                      <Text style={styles.cardDescricao}>{card.descricao}</Text>
                    </View>

                    {/* seta */}
                    <ChevronRight
                      size={16}
                      color="rgba(122,48,64,0.3)"
                      strokeWidth={2.5}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  cabecalho: {
    marginBottom: 24,
    marginTop: 8,
  },
  titulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#3d1a10',
  },
  subtitulo: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
    marginTop: 2,
  },
  lista: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,160,176,0.4)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
  iconeBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTexto: {
    flex: 1,
    gap: 2,
  },
  cardTitulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
  cardDescricao: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 12,
    color: 'rgba(122,48,64,0.55)',
  },
});
