export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUUID = (v) => UUID_RE.test(v);

export const validateUUID = (id, res, label = 'ID') => {
  if (!isValidUUID(id)) {
    res.status(400).json({ success: false, message: `無效的${label}格式` });
    return false;
  }
  return true;
};
