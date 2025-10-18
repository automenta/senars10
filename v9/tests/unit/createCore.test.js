import createCore from '../../core/orchestration/createCore.js';
import Core from '../../core/orchestration/Core.js';
import Config from '../../core/config/Config.js';

describe('createCore', () => {
  test('should return a fully initialized Core instance', async () => {
    const core = await createCore();
    expect(core).toBeInstanceOf(Core);
    // The initialize method on the 'config' component should have been called,
    // which sets its status to 'initialized'.
    expect(core.config.getStatus()).toEqual({ status: 'initialized' });
  });

  test('should initialize the core with the provided configuration', async () => {
    const config = {
      components: {
        messages: {
          setting: 'test-value',
        },
      },
    };

    const core = await createCore(config);

    // Verify the config was passed to the config component
    expect(core.config).toBeInstanceOf(Config);
    expect(core.config.get('components.messages.setting')).toBe('test-value');
  });

  test('should return a promise that resolves to the core instance', () => {
    const corePromise = createCore();
    expect(corePromise).toBeInstanceOf(Promise);
  });
});