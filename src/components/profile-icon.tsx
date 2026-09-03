import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

/** A person glyph, drawn natively: SF Symbols on iOS, Material Symbols on Android and web. */
export function ProfileIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <SymbolView
      name={{ ios: 'person.fill', android: 'person', web: 'person' }}
      tintColor={color}
      size={size}
      weight="semibold"
      fallback={<DrawnProfile color={color} size={size} />}
    />
  );
}

/** A circle head over a rounded shoulders shape, so the fallback needs neither a font nor an asset. */
function DrawnProfile({ color, size }: { color: string; size: number }) {
  const head = size * 0.42;
  const shoulders = size * 0.68;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: shoulders,
          height: shoulders / 2,
          borderTopLeftRadius: shoulders / 2,
          borderTopRightRadius: shoulders / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
