export type MediaAssetKind = 'image' | 'video' | 'audio';

export interface MediaAsset {
  kind: MediaAssetKind;
  mimeType: string;
  /** Remote asset location when the provider returns a URL. */
  url?: string;
  /** Inline base64 payload when the provider returns bytes directly. */
  data?: string;
  filename?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetEnvelope {
  asset: MediaAsset;
  provider: string;
  model?: string;
}

const MEDIA_MIME_PREFIX: Record<MediaAssetKind, string> = {
  image: 'image/',
  video: 'video/',
  audio: 'audio/',
};

export function assertMediaAsset(value: unknown): asserts value is MediaAsset {
  if (!value || typeof value !== 'object') throw new Error('Media asset must be an object');
  const asset = value as Record<string, unknown>;
  if (asset.kind !== 'image' && asset.kind !== 'video' && asset.kind !== 'audio') {
    throw new Error('Media asset kind must be image, video, or audio');
  }
  if (typeof asset.mimeType !== 'string' || !asset.mimeType.startsWith(MEDIA_MIME_PREFIX[asset.kind])) {
    throw new Error(`Invalid MIME type for ${asset.kind} media asset`);
  }
  const hasUrl = typeof asset.url === 'string' && asset.url.length > 0;
  const hasData = typeof asset.data === 'string' && asset.data.length > 0;
  if (!hasUrl && !hasData) throw new Error('Media asset must contain either url or data');
  if (hasUrl && hasData) throw new Error('Media asset cannot contain both url and data');
  for (const field of ['width', 'height', 'durationSeconds']) {
    if (asset[field] !== undefined && (typeof asset[field] !== 'number' || !Number.isFinite(asset[field]) || asset[field] < 0)) {
      throw new Error(`Invalid media asset ${field}`);
    }
  }
}

export function normalizeMediaAsset(value: unknown, kind: MediaAssetKind, mimeType?: string): MediaAsset {
  if (!value || typeof value !== 'object') throw new Error('Media provider returned an invalid asset');
  const input = value as Record<string, unknown>;
  const resolvedMimeType = typeof input.mimeType === 'string' ? input.mimeType : mimeType;
  if (!resolvedMimeType) throw new Error(`Media provider did not return a MIME type for ${kind}`);
  const asset: MediaAsset = {
    kind,
    mimeType: resolvedMimeType,
    url: typeof input.url === 'string' ? input.url : undefined,
    data: typeof input.data === 'string' ? input.data : undefined,
    filename: typeof input.filename === 'string' ? input.filename : undefined,
    width: typeof input.width === 'number' ? input.width : undefined,
    height: typeof input.height === 'number' ? input.height : undefined,
    durationSeconds: typeof input.durationSeconds === 'number' ? input.durationSeconds : undefined,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata as Record<string, unknown> : undefined,
  };
  assertMediaAsset(asset);
  return asset;
}
