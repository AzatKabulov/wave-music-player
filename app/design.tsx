import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Plus, Search } from 'lucide-react-native';
import { Label, Button, Chip, Input, StateView, Skeleton, IconButton } from '../src/design/Primitives';
import { Artwork, palettes } from '../src/design/Artwork';
import { theme as t } from '../src/design/theme';
export default function Design() {
  const [selected, setSelected] = useState(true);
  const [query, setQuery] = useState('');
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Label type="sm" color="text-muted">SAZ / COMPONENT LIBRARY</Label>
    <Label type="display" accessibilityRole="header">A space for your sound.</Label>
    <Label color="text-muted">Original native primitives. Shared across iOS, Android and the development preview.</Label>
    <View style={styles.row}><Button title="Start listening" icon={Play} onPress={() => setSelected(!selected)} /><Button title="Create playlist" icon={Plus} variant="secondary" onPress={() => setSelected(!selected)} /><IconButton icon={Search} label="Focus search" onPress={() => setQuery('Desert')} /><Button title="Pending" busy onPress={() => {}} /><Button title="Unavailable" disabled onPress={() => {}} /></View>
    <View style={styles.row}><Chip title="Music" selected={selected} onPress={() => setSelected(!selected)} /><Chip title="Albums" selected={!selected} onPress={() => setSelected(!selected)} /></View>
    <View style={styles.row}>{palettes.map(palette => <Artwork key={palette} palette={palette} size={t.space[128]} />)}</View>
    <Input label="Search for a track or artist" value={query} onChangeText={setQuery} placeholder="Try Desert Hours" />
    <Input label="Playlist title" value="" onChangeText={() => {}} error="Give your playlist a title to continue." />
    <Skeleton />
    <StateView title="Your collection starts here" message="Save a track or make a playlist. Your favourites will have a home here." action="Explore music" onAction={() => setQuery('Music')} />
    <Label type="xs" color="text-muted">All interactive controls have visible focus, labels, and a 48dp minimum target.</Label>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: t.color.bg }, content: { width: '100%', maxWidth: t.layout.contentMax, alignSelf: 'center', padding: t.space[24], gap: t.space[24] }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[12] } });
