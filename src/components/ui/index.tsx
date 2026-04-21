// ============================================
// Shared UI Primitives — matches selection-tool design system
// ============================================

import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

// ─── Card ────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ className, padding = 'md', hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-sm',
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-4 sm:p-5': padding === 'md',
          'p-5 sm:p-6': padding === 'lg',
        },
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  );
}

// ─── Badge ───────────────────────────────────

const BADGE_VARIANTS = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-indigo-50 text-indigo-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  pink: 'bg-pink-50 text-pink-700',
  purple: 'bg-purple-50 text-purple-700',
} as const;

interface BadgeProps {
  variant?: keyof typeof BADGE_VARIANTS;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
      BADGE_VARIANTS[variant],
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  );
}

// ─── PageHeader ──────────────────────────────

interface PageHeaderProps {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, iconColor = 'bg-indigo-600', title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl text-white', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
}

export function Tabs({ tabs, activeTab, onChange, size = 'sm' }: TabsProps) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-lg">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-md font-medium transition-colors whitespace-nowrap',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            activeTab === t.id
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
              activeTab === t.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
}

export function Modal({ open, onClose, children, size = 'lg', title }: ModalProps) {
  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw]',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto animate-scale-in',
          sizeClass
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export function ProgressBar({ value, color = 'indigo', size = 'sm', showLabel }: ProgressBarProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    pink: 'bg-pink-500',
    purple: 'bg-purple-500',
  };
  const heightMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 bg-slate-100 rounded-full overflow-hidden', heightMap[size])}>
        <div
          className={cn('rounded-full transition-all duration-500', heightMap[size], colorMap[color] || colorMap.indigo)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && <span className="text-[10px] font-semibold text-slate-500 tabular-nums w-8 text-right">{Math.round(value)}%</span>}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, className, action }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16', className)}>
      <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 mb-4">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── ScoreRing ───────────────────────────────

interface ScoreRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}

export function ScoreRing({ value, size = 44, stroke = 4, color }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ - (clamped / 100) * circ;

  const autoColor = color || (value >= 70 ? '#059669' : value >= 50 ? '#f59e0b' : '#ef4444');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="score-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="score-ring-track" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={stroke}
          stroke={autoColor}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-ring-fill"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="tabular-nums font-bold text-slate-900" style={{ fontSize: size * 0.27 }}>{clamped}</span>
      </div>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  picture?: string;
}

export function Avatar({ name, size = 'md', picture }: AvatarProps) {
  const sizeMap = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' };
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];

  if (picture) {
    return <img src={picture} alt={name} className={cn('rounded-full object-cover', sizeMap[size])} />;
  }

  const ini = name ? (name.trim().split(/\s+/).length > 1
    ? name.trim().split(/\s+/)[0][0] + name.trim().split(/\s+/).pop()![0]
    : name[0]).toUpperCase() : '?';

  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold', sizeMap[size], colorClass)}>
      {ini}
    </div>
  );
}

// ─── StatCard ────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string | null;
}

const STAT_COLORS: Record<string, { bg: string; icon: string; text: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
  pink: { bg: 'bg-pink-50', icon: 'text-pink-600', text: 'text-pink-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
};

export function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <Card hover>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-xl', c.bg)}>
          <Icon className={cn('w-4 h-4', c.icon)} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-0.5">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      {trend && <div className={cn('text-[10px] mt-1 font-medium', c.text)}>{trend}</div>}
    </Card>
  );
}
