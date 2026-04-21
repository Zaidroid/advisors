// ============================================
// Scoring Engine — Stage 1 (Qualification) + Stage 2 (Category Fit)
// 5 Categories: CEO, CTO, COO, Marketing Specialist, AI Specialist
// ============================================

import type { Advisor, Stage1Score, Stage2Score, Stage1Parts, AppConfig, CategoryConfig, CategoryKey } from '../types';
import { DEFAULT_CONFIG } from '../config/scoring';

/**
 * Compute Stage 1 qualification score for an advisor.
 * Weighted sum of signals present in form responses.
 */
export function computeStage1(adv: Partial<Advisor>, config: AppConfig = DEFAULT_CONFIG): Stage1Score {
  const w = config.stage1_weights;

  // 1. Tech rating (1-5)
  const techVal = parseFloat(adv.techRating || '0');
  const techScore = isNaN(techVal) ? 0 : (Math.min(techVal, 5) / 5) * w.tech_rating;

  // 2. Ecosystem rating (1-5)
  const ecoVal = parseFloat(adv.ecoRating || '0');
  const ecoScore = isNaN(ecoVal) ? 0 : (Math.min(ecoVal, 5) / 5) * w.eco_rating;

  // 3. C-level Y/N
  const clevelScore = /yes/i.test(adv.cLevel || '') ? w.clevel : 0;

  // 4. Years bucket
  const yearsBucket = (adv.years || '').toLowerCase().trim();
  const yearsMult = config.years_multipliers[yearsBucket]
    ?? config.years_multipliers[Object.keys(config.years_multipliers).find(
      k => yearsBucket.includes(k.toLowerCase())
    ) || ''] ?? 0;
  const yearsScore = yearsMult * w.years;

  // 5. Experience areas + detail
  const expAreasText = adv.expAreas || '';
  const expDetailText = adv.expDetail || '';
  let areaCount = 0;
  if (/yes/i.test(expAreasText) || expAreasText.includes(',')) {
    areaCount = expAreasText.split(',').filter(a => a.trim().length > 0).length;
  }
  areaCount = Math.min(areaCount, 5);
  const hasDetail = expDetailText.trim().length > 10 ? 1 : 0;
  const expRatio = Math.min((areaCount / 5) * 0.7 + hasDetail * 0.3, 1);
  const experienceScore = (/yes/i.test(expAreasText) || areaCount > 0) ? expRatio * w.experience : 0;

  // 6. Seniority (title keyword match)
  const posLow = (adv.position || '').toLowerCase();
  let seniorityMult = 0;
  for (const tier of config.seniority_tiers) {
    if (posLow.includes(tier.keyword.toLowerCase())) {
      seniorityMult = tier.score;
      break;
    }
  }
  if (seniorityMult === 0 && (adv.employer || '').trim().length > 2) {
    seniorityMult = 0.25;
  }
  const seniorityScore = seniorityMult * w.seniority;

  // 7. LinkedIn
  const li = (adv.linkedin || '').trim();
  let linkedinScore = 0;
  if (li.includes('linkedin.com/in/') || li.includes('linkedin.com/')) {
    linkedinScore = w.linkedin;
  } else if (li.length > 2 && !li.includes(' ')) {
    linkedinScore = w.linkedin * 0.5;
  }

  // 8. CV
  const cvScore = (adv.cvLink || '').trim().length > 5 ? w.cv : 0;

  const parts: Stage1Parts = {
    tech_rating: Math.round(techScore),
    eco_rating: Math.round(ecoScore),
    clevel: Math.round(clevelScore),
    years: Math.round(yearsScore),
    experience: Math.round(experienceScore),
    seniority: Math.round(seniorityScore),
    linkedin: Math.round(linkedinScore),
    cv: Math.round(cvScore),
  };

  const total = Object.values(parts).reduce((s, v) => s + v, 0);

  return {
    total,
    parts,
    pass: total >= config.stage1_threshold,
  };
}

/**
 * Compute Stage 2 category fit across all 5 categories.
 * Only relevant for advisors who passed Stage 1.
 */
export function computeStage2(adv: Partial<Advisor>, config: AppConfig = DEFAULT_CONFIG): Stage2Score {
  const ceoScore = computeCategoryScore(adv, config.category_ceo, 'ceo');
  const ctoScore = computeCategoryScore(adv, config.category_cto, 'cto');
  const cooScore = computeCategoryScore(adv, config.category_coo, 'coo');
  const marketingScore = computeCategoryScore(adv, config.category_marketing, 'marketing');
  const aiScore = computeCategoryScore(adv, config.category_ai, 'ai');

  const scores: Record<CategoryKey, number> = {
    CEO: ceoScore,
    CTO: ctoScore,
    COO: cooScore,
    Marketing: marketingScore,
    AI: aiScore,
  };

  const maxScore = Math.max(...Object.values(scores));

  let primary: CategoryKey = 'CEO';
  if (maxScore === 0) {
    primary = 'CEO'; // default fallback
  } else {
    const ties = (Object.entries(scores) as [CategoryKey, number][])
      .filter(([, s]) => s === maxScore);
    if (ties.length === 1) {
      primary = ties[0][0];
    } else {
      // Tiebreaker
      if (config.category_tiebreaker === 'ceo_first') {
        primary = ties.find(([k]) => k === 'CEO')?.[0] || ties[0][0];
      } else {
        // raw_signal_count: count keyword hits per category
        const counts: Record<string, number> = {};
        for (const [cat] of ties) {
          const cfg = getCategoryConfig(config, cat);
          counts[cat] = countSignalHits(adv, cfg);
        }
        primary = ties.sort((a, b) => (counts[b[0]] || 0) - (counts[a[0]] || 0))[0][0];
      }
    }
  }

  return {
    ceo: Math.round(ceoScore),
    cto: Math.round(ctoScore),
    coo: Math.round(cooScore),
    marketing: Math.round(marketingScore),
    ai: Math.round(aiScore),
    primary,
  };
}

/** Look up category config by key */
function getCategoryConfig(config: AppConfig, key: CategoryKey): CategoryConfig {
  switch (key) {
    case 'CEO': return config.category_ceo;
    case 'CTO': return config.category_cto;
    case 'COO': return config.category_coo;
    case 'Marketing': return config.category_marketing;
    case 'AI': return config.category_ai;
  }
}

/** Compute a single category score (0–100) */
function computeCategoryScore(
  adv: Partial<Advisor>,
  cat: CategoryConfig,
  catKey: string
): number {
  const allText = [
    adv.nonTechSubjects || '',
    adv.expAreas || '',
    adv.expDetail || '',
    adv.cLevelDetail || '',
    adv.notes || '',
    adv.position || '',
    adv.supportIn || '',
    adv.supportVia || '',
    adv.techSpecs || '',
  ].join(' ').toLowerCase();

  // Keyword hit count
  let keywordScore = 0;
  for (const kw of cat.keywords) {
    if (allText.includes(kw.toLowerCase())) {
      keywordScore += 5;
    }
  }
  keywordScore = Math.min(keywordScore, 40);

  // Area weights
  let areaScore = 0;
  const subjects = (adv.nonTechSubjects || '').split(',').map(s => s.trim());
  for (const subj of subjects) {
    for (const [area, weight] of Object.entries(cat.areaWeights)) {
      if (subj.toLowerCase().includes(area.toLowerCase())) {
        areaScore += weight * 5;
      }
    }
  }
  areaScore = Math.min(areaScore, 30);

  // Title boost
  const pos = (adv.position || '').toLowerCase();
  let titleScore = 0;
  const titleKeywords = getTitleKeywords(catKey);
  for (const tk of titleKeywords) {
    if (pos.includes(tk)) {
      titleScore = cat.titleBoost;
      break;
    }
  }

  // Tech rating bias
  let techBias = 0;
  if (cat.techRatingBias > 0) {
    const techVal = parseFloat(adv.techRating || '0');
    if (!isNaN(techVal) && techVal >= cat.techRatingBias) {
      techBias = 10;
    }
  }

  // C-level detail boost
  let cLevelBoost = 0;
  if (/yes/i.test(adv.cLevel || '') && (adv.cLevelDetail || '').length > 10) {
    const detail = (adv.cLevelDetail || '').toLowerCase();
    for (const kw of cat.keywords.slice(0, 5)) {
      if (detail.includes(kw.toLowerCase())) {
        cLevelBoost += 3;
      }
    }
    cLevelBoost = Math.min(cLevelBoost, 15);
  }

  return Math.min(keywordScore + areaScore + titleScore + techBias + cLevelBoost, 100);
}

/** Get title keywords for a specific category */
function getTitleKeywords(catKey: string): string[] {
  switch (catKey) {
    case 'ceo':
      return ['ceo', 'founder', 'managing director', 'chief executive'];
    case 'cto':
      return ['cto', 'vp engineering', 'chief technology', 'head of engineering'];
    case 'coo':
      return ['coo', 'vp operations', 'chief operating', 'head of operations'];
    case 'marketing':
      return ['cmo', 'marketing', 'branding', 'chief marketing', 'head of marketing', 'vp marketing'];
    case 'ai':
      return ['data scientist', 'machine learning', 'ai', 'artificial intelligence', 'head of ai', 'chief ai'];
    default:
      return [];
  }
}

/** Count signal hits for tiebreaking */
function countSignalHits(adv: Partial<Advisor>, cat: CategoryConfig): number {
  const allText = [
    adv.nonTechSubjects, adv.expAreas, adv.expDetail,
    adv.cLevelDetail, adv.position, adv.notes,
  ].filter(Boolean).join(' ').toLowerCase();

  return cat.keywords.filter(kw => allText.includes(kw.toLowerCase())).length;
}

/**
 * Score a full advisor (both stages).
 * Stage 2 only runs if Stage 1 passes.
 */
export function scoreAdvisor(adv: Partial<Advisor>, config: AppConfig = DEFAULT_CONFIG): { stage1: Stage1Score; stage2: Stage2Score } {
  const stage1 = computeStage1(adv, config);
  const stage2 = stage1.pass
    ? computeStage2(adv, config)
    : { ceo: 0, cto: 0, coo: 0, marketing: 0, ai: 0, primary: 'Unqualified' as const };
  return { stage1, stage2 };
}
