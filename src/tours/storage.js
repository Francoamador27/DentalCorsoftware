const NAMESPACE = 'tour:v1';

const keyFor = (kind, key, userId) => `${NAMESPACE}:${kind}:${key}:${userId}`;

// Sin usuario cargado todavía no hay forma de scopear el flag: tratamos como
// "ya visto" para no disparar tours antes de que useAuth resuelva /api/user.
export const isTourSeen = (kind, key, userId) => {
  if (!userId) return true;
  return localStorage.getItem(keyFor(kind, key, userId)) === 'done';
};

export const markTourSeen = (kind, key, userId) => {
  if (!userId) return;
  localStorage.setItem(keyFor(kind, key, userId), 'done');
};

export const resetTourSeen = (kind, key, userId) => {
  if (!userId) return;
  localStorage.removeItem(keyFor(kind, key, userId));
};
