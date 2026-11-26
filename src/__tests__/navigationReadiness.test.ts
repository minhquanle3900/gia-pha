import { describe, expect, it } from 'vitest';
import { GROUP_DESTINATIONS, NAVIGATION_GROUPS, PAGE_GROUP } from '../components/navigation';
import { pinchScale } from '../features/family-tree/viewportGesture';

describe('adaptive navigation reachability', () => {
  it('keeps all ten existing pages reachable through the five groups', () => {
    const reachable = new Set([
      ...NAVIGATION_GROUPS.flatMap(group => group.destination ? [group.destination] : []),
      ...Object.values(GROUP_DESTINATIONS).flatMap(items => items.map(item => item.destination)),
    ]);
    for (const page of ['dashboard', 'tree', 'members', 'gallery', 'journal', 'book', 'rites', 'stats', 'map', 'data']) {
      expect(reachable.has(page as keyof typeof PAGE_GROUP)).toBe(true);
      expect(PAGE_GROUP[page as keyof typeof PAGE_GROUP]).toBeDefined();
    }
    expect(NAVIGATION_GROUPS).toHaveLength(5);
  });
  it('opens the exhibition directly from the heritage group and retains the archive', () => {
    expect(NAVIGATION_GROUPS.find(group => group.id === 'heritage')?.destination).toBe('exhibition');
    expect(GROUP_DESTINATIONS.heritage.map(item => item.destination)).toContain('gallery');
  });
});

describe('fan chart touch scale', () => {
  it('preserves the scale when a second contact has no measurable separation', () => {
    expect(pinchScale(1.2, 0, 100)).toBe(1.2);
  });
  it('tracks the distance ratio and stays within usable zoom bounds', () => {
    expect(pinchScale(1, 100, 150)).toBe(1.5);
    expect(pinchScale(1, 100, 900)).toBe(2.5);
    expect(pinchScale(1, 100, 10)).toBe(0.5);
  });
});
