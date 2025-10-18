import Memory from '../../core/Memory.js';
import { Focus } from '../../core/Focus.js';
import {
  createTestComponent,
  testLifecycleTransitions,
  createTestData,
  measurePerformance,
  expectPerformance,
  performanceThresholds,
  createTestMemoryItems,
  expectMemoryItem,
  testBulkOperations
} from './enhanced-test-utils.js';

const createMemory = (config = {}) => {
  const focus = new Focus();
  const memory = new Memory(focus);
  return memory.initialize({ cacheSize: 3, ...config }).then(() => memory);
};

describe('Memory', () => {
  const basicOperations = [
    {
      name: 'set and get',
      setup: (mem) => mem.set('key', 'value'),
      test: (mem) => expect(mem.get('key')).toBe('value')
    },
    {
      name: 'non-existent key',
      setup: () => {},
      test: (mem) => expect(mem.get('non-existent')).toBeUndefined()
    },
    {
      name: 'delete value',
      setup: (mem) => mem.set('key', 'value'),
      test: (mem) => {
        mem.delete('key');
        expect(mem.get('key')).toBeUndefined();
      }
    },
    {
      name: 'check existence',
      setup: (mem) => mem.set('key', 'value'),
      test: (mem) => {
        expect(mem.has('key')).toBe(true);
        expect(mem.has('non-existent')).toBe(false);
      }
    },
    {
      name: 'clear all',
      setup: (mem) => {
        mem.set('key1', 'value1');
        mem.set('key2', 'value2');
      },
      test: (mem) => {
        mem.clear();
        expect(mem.has('key1')).toBe(false);
        expect(mem.has('key2')).toBe(false);
      }
    }
  ];

  basicOperations.forEach(({ name, setup, test: testFn }) => {
    test(`should ${name}`, async () => {
      const memory = await createMemory();
      await setup(memory);
      testFn(memory);
    });
  });

  test('should provide memory statistics', async () => {
    const memory = await createMemory();
    memory.set('key1', 'value1');
    memory.set('key2', 'value2');

    const stats = memory.getStats();
    expect(stats.storageSize).toBeGreaterThan(0);
    expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    expect(memory.focus.getFocusSetStats()).toBeDefined();
  });

  describe('Performance', () => {
    test('should provide fast single access', async () => {
      const memory = await createMemory();
      memory.set('key', 'value');

      const accessTime = await measurePerformance(() => memory.get('key'));
      expectPerformance(accessTime, performanceThresholds.memoryOperation);
    });

    test('should maintain performance under load', async () => {
      const memory = await createMemory();
      const itemCount = 100;

      // Load data using consolidated utility
      await testBulkOperations(
        async (i) => {
          const item = createTestMemoryItems.task(`value${i}`, 5);
          memory.set(item.key, item.value, item.options);
        },
        itemCount,
        'memory-load'
      );

      // Test retrieval performance
      const retrievalTime = await measurePerformance(async () => {
        for (let i = 0; i < itemCount; i++) {
          memory.get(`task-${Date.now() - itemCount + i}`);
        }
      });

      expectPerformance(retrievalTime, performanceThresholds.bulkOperation);
    });
  });
});