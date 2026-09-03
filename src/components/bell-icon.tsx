import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

/** A notification-bell glyph, drawn natively: SF Symbols on iOS, Material Symbols on Android and web. */
export function BellIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <SymbolView
      name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
      tintColor={color}
      size={size}
      weight="semibold"
      fallback={<DrawnBell color={color} size={size} />}
    />
  );
}

/** A rounded trapezoid with a base, so the fallback needs neither a font nor an asset. */
function DrawnBell({ color, size }: { color: string; size: number }) {
  const width = size * 0.6;
  const height = size * 0.62;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width,
          height,
          borderTopLeftRadius: width / 2,
          borderTopRightRadius: width / 2,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          marginTop: 2,
          width: width * 0.5,
          height: 3,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
