export class Plugin {
    constructor(id, config = {}) {
        if (new.target === Plugin) {
            throw new TypeError('Cannot instantiate Plugin directly. Please extend the Plugin class.');
        }
        
        this.id = id;
        this.config = config;
        this.initialized = false;
        this.started = false;
        this.disposed = false;
    }

    async initialize(context) {
        if (this.initialized) {
            console.warn(`Plugin ${this.id} already initialized`);
            return true;
        }

        try {
            this.context = context;
            await this._initialize();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error(`Failed to initialize plugin ${this.id}:`, error);
            return false;
        }
    }

    async start() {
        if (!this.initialized) {
            throw new Error(`Plugin ${this.id} must be initialized before starting`);
        }

        if (this.started) {
            console.warn(`Plugin ${this.id} already started`);
            return true;
        }

        try {
            await this._start();
            this.started = true;
            return true;
        } catch (error) {
            console.error(`Failed to start plugin ${this.id}:`, error);
            return false;
        }
    }

    async stop() {
        if (!this.started) {
            console.warn(`Plugin ${this.id} is not running`);
            return true;
        }

        try {
            await this._stop();
            this.started = false;
            return true;
        } catch (error) {
            console.error(`Failed to stop plugin ${this.id}:`, error);
            return false;
        }
    }

    async dispose() {
        if (this.disposed) {
            console.warn(`Plugin ${this.id} already disposed`);
            return true;
        }

        try {
            if (this.started) await this.stop();
            await this._dispose();
            this.disposed = true;
            return true;
        } catch (error) {
            console.error(`Failed to dispose plugin ${this.id}:`, error);
            return false;
        }
    }

    async _initialize() {}
    async _start() {}
    async _stop() {}
    async _dispose() {}

    getStatus() {
        return {
            id: this.id,
            initialized: this.initialized,
            started: this.started,
            disposed: this.disposed,
            config: this.config,
        };
    }

    emitEvent(event, data, options = {}) {
        if (this.context && this.context.eventBus) {
            this.context.eventBus.emit(event, {
                timestamp: Date.now(),
                source: this.id,
                ...data
            }, {
                ...options,
                source: this.id
            });
        }
    }

    onEvent(event, handler) {
        if (this.context && this.context.eventBus) {
            this.context.eventBus.on(event, handler);
        }
    }

    offEvent(event, handler) {
        if (this.context && this.context.eventBus) {
            this.context.eventBus.off(event, handler);
        }
    }
}

export class PluginManager {
    constructor(context = {}) {
        this.context = context;
        this.plugins = new Map();
        this.initialized = false;
    }

    registerPlugin(plugin) {
        if (!(plugin instanceof Plugin)) {
            console.error('Plugin must be an instance of Plugin class');
            return false;
        }

        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin with id ${plugin.id} already registered`);
            return false;
        }

        this.plugins.set(plugin.id, plugin);
        return true;
    }

    unregisterPlugin(pluginId) {
        if (!this.plugins.has(pluginId)) {
            console.warn(`No plugin found with id ${pluginId}`);
            return false;
        }

        const plugin = this.plugins.get(pluginId);
        if (plugin.started) plugin.stop();
        if (!plugin.disposed) plugin.dispose();
        return this.plugins.delete(pluginId);
    }

    getPlugin(pluginId) {
        return this.plugins.get(pluginId) || null;
    }

    async initializeAll() {
        let allSuccessful = true;
        const promises = [];

        for (const [id, plugin] of this.plugins) {
            promises.push(
                plugin.initialize({
                    ...this.context,
                    pluginManager: this
                })
                .catch(error => {
                    console.error(`Failed to initialize plugin ${id}:`, error);
                    allSuccessful = false;
                })
            );
        }

        await Promise.all(promises);
        this.initialized = allSuccessful;
        return allSuccessful;
    }

    async startAll() {
        if (!this.initialized) {
            console.warn('Plugins should be initialized before starting');
            await this.initializeAll();
        }

        let allSuccessful = true;
        const promises = [];

        for (const [id, plugin] of this.plugins) {
            promises.push(
                plugin.start()
                .then(success => {
                    if (!success) allSuccessful = false;
                })
                .catch(error => {
                    console.error(`Failed to start plugin ${id}:`, error);
                    allSuccessful = false;
                })
            );
        }

        await Promise.all(promises);
        return allSuccessful;
    }

    async stopAll() {
        let allSuccessful = true;
        const promises = [];

        for (const [id, plugin] of this.plugins) {
            promises.push(
                plugin.stop()
                .then(success => {
                    if (!success) allSuccessful = false;
                })
                .catch(error => {
                    console.error(`Failed to stop plugin ${id}:`, error);
                    allSuccessful = false;
                })
            );
        }

        await Promise.all(promises);
        return allSuccessful;
    }

    async disposeAll() {
        let allSuccessful = true;
        const promises = [];

        for (const [id, plugin] of this.plugins) {
            promises.push(
                plugin.dispose()
                .then(success => {
                    if (!success) allSuccessful = false;
                })
                .catch(error => {
                    console.error(`Failed to dispose plugin ${id}:`, error);
                    allSuccessful = false;
                })
            );
        }

        await Promise.all(promises);
        this.plugins.clear();
        return allSuccessful;
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }
}