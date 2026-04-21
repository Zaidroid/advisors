// ============================================
// Default Scoring Configuration
// ============================================

import type { Stage1Weights, SeniorityTier, CategoryConfig, AppConfig } from '../types';

/** Default Stage 1 weights — must sum to 100 */
export const DEFAULT_STAGE1_WEIGHTS: Stage1Weights = {
  tech_rating: 15,
  eco_rating: 10,
  clevel: 20,
  years: 15,
  experience: 15,
  seniority: 10,
  linkedin: 10,
  cv: 5,
};

/** Default pass/fail threshold for Stage 1 */
export const DEFAULT_STAGE1_THRESHOLD = 50;

/** Years-of-experience bucket multipliers */
export const DEFAULT_YEARS_MULTIPLIERS: Record<string, number> = {
  'less than 5': 0.4,
  '5-10': 0.75,
  'more than 10': 1.0,
};

/** Seniority keyword tiers — first match wins, order matters */
export const DEFAULT_SENIORITY_TIERS: SeniorityTier[] = [
  { keyword: 'founder', score: 1.0 },
  { keyword: 'ceo', score: 1.0 },
  { keyword: 'cto', score: 1.0 },
  { keyword: 'coo', score: 1.0 },
  { keyword: 'cfo', score: 0.95 },
  { keyword: 'cmo', score: 0.95 },
  { keyword: 'cbo', score: 0.95 },
  { keyword: 'vp', score: 0.9 },
  { keyword: 'vice president', score: 0.9 },
  { keyword: 'director', score: 0.85 },
  { keyword: 'head of', score: 0.8 },
  { keyword: 'managing director', score: 0.85 },
  { keyword: 'managing partner', score: 0.85 },
  { keyword: 'partner', score: 0.8 },
  { keyword: 'principal', score: 0.75 },
  { keyword: 'senior manager', score: 0.7 },
  { keyword: 'manager', score: 0.6 },
  { keyword: 'lead', score: 0.55 },
  { keyword: 'senior', score: 0.5 },
  { keyword: 'consultant', score: 0.45 },
  { keyword: 'advisor', score: 0.45 },
  { keyword: 'specialist', score: 0.4 },
  { keyword: 'coordinator', score: 0.35 },
  { keyword: 'engineer', score: 0.3 },
];

/** CEO category signals */
export const DEFAULT_CATEGORY_CEO: CategoryConfig = {
  keywords: [
    'strategic planning', 'business advisory', 'sales', 'fundraising',
    'board', 'strategy', 'exits', 'growth', 'business development',
    'leadership', 'mentoring', 'entrepreneurship', 'startup', 'venture',
    'investment', 'partnership', 'revenue', 'scaling',
  ],
  areaWeights: {
    'Strategic Planning': 3,
    'Business Advisory': 3,
    'Sales': 2,
    'Marketing and Branding': 2,
    'Financial Management': 1,
  },
  titleBoost: 15,
  techRatingBias: 0,
};

/** CTO category signals */
export const DEFAULT_CATEGORY_CTO: CategoryConfig = {
  keywords: [
    'engineering', 'product management', 'software', 'development',
    'architecture', 'cloud', 'infrastructure', 'devops', 'data science',
    'full stack', 'frontend', 'backend', 'mobile', 'security', 'platform',
    'web development', 'api', 'database', 'system design',
  ],
  areaWeights: {
    'Engineering': 3,
    'Product Management': 2,
  },
  titleBoost: 15,
  techRatingBias: 4, // must have techRating >= 4
};

/** COO category signals */
export const DEFAULT_CATEGORY_COO: CategoryConfig = {
  keywords: [
    'hr and talent management', 'financial management', 'legal advisory',
    'health management', 'operations', 'compliance', 'supply chain',
    'process', 'logistics', 'risk management', 'quality', 'administration',
    'procurement', 'governance',
  ],
  areaWeights: {
    'HR and Talent Management': 3,
    'Financial Management': 3,
    'Legal Advisory': 2,
    'Health Management': 2,
  },
  titleBoost: 15,
  techRatingBias: 0,
};

/** Marketing Specialist category signals */
export const DEFAULT_CATEGORY_MARKETING: CategoryConfig = {
  keywords: [
    'marketing', 'branding', 'brand strategy', 'digital marketing',
    'content', 'social media', 'seo', 'advertising', 'creative',
    'communications', 'public relations', 'media', 'copywriting',
    'growth marketing', 'demand generation', 'go-to-market', 'storytelling',
    'market research', 'customer acquisition', 'campaign',
  ],
  areaWeights: {
    'Marketing and Branding': 4,
    'Sales': 2,
    'Strategic Planning': 1,
  },
  titleBoost: 15,
  techRatingBias: 0,
};

/** AI Specialist category signals */
export const DEFAULT_CATEGORY_AI: CategoryConfig = {
  keywords: [
    'artificial intelligence', 'machine learning', 'deep learning',
    'natural language processing', 'nlp', 'computer vision', 'ai',
    'neural network', 'large language model', 'llm', 'data science',
    'tensorflow', 'pytorch', 'generative ai', 'automation',
    'predictive analytics', 'recommendation system', 'transformer',
    'reinforcement learning', 'chatbot',
  ],
  areaWeights: {
    'Engineering': 2,
    'Product Management': 1,
  },
  titleBoost: 15,
  techRatingBias: 4, // must have techRating >= 4
};

/** Full default config */
export const DEFAULT_CONFIG: AppConfig = {
  responsesSheetId: '',
  responsesTabName: 'Form Responses 1',
  stale_days: 14,
  stage1_threshold: DEFAULT_STAGE1_THRESHOLD,
  stage1_weights: DEFAULT_STAGE1_WEIGHTS,
  years_multipliers: DEFAULT_YEARS_MULTIPLIERS,
  seniority_tiers: DEFAULT_SENIORITY_TIERS,
  category_ceo: DEFAULT_CATEGORY_CEO,
  category_cto: DEFAULT_CATEGORY_CTO,
  category_coo: DEFAULT_CATEGORY_COO,
  category_marketing: DEFAULT_CATEGORY_MARKETING,
  category_ai: DEFAULT_CATEGORY_AI,
  category_tiebreaker: 'raw_signal_count',
  team_emails: [],
  domain_allowlist: 'gazaskygeeks.com',
  schema_version: 2,
  filter_year: 2026,
};

/** Stale days constant (overridden by config) */
export const STALE_DAYS = 14;

/** Category metadata for UI display */
export const CATEGORY_META: Record<string, { label: string; color: string; bgColor: string; blurb: string }> = {
  CEO:       { label: 'CEO',         color: 'text-amber-700',   bgColor: 'bg-amber-50',   blurb: 'Strategy, leadership, board readiness' },
  CTO:       { label: 'CTO',         color: 'text-blue-700',    bgColor: 'bg-blue-50',     blurb: 'Technical architecture, engineering leadership' },
  COO:       { label: 'COO',         color: 'text-emerald-700', bgColor: 'bg-emerald-50',  blurb: 'Operations, finance, HR, legal, process' },
  Marketing: { label: 'Marketing',   color: 'text-pink-700',    bgColor: 'bg-pink-50',     blurb: 'Branding, digital marketing, growth' },
  AI:        { label: 'AI Specialist', color: 'text-purple-700',  bgColor: 'bg-purple-50',   blurb: 'Machine learning, AI, data science' },
};
