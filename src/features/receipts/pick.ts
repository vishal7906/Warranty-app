import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

/**
 * One shape for a file chosen from the camera, the photo library, or the
 * document browser, so the upload path does not care where it came from.
 */
export type PickedReceipt = {
  uri: string;
  /** Best-effort display name; the picker does not always supply one. */
  name: string;
  mimeType: string;
  /** Bytes, when the picker reported it. Not all sources do. */
  size: number | null;
};

/** Uploads are rejected past this size to keep them off a slow connection. */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_MIME_PREFIXES = ['image/'] as const;
export const ACCEPTED_MIME_TYPES = ['application/pdf'] as const;

export function isAcceptedMimeType(mimeType: string): boolean {
  return (
    ACCEPTED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
    ACCEPTED_MIME_TYPES.includes(mimeType as (typeof ACCEPTED_MIME_TYPES)[number])
  );
}

export function isPdf(mimeType: string | null | undefined): boolean {
  return mimeType === 'application/pdf';
}

/** Thrown for problems worth showing the user; cancels return `null` instead. */
export class ReceiptPickError extends Error {}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Storage keys must end in a real extension for signed URLs to serve inline. */
export function extensionFor(file: PickedReceipt): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : '';
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return EXTENSION_BY_MIME[file.mimeType] ?? 'bin';
}

function guessMimeFromUri(uri: string): string {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const match = Object.entries(EXTENSION_BY_MIME).find(([, value]) => value === extension);
  return match?.[0] ?? 'image/jpeg';
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): PickedReceipt {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? guessMimeFromUri(asset.uri),
    size: asset.fileSize ?? null,
  };
}

/** Rejects anything the viewer cannot render, before it costs an upload. */
function validate(file: PickedReceipt): PickedReceipt {
  if (!isAcceptedMimeType(file.mimeType)) {
    throw new ReceiptPickError('Receipts must be an image or a PDF.');
  }
  if (file.size !== null && file.size > MAX_RECEIPT_BYTES) {
    throw new ReceiptPickError('That file is larger than 10 MB. Try a smaller scan.');
  }
  return file;
}

/**
 * Opens the camera. Returns `null` when the user backs out.
 *
 * The permission prompt is left to the picker itself, which asks on first use
 * and, on a second attempt after a denial, resolves without opening — hence the
 * explicit check so the user gets an explanation instead of nothing happening.
 */
export async function pickFromCamera(): Promise<PickedReceipt | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new ReceiptPickError(
      'Camera access is off for this app. Enable it in Settings to scan a receipt.'
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    // Receipts are read, not admired: trade some fidelity for a faster upload.
    quality: 0.7,
    allowsEditing: true,
  });

  if (result.canceled) return null;
  return validate(fromImageAsset(result.assets[0]));
}

/** Opens the photo library. Returns `null` when the user backs out. */
export async function pickFromLibrary(): Promise<PickedReceipt | null> {
  // iOS 14+ and Android 13+ hand back only the assets the user selects, so no
  // permission request is needed for a read-only pick on current OS versions.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });

  if (result.canceled) return null;
  return validate(fromImageAsset(result.assets[0]));
}

/** Opens the system file browser, filtered to images and PDFs. */
export async function pickDocument(): Promise<PickedReceipt | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    // Without the copy, the URI can point at a provider the uploader cannot read.
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  return validate({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? guessMimeFromUri(asset.name),
    size: asset.size ?? null,
  });
}
