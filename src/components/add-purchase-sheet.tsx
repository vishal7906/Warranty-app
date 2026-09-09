import BottomSheet, { BottomSheetView } from "@expo/ui/community/bottom-sheet";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { Button } from "@/components/button";
import { CategoryField } from "@/components/category-field";
import { DateField } from "@/components/date-field";
import { ExtractionSummary } from "@/components/extraction-summary";
import { FormField } from "@/components/form-field";
import { PendingReceiptPreview } from "@/components/pending-receipt-preview";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { formatDate } from "@/features/purchases/format";
import { useCreatePurchase } from "@/features/purchases/queries";
import { emptyPurchaseForm, purchaseFormSchema, type PurchaseFormValues } from "@/features/purchases/schema";
import { computeWarrantyEnd, toISODate } from "@/features/purchases/warranty";
import { uploadReceipt } from "@/features/receipts/api";
import type { ExtractionField } from "@/features/receipts/extract";
import { ReceiptPickError, pickDocument, pickFromCamera, pickFromLibrary, type PickedReceipt } from "@/features/receipts/pick";
import { scanReceipt, type ScanOutcome } from "@/features/receipts/scan";
import { useTheme } from "@/hooks/use-theme";

type Step = "options" | "source" | "scanning" | "form";

type OptionKey = "scan" | "upload" | "manual";

type RowDef = {
  key: string;
  title: string;
  tile: string;
  fallback: string;
  symbol: ComponentProps<typeof SymbolView>["name"];
};

const OPTIONS: RowDef[] = [
  {
    key: "scan",
    title: "Scan Receipt",
    tile: "#7A73FF",
    fallback: "📷",
    symbol: { ios: "camera.fill", android: "photo_camera", web: "photo_camera" },
  },
  {
    key: "upload",
    title: "Upload Receipt",
    tile: "#0A84FF",
    fallback: "🖼️",
    symbol: { ios: "photo.on.rectangle", android: "photo_library", web: "photo_library" },
  },
  {
    key: "manual",
    title: "Enter Manually",
    tile: "#2ECFBB",
    fallback: "✍️",
    symbol: { ios: "square.and.pencil", android: "edit", web: "edit" },
  },
];

type SourceKey = "library" | "files";

const SOURCES: RowDef[] = [
  {
    key: "library",
    title: "Photo Library",
    tile: "#0A84FF",
    fallback: "🖼️",
    symbol: { ios: "photo", android: "photo_library", web: "photo_library" },
  },
  {
    key: "files",
    title: "Files",
    tile: "#8E8E93",
    fallback: "📁",
    symbol: { ios: "folder.fill", android: "folder", web: "folder" },
  },
];

const PICKERS: Record<SourceKey, () => Promise<PickedReceipt | null>> = {
  library: pickFromLibrary,
  files: pickDocument,
};

const STEP_TRANSITION = LinearTransition.duration(240);
const enterStep = FadeIn.duration(200);
const exitStep = FadeOut.duration(120);

/**
 * The whole "add a purchase" flow as one native bottom sheet. Choosing a
 * method, picking a receipt source, scanning it, and filling in the form are
 * all steps inside this same sheet rather than separate routed screens — so
 * there is only ever one native presentation on screen at a time, and moving
 * between steps is just an in-place content swap.
 */
export function AddPurchaseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useTheme();
  const [step, setStep] = useState<Step>("options");
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  const tall = step === "form";

  function reportPickError(cause: unknown, title: string) {
    Alert.alert(title, cause instanceof ReceiptPickError || cause instanceof Error ? cause.message : "Please try again.");
  }

  async function handlePicked(file: PickedReceipt) {
    setReceipt(file);
    setStep("scanning");
    // Never throws — every failure comes back as an outcome the form can explain.
    setOutcome(await scanReceipt(file));
    setStep("form");
  }

  async function handleScan() {
    try {
      const file = await pickFromCamera();
      if (file) await handlePicked(file);
    } catch (cause) {
      reportPickError(cause, "Could not open the camera");
    }
  }

  async function handleSource(source: SourceKey) {
    try {
      const file = await PICKERS[source]();
      if (file) await handlePicked(file);
    } catch (cause) {
      reportPickError(cause, "Could not open that");
    }
  }

  function handleManual() {
    setReceipt(null);
    setOutcome(null);
    setStep("form");
  }

  function backToOptions() {
    setReceipt(null);
    setOutcome(null);
    setStep("options");
  }

  // Fires once the sheet has fully closed — from Save, the backdrop, or a
  // swipe — so the next time it opens always starts back at the first step.
  function handleClosed() {
    setStep("options");
    setReceipt(null);
    setOutcome(null);
  }

  return (
    <BottomSheet
      index={visible ? 0 : -1}
      snapPoints={tall ? ["92%"] : undefined}
      enablePanDownToClose
      onClose={handleClosed}
      backgroundStyle={{ backgroundColor: colors.backgroundElement }}>
      <BottomSheetView style={{ flex: 1, paddingHorizontal: Spacing.three }}>
        <Animated.View style={{ flex: tall ? 1 : undefined }} layout={STEP_TRANSITION}>
          {step === "options" && (
            <Animated.View key="options" entering={enterStep} exiting={exitStep}>
              <OptionsStep
                onChoose={(key: OptionKey) => {
                  if (key === "scan") void handleScan();
                  else if (key === "upload") setStep("source");
                  else handleManual();
                }}
              />
            </Animated.View>
          )}

          {step === "source" && (
            <Animated.View key="source" entering={enterStep} exiting={exitStep}>
              <SourceStep onBack={() => setStep("options")} onChoose={(source) => void handleSource(source)} />
            </Animated.View>
          )}

          {step === "scanning" && (
            <Animated.View key="scanning" entering={enterStep} exiting={exitStep}>
              <ScanningStep />
            </Animated.View>
          )}

          {step === "form" && (
            <Animated.View key="form" style={{ flex: 1 }} entering={enterStep} exiting={exitStep}>
              <FormStep
                receipt={receipt}
                outcome={outcome}
                onBack={backToOptions}
                onClearReceipt={() => {
                  setReceipt(null);
                  setOutcome(null);
                }}
                onDone={onClose}
              />
            </Animated.View>
          )}
        </Animated.View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
          tintColor={colors.tint}
          size={20}
          weight="semibold"
          fallback={<Text style={{ color: colors.tint, fontSize: 20 }}>‹</Text>}
        />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

function OptionRow({ row, onPress }: { row: RowDef; onPress: () => void }) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.three,
        padding: Spacing.two + 2,
        backgroundColor: colors.background,
        borderRadius: Radius.card + 4,
        borderCurve: "continuous",
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          borderCurve: "continuous",
          backgroundColor: row.tile,
          alignItems: "center",
          justifyContent: "center",
        }}>
        <SymbolView name={row.symbol} tintColor="#FFFFFF" size={22} weight="semibold" fallback={<Text style={{ fontSize: 20 }}>{row.fallback}</Text>} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>{row.title}</Text>
    </Pressable>
  );
}

function OptionsStep({ onChoose }: { onChoose: (key: OptionKey) => void }) {
  const colors = useTheme();

  return (
    <View style={{ alignItems: "center", gap: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.four }}>
      <View style={{ alignItems: "center", gap: Spacing.one }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 }}>Add a purchase</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>Tell us how you would like to add it</Text>
      </View>

      <View style={{ alignSelf: "stretch", gap: Spacing.two }}>
        {OPTIONS.map((option) => (
          <OptionRow key={option.key} row={option} onPress={() => onChoose(option.key as OptionKey)} />
        ))}
      </View>
    </View>
  );
}

function SourceStep({ onBack, onChoose }: { onBack: () => void; onChoose: (source: SourceKey) => void }) {
  return (
    <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
      <StepHeader title="Upload Receipt" onBack={onBack} />
      <View style={{ gap: Spacing.two }}>
        {SOURCES.map((source) => (
          <OptionRow key={source.key} row={source} onPress={() => onChoose(source.key as SourceKey)} />
        ))}
      </View>
    </View>
  );
}

function ScanningStep() {
  const colors = useTheme();

  return (
    <View style={{ alignItems: "center", gap: Spacing.three, paddingVertical: Spacing.six }}>
      <ActivityIndicator />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>Reading your receipt…</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: "center" }}>
        This runs on your device. Nothing is uploaded to read the text.
      </Text>
    </View>
  );
}

function FormStep({
  receipt,
  outcome,
  onBack,
  onClearReceipt,
  onDone,
}: {
  receipt: PickedReceipt | null;
  outcome: ScanOutcome | null;
  onBack: () => void;
  onClearReceipt: () => void;
  /** Called once the purchase is saved (or the user dismisses the upload-failure alert). */
  onDone: () => void;
}) {
  const create = useCreatePurchase();
  const extraction = outcome?.status === "extracted" ? outcome.extraction : null;

  const [values, setValues] = useState<PurchaseFormValues>(() => ({
    ...emptyPurchaseForm(toISODate(new Date())),
    ...extraction?.values,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  function scannedHint(field: ExtractionField, fallback?: string): string | undefined {
    return extraction?.filled.includes(field) ? "From your receipt — check it" : fallback;
  }

  function set<K extends keyof PurchaseFormValues>(key: K, value: PurchaseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setNumber(key: "price" | "warranty_months", text: string) {
    const cleaned = text.replace(/[^0-9.]/g, "");
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
      Alert.alert("Could not save", cause instanceof Error ? cause.message : "Please try again.");
      return;
    }

    // The purchase is saved from here on. A failed upload is worth reporting,
    // but it must not read as though the whole thing was lost — the receipt
    // can be added again from the purchase itself.
    if (receipt) {
      setIsUploading(true);
      try {
        await uploadReceipt(purchaseId, receipt);
      } catch (cause) {
        setIsUploading(false);
        Alert.alert(
          "Purchase saved, receipt did not upload",
          `${cause instanceof Error ? cause.message : "The upload failed."} You can attach it again from the purchase.`,
          [{ text: "OK", onPress: onDone }]
        );
        return;
      }
      setIsUploading(false);
    }

    if (process.env.EXPO_OS === "ios") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onDone();
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <StepHeader title="Add Purchase" onBack={onBack} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: Spacing.three,
          paddingBottom: Spacing.six,
          maxWidth: MaxContentWidth,
          width: "100%",
          alignSelf: "center",
        }}>
        {receipt ? <PendingReceiptPreview receipt={receipt} onRemove={onClearReceipt} /> : null}

        <ExtractionSummary outcome={outcome} />

        <FormField
          label="Product"
          value={values.product_name}
          onChangeText={(text) => set("product_name", text)}
          placeholder="Samsung Galaxy S25"
          hint={scannedHint("product_name")}
          error={errors.product_name}
        />
        <FormField
          label="Brand"
          value={values.brand ?? ""}
          onChangeText={(text) => set("brand", text)}
          placeholder="Samsung"
          hint={scannedHint("brand")}
        />
        <CategoryField value={values.category ?? null} onChange={(category) => set("category", category)} />

        <View style={{ flexDirection: "row", gap: Spacing.three }}>
          <View style={{ flex: 2 }}>
            <FormField
              label="Price"
              value={values.price === null || values.price === undefined ? "" : String(values.price)}
              onChangeText={(text) => setNumber("price", text)}
              keyboardType="decimal-pad"
              placeholder="74999"
              hint={scannedHint("price")}
              error={errors.price}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Currency"
              value={values.currency ?? "INR"}
              onChangeText={(text) => set("currency", text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
              error={errors.currency}
            />
          </View>
        </View>

        <DateField
          label="Purchase date"
          value={values.purchase_date}
          onChange={(next) => set("purchase_date", next)}
          hint={scannedHint("purchase_date")}
          error={errors.purchase_date}
        />

        <FormField
          label="Seller"
          value={values.seller ?? ""}
          onChangeText={(text) => set("seller", text)}
          placeholder="ABC Electronics"
          hint={scannedHint("seller")}
        />

        <FormField
          label="Warranty (months)"
          value={values.warranty_months === null || values.warranty_months === undefined ? "" : String(values.warranty_months)}
          onChangeText={(text) => setNumber("warranty_months", text)}
          keyboardType="number-pad"
          placeholder="12"
          hint={scannedHint(
            "warranty_months",
            warrantyEnd ? `Expires ${formatDate(warrantyEnd)}` : "Leave empty for no warranty."
          )}
          error={errors.warranty_months}
        />

        <FormField
          label="Invoice number"
          value={values.invoice_number ?? ""}
          onChangeText={(text) => set("invoice_number", text)}
          placeholder="INV-29382"
          autoCapitalize="characters"
          hint={scannedHint("invoice_number")}
        />
        <FormField
          label="Serial number"
          value={values.serial_number ?? ""}
          onChangeText={(text) => set("serial_number", text)}
          autoCapitalize="characters"
          hint={scannedHint("serial_number")}
        />
        <FormField
          label="Notes"
          value={values.notes ?? ""}
          onChangeText={(text) => set("notes", text)}
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />

        <Button title={isUploading ? "Uploading Receipt…" : "Save Purchase"} onPress={handleSave} loading={create.isPending || isUploading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
