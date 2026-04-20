export const DEFAULT_TYPES = [
  { id: 'charging',    label: '充電',    icon: '⚡', color: '#3b82f6', protected: false },
  { id: 'tolls',       label: '過路費',  icon: '🛣️', color: '#f97316', protected: false },
  { id: 'maintenance', label: '保養維修', icon: '🔧', color: '#eab308', protected: false },
  { id: 'insurance',   label: '保險',    icon: '🛡️', color: '#a855f7', protected: false },
  { id: 'other',       label: '其他',    icon: '📋', color: '#6b7280', protected: true  },
];

export function resolveTypes(definedTypes) {
  return Array.isArray(definedTypes) && definedTypes.length > 0
    ? definedTypes
    : DEFAULT_TYPES;
}

export function buildTypeMap(definedTypes) {
  return Object.fromEntries(resolveTypes(definedTypes).map(t => [t.id, t]));
}
