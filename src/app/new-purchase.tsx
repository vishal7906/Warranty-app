import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { FormField } from '@/components/form-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/features/purchases/format';
import { useCreatePurchase } from '@/features/purchases/queries';
import {
  emptyPurchaseForm,
  purchaseFormSchema,
  type PurchaseFormValues,
} from '@/features/purchases/schema';
import { computeWarrantyEnd, toISODate } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'choose' | 'manual';

export default function NewPurchaseScreen() {
  const [mode, setMode] = useState<Mode>('choose');

  return mode === 'choose' ? <MethodChooser onManual={() => setMode('manual')} /> : <ManualForm />;
}

function MethodChooser({ onManual }: { onManual: () => void }) {
  const colors = useTheme();

  function notYet(feature: string) {
    Alert.alert(
      `${feature} is coming next`,
      'Receipt capture and on-device OCR land in V2. Enter the purchase manually for now.'
    );
  }

  const methods = [
    { emoji: '📷', title: 'Scan Receipt', subtitle: 'Camera capture + OCR', onPress: () => notYet('Scanning') },
    { emoji: '📁', title: 'Upload Receipt', subtitle: 'Pick a photo or PDF', onPress: () => notYet('Uploading') },
    { emoji: '✍️', title: 'Enter Manually', subtitle: 'Type the details yourself', onPress: onManual },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: Spacing.three,
        gap: Spacing.two,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }}>
      {methods.map((method) => (
        <Pressable
          key={method.title}
          onPress={method.onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.three,
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.card,
            borderCurve: 'continuous',
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text style={{ fontSize: 28 }}>{method.emoji}</Text>
          <View style={{ flex: 1, gap: Spacing.half }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
              {method.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{method.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ManualForm() {
  const colors = useTheme();
  const router = useRouter();
  const create = useCreatePurchase();
  const [values, setValues] = useState<PurchaseFormValues>(() =>
    emptyPurchaseForm(toISODate(new Date()))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof PurchaseFormValues>(key: K, value: PurchaseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setNumber(key: 'price' | 'warranty_months', text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    set(key, cleaned.length ? Number(cleaned) : null);
  }

  const warrantyEnd = computeWarrantyEnd(values.purchase_date, values.warranty_months ?? null);

  async function handleSave() {
    const parsed = purchaseFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    try {
      await create.mutateAsync(parsed.data);
      if (process.env.EXPO_OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (cause) {
      Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: Spacing.three,
          gap: Spacing.three,
          paddingBottom: Spacing.six,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}>
        <FormField
          label="Product"
          value={values.product_name}
          onChangeText={(text) => set('product_name', text)}
          placeholder="Samsung Galaxy S25"
          error={errors.product_name}
        />
        <FormField
          label="Brand"
          value={values.brand ?? ''}
          onChangeText={(text) => set('brand', text)}
          placeholder="Samsung"
        />
        <FormField
          label="Category"
          value={values.category ?? ''}
          onChangeText={(text) => set('category', text)}
          placeholder="Electronics"
        />

        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <View style={{ flex: 2 }}>
            <FormField
              label="Price"
              value={values.price === null || values.price === undefined ? '' : String(values.price)}
              onChangeText={(text) => setNumber('price', text)}
              keyboardType="decimal-pad"
              placeholder="74999"
              error={errors.price}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Currency"
              value={values.currency ?? 'INR'}
              onChangeText={(text) => set('currency', text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
              error={errors.currency}
            />
          </View>
        </View>

        <DateField
          label="Purchase date"
          value={values.purchase_date}
          onChange={(next) => set('purchase_date', next)}
          error={errors.purchase_date}
        />

        <FormField
          label="Seller"
          value={values.seller ?? ''}
          onChangeText={(text) => set('seller', text)}
          placeholder="ABC Electronics"
        />

        <FormField
          label="Warranty (months)"
          value={
            values.warranty_months === null || values.warranty_months === undefined
              ? ''
              : String(values.warranty_months)
          }
          onChangeText={(text) => setNumber('warranty_months', text)}
          keyboardType="number-pad"
          placeholder="12"
          hint={warrantyEnd ? `Expires ${formatDate(warrantyEnd)}` : 'Leave empty for no warranty.'}
          error={errors.warranty_months}
        />

        <FormField
          label="Invoice number"
          value={values.invoice_number ?? ''}
          onChangeText={(text) => set('invoice_number', text)}
          placeholder="INV-29382"
          autoCapitalize="characters"
        />
        <FormField
          label="Serial number"
          value={values.serial_number ?? ''}
          onChangeText={(text) => set('serial_number', text)}
          autoCapitalize="characters"
        />
        <FormField
          label="Notes"
          value={values.notes ?? ''}
          onChangeText={(text) => set('notes', text)}
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Button title="Save Purchase" onPress={handleSave} loading={create.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
