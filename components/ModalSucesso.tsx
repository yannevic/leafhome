import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visivel: boolean;
  titulo: string;
  mensagem?: string;
  botaoTexto?: string;
  onConfirmar: () => void;
}

export default function ModalSucesso({ visivel, titulo, mensagem, botaoTexto = 'confirmar', onConfirmar }: Props) {
  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={styles.overlay}>
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
          style={styles.card}
        >
          <Text style={styles.titulo}>{titulo}</Text>
          {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

          <LinearGradient
            colors={[
              'rgba(252,200,220,0.9)',
              'rgba(210,200,255,0.85)',
              'rgba(252,220,200,0.9)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.botaoGradiente}
          >
            <TouchableOpacity onPress={onConfirmar} style={styles.botao}>
              <Text style={styles.botaoTexto}>{botaoTexto}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30,10,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232,160,176,0.4)',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    shadowColor: 'rgba(200,120,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
    backgroundColor: 'rgba(253,246,240,0.97)',
  },
  titulo: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 20,
    color: '#3d1a10',
    textAlign: 'center',
    marginBottom: 8,
  },
  mensagem: {
    fontFamily: 'Baloo2_400Regular',
    fontSize: 13,
    color: 'rgba(122,48,64,0.55)',
    textAlign: 'center',
    marginBottom: 20,
  },
  botaoGradiente: {
    borderRadius: 12,
    width: '100%',
    marginTop: 4,
  },
  botao: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoTexto: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 15,
    color: '#3d1a10',
  },
});