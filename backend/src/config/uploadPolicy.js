import path from 'path';

const MB = 1024 * 1024;

const GENERIC_MIME = new Set([
  'application/octet-stream',
  'binary/octet-stream',
  ''
]);

export const uploadPolicies = {
  dataFile: {
    label: '資料檔案',
    maxSize: 1024 * MB,
    extensions: ['.pdf', '.xlsx', '.xls', '.csv', '.json', '.geojson', '.kml', '.txt', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.zip'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'application/json',
      'application/geo+json',
      'application/vnd.google-earth.kml+xml',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/tif',
      'application/zip',
      'application/x-zip-compressed'
    ]
  },
  featureAttachment: {
    label: '關聯附件',
    maxSize: 25 * MB,
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
  },
  media: {
    label: '影像媒體',
    maxSize: 200 * MB,
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.mp4', '.mov', '.avi', '.webm', '.mpeg', '.mpg'],
    mimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg'
    ]
  },
  temporalData: {
    label: '時序資料',
    maxSize: 100 * MB,
    extensions: ['.csv', '.shp', '.dbf', '.prj', '.shx', '.geojson', '.json'],
    mimeTypes: ['text/csv', 'application/csv', 'application/json', 'application/geo+json', 'application/octet-stream']
  },
  monitoringLayer: {
    label: '監測圖資',
    maxSize: 250 * MB,
    extensions: ['.json', '.geojson', '.kml', '.csv', '.txt', '.tif', '.tiff', '.png', '.jpg', '.jpeg', '.zip'],
    mimeTypes: [
      'application/json',
      'application/geo+json',
      'application/vnd.google-earth.kml+xml',
      'text/csv',
      'text/plain',
      'image/tiff',
      'image/tif',
      'image/png',
      'image/jpeg',
      'application/zip',
      'application/x-zip-compressed'
    ]
  }
};

export function sanitizeOriginalName(originalName = 'upload') {
  const parsed = path.parse(originalName);
  const ext = parsed.ext.toLowerCase();
  const safeBase = (parsed.name || 'upload')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'upload';
  return `${safeBase}${ext}`;
}

export function createStoredFilename(prefix, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${prefix}-${unique}${ext}`;
}

export function validateUploadFile(policyName, file) {
  const policy = uploadPolicies[policyName];
  if (!policy) return { ok: false, message: `未知的上傳政策: ${policyName}` };

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const extensionAllowed = policy.extensions.includes(ext);
  const mimeAllowed = policy.mimeTypes.includes(mime) || GENERIC_MIME.has(mime);

  if (!extensionAllowed) {
    return {
      ok: false,
      message: `${policy.label}不允許副檔名 ${ext || '(無副檔名)'}，允許: ${policy.extensions.join(', ')}`
    };
  }

  if (!mimeAllowed) {
    return {
      ok: false,
      message: `${policy.label}不允許 MIME ${mime || '(未知)'}`
    };
  }

  return { ok: true };
}

export function createMulterFileFilter(policyName) {
  return (req, file, cb) => {
    const result = validateUploadFile(policyName, file);
    if (!result.ok) return cb(new Error(result.message), false);
    file.safeOriginalName = sanitizeOriginalName(file.originalname);
    return cb(null, true);
  };
}

export function maxUploadSize(policyName) {
  return uploadPolicies[policyName]?.maxSize || 25 * MB;
}
