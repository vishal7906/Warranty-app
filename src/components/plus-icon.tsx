import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

/**
 * A plus glyph, drawn natively: SF Symbols on iOS, Material Symbols on Android
 * and web. `fallback` covers the case where a platform has no definition for
 * the name, so the control is never an invisible tap target.
 */
export function PlusIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <SymbolView
      name={{ ios: 'plus', android: 'add', web: 'add' }}
      tintColor={color}
      size={size}
      weight="semibold"
      fallback={<DrawnPlus color={color} size={size} />}
    />
  );
}

/** Two bars, so the fallback needs neither a font nor an asset. */
function DrawnPlus({ color, size }: { color: string; size: number }) {
  const thickness = Math.max(2, Math.round(size / 11));
  const arm = size * 0.78;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: arm,
          height: thickness,
          backgroundColor: color,
          borderRadius: thickness / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: thickness,
          height: arm,
          backgroundColor: color,
          borderRadius: thickness / 2,
        }}
      />
    </View>
  );
}
