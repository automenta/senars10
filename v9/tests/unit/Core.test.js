import Core from '../../core/orchestration/Core.js';
import Component from '../../core/base/Component.js';
import Config from '../../core/config/Config.js';

class TestComponent extends Component {
  constructor(name, callOrderArray) {
    super();
    this.name = name;
    this.callOrder = callOrderArray;
    this.config = {};
  }
  async initialize(config) {
    this.config = config;
    this.callOrder.push(`init:${this.name}`);
    await super.initialize(config);
  }
  async start() {
    this.callOrder.push(`start:${this.name}`);
    await super.start();
  }
  async stop() {
    this.callOrder.push(`stop:${this.name}`);
    await super.stop();
  }
  async destroy() {
    this.callOrder.push(`destroy:${this.name}`);
    await super.destroy();
  }
  use(middleware) {} // Add a dummy use method to the mock
  on(event, handler) {} // Mock the on method
  off(event, handler) {} // Mock the off method
  emit(event, data) {} // Mock the emit method
}

describe('Core', () => {
  let core;

  beforeEach(() => {
    core = new Core();
  });

  test('should instantiate with real config and messages components', () => {
    expect(core.getComponent('config')).toBeDefined();
    expect(core.getComponent('messages')).toBeDefined();
    expect(core.config).toBe(core.getComponent('config'));
    expect(core.messages).toBe(core.getComponent('messages'));
  });

  describe('Lifecycle Management', () => {
    let callOrder;
    let compA, compB;

    beforeEach(() => {
      core = new Core();
      callOrder = [];

      // Create a test config that tracks initialization
      class TestConfig extends Config {
        async initialize(cfg) {
          callOrder.push('init:config');
          return super.initialize(cfg);
        }
      }

      core.componentMap.set('config', new TestConfig());
      core.componentMap.set('messages', new TestComponent('messages', callOrder));

      compA = new TestComponent('compA', callOrder);
      compB = new TestComponent('compB', callOrder);

      core.registerComponent('compA', compA);
      core.registerComponent('compB', compB);
    });

    test('initialize should initialize all components in registration order', async () => {
      const initialConfig = { components: { compA: { setting: 123 } } };
      await core.initialize(initialConfig);

      expect(callOrder).toEqual(['init:config', 'init:messages', 'init:compA', 'init:compB']);

      expect(compA.config).toEqual({ setting: 123 });
      expect(compB.config).toEqual({});
    });

    test('start should start all components in registration order', async () => {
      // Initialize first to avoid automatic initialization adding to callOrder during start()
      await core.initialize({});
      // Instead of reassigning callOrder, clear the existing array
      callOrder.length = 0; // Clear the call order to only track start events
      await core.start();
      expect(callOrder).toEqual(['start:messages', 'start:compA', 'start:compB']);
    });

    test('stop should stop all components in reverse registration order', async () => {
      // Create a test config that tracks stop calls
      class TestConfig extends Config {
        async stop() {
          callOrder.push('stop:config');
          return super.stop();
        }
      }

      core.componentMap.set('config', new TestConfig());
      await core.stop();
      expect(callOrder).toEqual(['stop:compB', 'stop:compA', 'stop:messages', 'stop:config']);
    });

    test('destroy should destroy all components in reverse registration order', async () => {
      // Create a test config that tracks destroy calls
      class TestConfig extends Config {
        async destroy() {
          callOrder.push('destroy:config');
          return super.destroy();
        }
      }

      core.componentMap.set('config', new TestConfig());
      await core.destroy();
      expect(callOrder).toEqual(['destroy:compB', 'destroy:compA', 'destroy:messages', 'destroy:config']);
    });
  });
});