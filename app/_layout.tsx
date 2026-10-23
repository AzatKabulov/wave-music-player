import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MusicProvider } from '../src/data/MusicProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../src/design/theme';
export default function RootLayout() {
  return <SafeAreaProvider><MusicProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }} /></MusicProvider></SafeAreaProvider>;
}
