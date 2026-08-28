import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { ExtractionSummary } from '@/components/extraction-summary';
import { FormField } from '@/components/form-field';
import { PendingReceiptPreview } from '@/components/pending-receipt-preview';
import { ReceiptSourceSheet } from '@/components/receipt-source-sheet';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/features/purchases/format';
import { useCreatePurchase } from '@/features/purchases/queries';
import {
  emptyPurchaseForm,
  purchaseFormSchema,
  type PurchaseFormValues,
} from '@/features/purchases/schema';
import { computeWarrantyEnd, toISODate } from '@/features/purchases/warranty';
import { uploadReceipt } from '@/features/receipts/api';
import type { ExtractionField } from '@/features/receipts/extract';
import { ReceiptPickError, pickFromCamera, type PickedReceipt } from '@/features/receipts/pick';
import { scanReceipt, type ScanOutcome } from '@/features/receipts/scan';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'choose' | 'scanning' | 'manual';

export default function NewPurchaseScreen() {
  const [mode, setMode] = useState<Mode>('choose');
  /**
   * Held in memory until the purchase exists. `receipts.purchase_id` is NOT
   * NULL, so there is nothing to attach a file to before the insert succeeds.
   */
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  async function handlePicked(picked: PickedReceipt | null) {
    setReceipt(picked);
    setOutcome(null);

    if (!picked) {
      setMode('manual');
      return;
    }

    // `scanReceipt` reports every failure as an outcome rather than throwing,
    // so a receipt that cannot be read still reaches the form attached.
    setMode('scanning');
    setOutcome(await scanReceipt(picked));
    setMode('manual');
  }

  if (mode === 'choose') return <MethodChooser onContinue={handlePicked} />;
  if (mode === 'scanning') return <ScanningState />;

  return (
    <ManualForm
      receipt={receipt}
      outcome={outcome}
      onClearReceipt={() => {
        setReceipt(null);
        setOutcome(null);
      }}
    />
  );
}

function ScanningState() {
  const colors = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three,
        padding: Spacing.four,
        backgroundColor: colors.background,
      }}>
      <ActivityIndicator />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
        Reading your receipt…
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
        This runs on your device. Nothing is uploaded to read the text.
      </Text>
    </View>
  );
}

function MethodChooser({ onContinue }: { onContinue: (receipt: PickedReceipt | null) => void }) {
  const colors = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  async function scan() {
    try {
      const file = await pickFromCamera();
      if (file) onContinue(file);
    } catch (cause) {
      Alert.alert(
        'Could not open the camera',
        cause instanceof ReceiptPickError || cause instanceof Error
          ? cause.message
          : 'Please try again.'
      );
    }
  }

  const methods = [
    {
      emoji: '📷',
      title: 'Scan Receipt',
      subtitle: 'Capture it and we read the details',
      onPress: scan,
    },
    {
      emoji: '📁',
      title: 'Upload Receipt',
      subtitle: 'Read a photo you already have',
      onPress: () => setSheetVisible(true),
    },
    {
      emoji: '✍️',
      title: 'Enter Manually',
      subtitle: 'Type the details yourself',
      onPress: () => onContinue(null),
    },
  ];

  return (
    <>
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
            accessibilityRole="button"
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

        <Text
          style={{
            color: colors.neutral,
            fontSize: 13,
            paddingTop: Spacing.two,
            paddingHorizontal: Spacing.one,
          }}>
          Receipts are read on your device — the image is never sent anywhere to extract the
          text. You get a filled-in form to check before saving. PDFs are attached without
          scanning.
        </Text>
      </ScrollView>

      <ReceiptSourceSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPicked={onContinue}
        sources={['library', 'files']}
      />
    </>
  );
}

function ManualForm({
  receipt,
  outcome,
  onClearReceipt,
}: {
  receipt: PickedReceipt | null;
  outcome: ScanOutcome | null;
  onClearReceipt: () => void;
}) {
  const colors = useTheme();
  const router = useRouter();
  const create = useCreatePurchase();

  const extraction = outcome?.status === 'extracted' ? outcome.extraction : null;

  const [values, setValues] = useState<PurchaseFormValues>(() => ({
    ...emptyPurchaseForm(toISODate(new Date())),
    ...extraction?.values,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Marks a field that the scan filled in, so the user knows which values are
   * guesses to check rather than something they typed.
   */
  function scannedHint(field: ExtractionField, fallback?: string): string | undefined {
    return extraction?.filled.includes(field) ? 'From your receipt — check it' : fallback;
  }

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
    let purchaseId: string;
    try {
      const purchase = await create.mutateAsync(parsed.data);
      purchaseId = purchase.id;
    } catch (cause) {
      Alert.alert('Could not save', cause instanceof Error ? cause.message : 'Please try again.');
      return;
    }

    // The purchase is saved from here on. A failed upload is worth reporting,
    // but it must not read as though the whole thing was lost — the receipt can
    // be added again from the purchase itself.
    if (receipt) {
      setIsUploading(true);
      try {
        await uploadReceipt(purchaseId, receipt);
      } catch (cause) {
        setIsUploading(false);
        Alert.alert(
          'Purchase saved, receipt did not upload',
          `${cause instanceof Error ? cause.message : 'The upload failed.'} You can attach it again from the purchase.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      setIsUploading(false);
    }

    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
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
        {receipt ? (
          <PendingReceiptPreview receipt={receipt} onRemove={onClearReceipt} />
        ) : null}

        <ExtractionSummary outcome={outcome} />

        <FormField
          label="Product"
          value={values.product_name}
          onChangeText={(text) => set('product_name', text)}
          placeholder="Samsung Galaxy S25"
          hint={scannedHint('product_name')}
          error={errors.product_name}
        />
        <FormField
          label="Brand"
          value={values.brand ?? ''}
          onChangeText={(text) => set('brand', text)}
          placeholder="Samsung"
          hint={scannedHint('brand')}
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
              hint={scannedHint('price')}
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
          hint={scannedHint('purchase_date')}
          error={errors.purchase_date}
        />

        <FormField
          label="Seller"
          value={values.seller ?? ''}
          onChangeText={(text) => set('seller', text)}
          placeholder="ABC Electronics"
          hint={scannedHint('seller')}
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
          hint={scannedHint(
            'warranty_months',
            warrantyEnd ? `Expires ${formatDate(warrantyEnd)}` : 'Leave empty for no warranty.'
          )}
          error={errors.warranty_months}
        />

        <FormField
          label="Invoice number"
          value={values.invoice_number ?? ''}
          onChangeText={(text) => set('invoice_number', text)}
          placeholder="INV-29382"
          autoCapitalize="characters"
          hint={scannedHint('invoice_number')}
        />
        <FormField
          label="Serial number"
          value={values.serial_number ?? ''}
          onChangeText={(text) => set('serial_number', text)}
          autoCapitalize="characters"
          hint={scannedHint('serial_number')}
        />
        <FormField
          label="Notes"
          value={values.notes ?? ''}
          onChangeText={(text) => set('notes', text)}
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Button
          title={isUploading ? 'Uploading Receipt…' : 'Save Purchase'}
          onPress={handleSave}
          loading={create.isPending || isUploading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
