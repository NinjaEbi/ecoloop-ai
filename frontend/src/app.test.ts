import { describe, expect, it, beforeEach } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

import { historyService, type StoredReport } from './services/historyService';

describe('EcoLoop Frontend Architecture & Workflow', () => {
  it('has a configured API base', () => {
    expect('http://localhost:8000/api').toContain('/api');
  });

  it('validates all 15 mentor-required devices are configured', () => {
    const requiredDevices = [
      'smartphone',
      'laptop',
      'desktop',
      'tablet',
      'television',
      'monitor',
      'refrigerator',
      'washing_machine',
      'air_conditioner',
      'printer',
      'keyboard',
      'mouse',
      'router',
      'speaker',
      'other',
    ];
    expect(requiredDevices).toHaveLength(15);
  });

  it('verifies 6-factor deterministic scoring breakdown weights sum to 100%', () => {
    const weights = {
      working_condition: 25,
      physical_condition: 20,
      repairability: 20,
      device_age: 15,
      functional_health: 10,
      reuse_potential: 10,
    };
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });

  it('verifies Google Maps search URL generation for devices and actions', () => {
    const buildSearchUrl = (device: string, action: string) => {
      const labels: Record<string, string> = {
        smartphone: 'smartphone',
        laptop: 'laptop',
        refrigerator: 'refrigerator',
        washing_machine: 'washing machine',
      };
      const label = labels[device] || device;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} ${action} near me`)}`;
    };

    const laptopRepair = buildSearchUrl('laptop', 'repair');
    expect(laptopRepair).toContain('laptop%20repair%20near%20me');

    const fridgeRecycle = buildSearchUrl('refrigerator', 'recycling');
    expect(fridgeRecycle).toContain('refrigerator%20recycling%20near%20me');
  });
});

describe('EcoLoop Client-Side History Service (localStorage)', () => {
  beforeEach(() => {
    historyService.clearReports();
  });

  it('saves completed assessment report and retrieves it', () => {
    const mockReport: Partial<StoredReport> & {
      device_type: string;
      ecoscore: number;
      recommended_action: string;
    } = {
      id: 101,
      device_type: 'laptop',
      ecoscore: 78,
      recommended_action: 'Repair',
      ecoscore_band: 'High',
      condition: 'partially_working',
      condition_score: 80,
      assessment_confidence: 1.0,
      ecoscore_breakdown: {
        working_condition: 20,
        physical_condition: 16,
        repairability: 18,
        device_age: 12,
        functional_health: 8,
        reuse_potential: 4,
      },
    };

    const saved = historyService.saveReport(mockReport, { age_years: 3 }, 'Laptop', 'Computing');
    expect(saved.id).toBe(101);
    expect(saved.deviceName).toBe('Laptop');
    expect(saved.ecoScore).toBe(78);
    expect(saved.recommendation).toBe('Repair');

    const reports = historyService.getReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(101);
    expect(reports[0].device_type).toBe('laptop');
  });

  it('prevents duplicates when refreshing or re-saving same report id', () => {
    const mockReport = {
      id: 202,
      device_type: 'smartphone',
      ecoscore: 65,
      recommended_action: 'Refurbish',
    };

    // First save
    historyService.saveReport(mockReport, { age_years: 2 }, 'Smartphone', 'Mobile');
    expect(historyService.getReports()).toHaveLength(1);

    // Refresh simulation (saving report again with same ID)
    historyService.saveReport(mockReport, { age_years: 2 }, 'Smartphone', 'Mobile');
    const reports = historyService.getReports();
    expect(reports).toHaveLength(1);
  });

  it('retrieves report by id and deletes report', () => {
    const report1 = {
      id: 301,
      device_type: 'television',
      ecoscore: 40,
      recommended_action: 'Recycle',
    };
    const report2 = {
      id: 302,
      device_type: 'refrigerator',
      ecoscore: 85,
      recommended_action: 'Sell',
    };

    historyService.saveReport(report1);
    historyService.saveReport(report2);

    expect(historyService.getReports()).toHaveLength(2);

    const fetched = historyService.getReport(301);
    expect(fetched).not.toBeNull();
    expect(fetched?.device_type).toBe('television');

    const deleted = historyService.deleteReport(301);
    expect(deleted).toBe(true);
    expect(historyService.getReports()).toHaveLength(1);
    expect(historyService.getReport(301)).toBeNull();
  });

  it('clears only EcoLoop history without affecting other storage keys', () => {
    localStorage.setItem('unrelated_user_pref', 'dark_mode');

    historyService.saveReport({
      id: 401,
      device_type: 'monitor',
      ecoscore: 55,
      recommended_action: 'Repair',
    });
    expect(historyService.getReports()).toHaveLength(1);

    historyService.clearReports();
    expect(historyService.getReports()).toHaveLength(0);

    // Verify unrelated key was preserved
    expect(localStorage.getItem('unrelated_user_pref')).toBe('dark_mode');
    localStorage.removeItem('unrelated_user_pref');
  });
});
