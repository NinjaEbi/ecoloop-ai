/**
 * EcoLoop AI — Centralized Client-Side History Service
 *
 * Persists completed EcoLoop AI reports locally in browser localStorage
 * under the dedicated 'ecoloop_history' key.
 *
 * Guarantees:
 * - Completed reports only
 * - Duplicate prevention on page refresh or re-render
 * - Isolated browser storage (no cloud DB / no login needed)
 * - Safe error handling (falls back gracefully)
 */

export interface StoredReport {
  id: string | number;
  device_type: string;
  deviceName: string;
  deviceCategory: string;
  ecoScore: number;
  ecoscore: number;
  ecoscore_band: string;
  condition: string;
  condition_score: number;
  assessment_confidence: number;
  ecoscore_breakdown: Record<string, number>;
  scoringFactors: Record<string, number>;
  recommendation_scores: Record<string, number>;
  recommended_action: string;
  recommendation: string;
  stakeholder_category: string;
  explanation: string;
  limitations: string[];
  recommendation_reasons?: string[];
  environmental_impact?: {
    waste_avoided_kg?: number;
    co2_benefit_kg?: number;
    device_mass_kg?: number;
    recoverable_materials?: string[];
    reuse_potential_rating?: string;
    estimate_disclaimer?: string;
  };
  carbonImpact?: {
    waste_avoided_kg?: number;
    co2_benefit_kg?: number;
    device_mass_kg?: number;
    recoverable_materials?: string[];
    reuse_potential_rating?: string;
    estimate_disclaimer?: string;
  };
  breakdown_details?: Record<
    string,
    {
      label: string;
      score: number;
      max: number;
      normalized: number;
      summary: string;
    }
  >;
  answers?: Record<string, unknown>;
  keyResults?: {
    condition: string;
    conditionScore: number;
    confidence: number;
    recommendedAction: string;
    stakeholderCategory: string;
    band: string;
  };
  assessmentDate: string;
}

const STORAGE_KEY = 'ecoloop_history';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Access denied or blocked
  }
  return null;
}

/**
 * Safely parse JSON from localStorage.
 */
function readStorage(): StoredReport[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Failed to read EcoLoop history from localStorage:', err);
    return [];
  }
}

/**
 * Safely write reports array to localStorage.
 */
function writeStorage(reports: StoredReport[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to persist EcoLoop history to localStorage:', err);
  }
}

export const historyService = {
  /**
   * Retrieve all saved assessment reports (newest first).
   */
  getReports(): StoredReport[] {
    const reports = readStorage();
    return reports.sort((a, b) => {
      const timeA = new Date(a.assessmentDate || 0).getTime();
      const timeB = new Date(b.assessmentDate || 0).getTime();
      return timeB - timeA;
    });
  },

  /**
   * Retrieve a single assessment report by ID.
   */
  getReport(id: string | number): StoredReport | null {
    const reports = readStorage();
    const targetId = String(id);
    return reports.find((r) => String(r.id) === targetId) || null;
  },

  /**
   * Save a completed assessment report.
   * Prevents duplicates by checking existing report ID.
   * If a report with the same ID already exists, it updates it in place.
   */
  saveReport(
    report: Partial<StoredReport> & {
      device_type: string;
      ecoscore: number;
      recommended_action: string;
    },
    answers?: Record<string, unknown>,
    deviceName?: string,
    deviceCategory?: string
  ): StoredReport {
    const reports = readStorage();

    const reportId = report.id !== undefined && report.id !== null && String(report.id).trim() !== ''
      ? report.id
      : `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const idStr = String(reportId);
    const existingIndex = reports.findIndex((r) => String(r.id) === idStr);

    const devName =
      deviceName ||
      report.deviceName ||
      report.device_type
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const devCat = deviceCategory || report.deviceCategory || 'Electronics';

    const fullReport: StoredReport = {
      id: reportId,
      device_type: report.device_type,
      deviceName: devName,
      deviceCategory: devCat,
      ecoScore: Math.round(report.ecoscore),
      ecoscore: report.ecoscore,
      ecoscore_band: report.ecoscore_band || 'Viable',
      condition: report.condition || 'assessed',
      condition_score: report.condition_score ?? 0,
      assessment_confidence: report.assessment_confidence ?? 1.0,
      ecoscore_breakdown: report.ecoscore_breakdown || {},
      scoringFactors: report.scoringFactors || report.ecoscore_breakdown || {},
      recommendation_scores: report.recommendation_scores || {},
      recommended_action: report.recommended_action,
      recommendation: report.recommendation || report.recommended_action,
      stakeholder_category: report.stakeholder_category || 'Circular Partner',
      explanation: report.explanation || '',
      limitations: report.limitations || [],
      recommendation_reasons: report.recommendation_reasons || [],
      environmental_impact: report.environmental_impact,
      carbonImpact: report.carbonImpact || report.environmental_impact,
      breakdown_details: report.breakdown_details,
      answers: answers || report.answers || {},
      keyResults: {
        condition: report.condition || 'assessed',
        conditionScore: report.condition_score ?? 0,
        confidence: report.assessment_confidence ?? 1.0,
        recommendedAction: report.recommended_action,
        stakeholderCategory: report.stakeholder_category || 'Circular Partner',
        band: report.ecoscore_band || 'Viable',
      },
      assessmentDate: report.assessmentDate || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Keep original assessment date on re-save
      fullReport.assessmentDate = reports[existingIndex].assessmentDate || fullReport.assessmentDate;
      reports[existingIndex] = fullReport;
    } else {
      reports.unshift(fullReport);
    }

    writeStorage(reports);
    return fullReport;
  },

  /**
   * Delete a single report by ID.
   */
  deleteReport(id: string | number): boolean {
    const reports = readStorage();
    const idStr = String(id);
    const filtered = reports.filter((r) => String(r.id) !== idStr);
    if (filtered.length !== reports.length) {
      writeStorage(filtered);
      return true;
    }
    return false;
  },

  /**
   * Clear all EcoLoop AI assessment reports.
   * Only deletes the dedicated 'ecoloop_history' key, leaving unrelated storage intact.
   */
  clearReports(): void {
    try {
      const storage = getStorage();
      if (storage) {
        storage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to clear EcoLoop history:', err);
    }
  },
};
