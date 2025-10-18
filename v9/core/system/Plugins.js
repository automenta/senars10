import Component from '../base/Component.js';
import { Validation, ErrorHandler } from '../base/validation.js';
import { Logger } from '../base/utilities.js';

class Plugins extends Component {
  constructor() {
    super();
    this.plugins = new Map();
  }

  async _doInitialize() {
    this.plugins.clear();
  }

  async loadPlugin(plugin) {
    Validation.validatePlugin(plugin);

    this.plugins.has(plugin.id) && Logger.warn(`${this.constructor.name}: Plugin "${plugin.id}" already loaded`);

    try {
      await plugin.install(this.core);
      this.plugins.set(plugin.id, plugin);
      this.emit('plugin.loaded', { id: plugin.id });
    } catch (error) {
      Logger.error(`${this.constructor.name}: Failed to load plugin "${plugin.id}":`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId) {
    const plugin = Validation.ensureExists(this.plugins.get(pluginId), pluginId, 'Plugin');

    typeof plugin.uninstall === 'function' && await plugin.uninstall(this.core).catch(error =>
      Logger.error(`${this.constructor.name}: Error uninstalling plugin "${pluginId}":`, error));

    this.plugins.delete(pluginId);
    this.emit('plugin.unloaded', { id: pluginId });
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      version: p.version || 'N/A',
      description: p.description || 'No description'
    }));
  }
}

export default Plugins;