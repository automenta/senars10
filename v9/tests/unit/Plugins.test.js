/**
 * @file: tests/unit/Plugins.test.js
 * @description: Unit tests for the Plugins component.
 */

import { jest } from '@jest/globals';
import Plugins from '../../core/system/Plugins.js';

describe('Plugins Component', () => {
  let plugins;
  let mockCore;
  let mockPlugin;

  beforeEach(() => {
    plugins = new Plugins();
    mockCore = {
      messages: {
        emit: jest.fn(),
      },
    };

    mockPlugin = {
      id: 'mock-plugin',
      version: '1.0.0',
      description: 'A plugin for testing.',
      install: jest.fn().mockResolvedValue(),
      uninstall: jest.fn().mockResolvedValue(),
    };

    plugins.core = mockCore;
    plugins.initialize();
  });

  test('should load a plugin and call its install method', async () => {
    await plugins.loadPlugin(mockPlugin);
    expect(plugins.getPlugin('mock-plugin')).toEqual(mockPlugin);
    expect(mockPlugin.install).toHaveBeenCalledWith(mockCore);
  });

  test('should unload a plugin and call its uninstall method', async () => {
    await plugins.loadPlugin(mockPlugin);
    await plugins.unloadPlugin('mock-plugin');
    expect(plugins.getPlugin('mock-plugin')).toBeUndefined();
    expect(mockPlugin.uninstall).toHaveBeenCalledWith(mockCore);
  });

  test('should throw an error if plugin is invalid', async () => {
    await expect(plugins.loadPlugin({ id: 'invalid' })).rejects.toThrow('plugin.install must be function, got undefined');
  });

  test('should throw an error when unloading a non-existent plugin', async () => {
    await expect(plugins.unloadPlugin('non-existent')).rejects.toThrow('Plugin "non-existent" not found.');
  });

  test('should list loaded plugins', async () => {
    await plugins.loadPlugin(mockPlugin);
    const loadedPlugins = plugins.listPlugins();
    expect(loadedPlugins.length).toBe(1);
    expect(loadedPlugins[0]).toEqual({
      id: 'mock-plugin',
      version: '1.0.0',
      description: 'A plugin for testing.',
    });
  });

  test('should handle errors during plugin installation', async () => {
    const error = new Error('Install failed');
    mockPlugin.install.mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(plugins.loadPlugin(mockPlugin)).rejects.toThrow('Install failed');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Plugins: Failed to load plugin "mock-plugin":', error);

    consoleErrorSpy.mockRestore();
  });
});