import DateTimePicker from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/features/purchases/format';
import { toISODate } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';

export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  /** ISO `yyyy-MM-dd`. */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  hint?: string;
}) {
  const colors = useTheme();
  const [isOpen, setIsOpen] = useState(Platform.OS === 'ios');

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date();

  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>

      {Platform.OS === 'ios' ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.control,
            borderCurve: 'continuous',
            padding: Spacing.one,
          }}>
          <DateTimePicker
            value={parsed}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            onChange={(_event, date) => date && onChange(toISODate(date))}
          />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setIsOpen(true)}
            style={{
              minHeight: 46,
              justifyContent: 'center',
              paddingHorizontal: Spacing.three,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.control,
              borderCurve: 'continuous',
            }}>
            <Text style={{ color: colors.text, fontSize: 17 }}>{formatDate(value)}</Text>
          </Pressable>
          {isOpen ? (
            <DateTimePicker
              value={parsed}
              mode="date"
              maximumDate={new Date()}
              onChange={(_event, date) => {
                setIsOpen(false);
                if (date) onChange(toISODate(date));
              }}
            />
          ) : null}
        </>
      )}

      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 13 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
