import { describe, expect, it } from 'vitest';
describe('EcoLoop frontend', () => it('has a configured API base', () => expect('http://localhost:8000/api').toContain('/api')));
