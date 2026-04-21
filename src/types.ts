// ============================================
// Core Type Definitions — Advisor Pipeline Tool
// ============================================

/** Raw advisor data parsed from the Responses Sheet */
export interface Advisor {
  id: string;             // compound key: timestamp + email
  timestamp: string;
  name: string;
  gender: string;
  country: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  techRating: string;     // "1"–"5" or "No" / blank
  ecoRating: string;      // "1"–"5" or blank
  expAreas: string;       // multi-select or "Yes"/"No"
  expDetail: string;
  cLevel: string;         // "Yes" / "No"
  cLevelDetail: string;
  position: string;
  employer: string;
  years: string;          // "less than 5" | "5-10" | "more than 10"
  nonTechSubjects: string;
  gsgPast: string;
  paidOrVol: string;
  hourlyRate: string;
  cvLink: string;
  notes: string;
  heardFrom: string;
  opportunities: string;
  supportIn: string;
  supportVia: string;
  techSpecs: string;
  newsletter: string;

  // Computed client-side
  stage1: Stage1Score;
  stage2: Stage2Score;
}

export interface Stage1Score {
  total: number;          // 0–100
  parts: Stage1Parts;
  pass: boolean;          // total >= threshold
}

export interface Stage1Parts {
  tech_rating: number;
  eco_rating: number;
  clevel: number;
  years: number;
  experience: number;
  seniority: number;
  linkedin: number;
  cv: number;
}

export interface Stage2Score {
  ceo: number;            // 0–100
  cto: number;
  coo: number;
  marketing: number;
  ai: number;
  primary: CategoryKey | 'Unqualified';
}

/** All advisor category keys */
export type CategoryKey = 'CEO' | 'CTO' | 'COO' | 'Marketing' | 'AI';

/** One row in the Tracker tab */
export interface TrackerRow {
  advisorId: string;
  status: AdvisorStatus;
  assignee: string;
  receivedAck: boolean;
  introScheduled: string;
  assessmentDate: string;
  decisionDate: string;
  notes: string;
  lastAction: string;
  updatedBy: string;
  updatedAt: string;
}

/** One row in the FollowUps tab */
export interface FollowUp {
  id: string;
  advisorId: string;
  dueDate: string;
  type: string;
  assignee: string;
  status: 'open' | 'done' | 'snoozed';
  notes: string;
  createdBy: string;
  createdAt: string;
  completedAt: string;
}

/** One row in the ActivityLog tab */
export interface Activity {
  timestamp: string;
  userEmail: string;
  advisorId: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
  details: string;
}

/** One row in the Comments tab */
export interface Comment {
  id: string;
  advisorId: string;
  parentId: string;
  userEmail: string;
  createdAt: string;
  body: string;
  resolved: boolean;
}

/** One row in the Team tab */
export interface TeamMember {
  email: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
}

/** Config key-value store */
export interface AppConfig {
  responsesSheetId: string;
  responsesTabName: string;
  stale_days: number;
  stage1_threshold: number;
  stage1_weights: Stage1Weights;
  years_multipliers: Record<string, number>;
  seniority_tiers: SeniorityTier[];
  category_ceo: CategoryConfig;
  category_cto: CategoryConfig;
  category_coo: CategoryConfig;
  category_marketing: CategoryConfig;
  category_ai: CategoryConfig;
  category_tiebreaker: string;
  team_emails: string[];
  domain_allowlist: string;
  schema_version: number;
  filter_year: number;
}

export interface Stage1Weights {
  tech_rating: number;
  eco_rating: number;
  clevel: number;
  years: number;
  experience: number;
  seniority: number;
  linkedin: number;
  cv: number;
}

export interface SeniorityTier {
  keyword: string;
  score: number;
}

export interface CategoryConfig {
  keywords: string[];
  areaWeights: Record<string, number>;
  titleBoost: number;
  techRatingBias: number;
}

/** 10 pipeline statuses */
export type AdvisorStatus =
  | 'new'
  | 'acknowledged'
  | 'allocated'
  | 'intro_sched'
  | 'intro_done'
  | 'assessment'
  | 'approved'
  | 'rejected'
  | 'matched'
  | 'on_hold';

/** Combined advisor + tracker for UI rendering */
export interface EnrichedAdvisor extends Advisor {
  tracker?: TrackerRow;
  followUps?: FollowUp[];
  comments?: Comment[];
  activities?: Activity[];
}

/** View names used in navigation */
export type ViewName =
  | 'dashboard'
  | 'pipeline'
  | 'tracker'
  | 'alerts'
  | 'followups'
  | 'activity'
  | 'config';
