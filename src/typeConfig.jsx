import React from 'react';
import {
  Zap, BatteryCharging, Cable, Car, CarFront, Fuel, Route, MapPin, Ship,
  Wrench, Hammer, Settings, Shield, FileText, Tag, Folder, Inbox,
  ShoppingBag, ShoppingCart, Banknote, CreditCard, CircleDollarSign,
  Building2, Home, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';

/**
 * 類型預設值 —— 必須與 iOS ExpenseType.defaults 完全一致
 * （settings/config 由 App 與網頁共用，icon 存的是 SF Symbol 名稱）。
 */
export const DEFAULT_TYPES = [
  { id: 'charging',    label: '充電',     icon: 'bolt.fill',                   color: '#6E9266', protected: false },
  { id: 'tolls',       label: '過路費',   icon: 'road.lanes',                  color: '#C8A24C', protected: false },
  { id: 'maintenance', label: '保養維修', icon: 'wrench.and.screwdriver.fill', color: '#8C6BA6', protected: false },
  { id: 'insurance',   label: '保險',     icon: 'shield.fill',                 color: '#4E7BB5', protected: false },
  { id: 'other',       label: '其他',     icon: 'doc.text.fill',               color: '#8C8579', protected: true  },
];

/**
 * SF Symbol 名稱 → lucide 圖示。
 * 涵蓋 iOS SymbolPickerView 提供的所有符號，讓 App 選的圖示在網頁正確呈現。
 */
const SYMBOL_MAP = {
  'bolt.fill':                    Zap,
  'bolt.car.fill':                Zap,
  'battery.100.bolt':             BatteryCharging,
  'chargingcable.fill':           Cable,
  'fuelpump.fill':                Fuel,
  'car.fill':                     Car,
  'car.2.fill':                   CarFront,
  'road.lanes':                   Route,
  'mappin.and.ellipse':           MapPin,
  'ferry.fill':                   Ship,
  'wrench.and.screwdriver.fill':  Wrench,
  'hammer.fill':                  Hammer,
  'gearshape.fill':               Settings,
  'shield.fill':                  Shield,
  'doc.text.fill':                FileText,
  'tag.fill':                     Tag,
  'folder.fill':                  Folder,
  'tray.fill':                    Inbox,
  'bag.fill':                     ShoppingBag,
  'cart.fill':                    ShoppingCart,
  'banknote.fill':                Banknote,
  'creditcard.fill':              CreditCard,
  'dollarsign.circle.fill':       CircleDollarSign,
  'building.2.fill':              Building2,
  'house.fill':                   Home,
  'clock.fill':                   Clock,
  'checkmark.circle.fill':        CheckCircle2,
  'exclamationmark.triangle.fill': AlertTriangle,
};

/** 可供網頁端挑選的圖示（值即 SF Symbol 名稱，存回去 App 才認得） */
export const SYMBOL_OPTIONS = Object.keys(SYMBOL_MAP);

/**
 * 依 icon 值渲染圖示。
 * 相容三種情況：SF Symbol 名稱（App 寫入）、emoji（網頁舊資料）、空值。
 */
export function TypeIcon({ icon, size = 18, className = '', style }) {
  const Cmp = SYMBOL_MAP[icon];
  if (Cmp) return <Cmp size={size} className={className} style={style} strokeWidth={2.2} />;

  // 舊的 emoji 資料直接印出來
  if (icon && !icon.includes('.')) {
    return <span className={className} style={{ ...style, fontSize: size }}>{icon}</span>;
  }
  return <Tag size={size} className={className} style={style} strokeWidth={2.2} />;
}

export function resolveTypes(definedTypes) {
  return Array.isArray(definedTypes) && definedTypes.length > 0
    ? definedTypes
    : DEFAULT_TYPES;
}

export function buildTypeMap(definedTypes) {
  return Object.fromEntries(resolveTypes(definedTypes).map(t => [t.id, t]));
}
