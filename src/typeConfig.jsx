import React from 'react';
import {
  Zap, BatteryCharging, Cable, Car, CarFront, Fuel, Route, MapPin, Ship,
  Wrench, Hammer, Settings, Shield, FileText, Tag, Folder, Inbox,
  ShoppingBag, ShoppingCart, Banknote, CreditCard, CircleDollarSign,
  Building2, Home, Clock, CheckCircle2, AlertTriangle,
  Wifi, Antenna, Network, Globe, Radio, Signal, Smartphone, Tv, Music,
  Cloud, Satellite, Router, Rss, Phone, Mail, Calendar, Star, Heart,
  Gauge, Droplet, Sun, Snowflake, Package, Ticket, Receipt, Wallet,
  Key, Lock, User, Users, Briefcase, BookOpen, Camera, Headphones,
  Plug, PlugZap, Battery, Sparkles, CircleHelp,
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

  // 選單以外的常見 SF Symbol —— iOS 的 Image(systemName:) 接受任何符號名稱，
  // 不限 SymbolPickerView 提供的那些，因此這裡盡量涵蓋以免網頁顯示錯誤圖示。
  'wifi':                          Wifi,
  'wifi.router':                   Router,
  'wifi.router.fill':              Router,
  'antenna.radiowaves.left.and.right': Antenna,
  'network':                       Network,
  'globe':                         Globe,
  'globe.asia.australia.fill':     Globe,
  'dot.radiowaves.left.and.right': Radio,
  'cellularbars':                  Signal,
  'iphone':                        Smartphone,
  'simcard.fill':                  Smartphone,
  'tv.fill':                       Tv,
  'music.note':                    Music,
  'cloud.fill':                    Cloud,
  'icloud.fill':                   Cloud,
  'satellite.fill':                Satellite,
  'dot.radiowaves.up.forward':     Rss,
  'phone.fill':                    Phone,
  'envelope.fill':                 Mail,
  'calendar':                      Calendar,
  'star.fill':                     Star,
  'heart.fill':                    Heart,
  'gauge':                         Gauge,
  'drop.fill':                     Droplet,
  'sun.max.fill':                  Sun,
  'snowflake':                     Snowflake,
  'shippingbox.fill':              Package,
  'ticket.fill':                   Ticket,
  'receipt':                       Receipt,
  'wallet.pass.fill':              Wallet,
  'key.fill':                      Key,
  'lock.fill':                     Lock,
  'person.fill':                   User,
  'person.2.fill':                 Users,
  'briefcase.fill':                Briefcase,
  'book.fill':                     BookOpen,
  'camera.fill':                   Camera,
  'headphones':                    Headphones,
  'powerplug.fill':                Plug,
  'bolt.batteryblock.fill':        PlugZap,
  'battery.100':                   Battery,
  'sparkles':                      Sparkles,
};

/** 可供網頁端挑選的圖示（值即 SF Symbol 名稱，存回去 App 才認得） */
export const SYMBOL_OPTIONS = Object.keys(SYMBOL_MAP);

/**
 * 依 icon 值渲染圖示。
 * 相容三種情況：SF Symbol 名稱（App 寫入）、emoji（網頁舊資料）、空值。
 */
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function TypeIcon({ icon, size = 18, className = '', style }) {
  const Cmp = SYMBOL_MAP[icon];
  if (Cmp) return <Cmp size={size} className={className} style={style} strokeWidth={2.2} />;

  // 舊的 emoji 資料直接印出來
  // ⚠️ 只認真正的 emoji。先前用「不含點就是 emoji」判斷，會把 SF Symbol 名稱
  //（例如 "wifi"、"snowflake"）當成文字印在畫面上。
  if (icon && EMOJI_RE.test(icon)) {
    return <span className={className} style={{ ...style, fontSize: size }}>{icon}</span>;
  }

  // 未知的符號名稱：用問號圖示，明確表示「這個圖示網頁還沒對應」，
  // 而不是安靜地顯示成標籤而讓人以為是正確圖示。
  if (icon) {
    return <CircleHelp size={size} className={className} style={style} strokeWidth={2.2} />;
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
