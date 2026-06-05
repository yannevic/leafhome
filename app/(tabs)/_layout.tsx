import { Tabs } from 'expo-router';
import { Home, Wallet, Calendar, Sparkles, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
  <LinearGradient
    colors={[
      'rgba(220,225,255,0.97)',
      'rgba(240,230,255,0.97)',
      'rgba(252,220,228,0.97)',
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
    style={{ flex: 1 }}
  >
    <LinearGradient
      colors={[
        'rgba(232,160,176,0)',
        'rgba(232,160,176,0.5)',
        'rgba(200,180,255,0.5)',
        'rgba(232,160,176,0.5)',
        'rgba(232,160,176,0)',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 1.5, width: '100%' }}
    />
  </LinearGradient>
),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(232,160,176,0.4)',
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#c8607a',
        tabBarInactiveTintColor: 'rgba(122,48,64,0.4)',
        tabBarLabelStyle: {
          fontFamily: 'Baloo2_600SemiBold',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'início',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="financas"
        options={{
          title: 'finanças',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'calendário',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="extras"
        options={{
          title: 'extras',
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}