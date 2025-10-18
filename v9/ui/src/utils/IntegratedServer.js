// Integrated server utility for no-connection mode
class IntegratedServer {
  constructor() {
    this.port = 8080; // Default port
    this.ready = false;
  }

  async start() {
    // In the browser environment, we can't directly start the server
    // The server needs to be started separately via the node process
    console.log(`Integrated server should be running on port ${this.port}`);
    this.ready = true;
    return Promise.resolve();
  }

  async stop() {
    console.log('Integrated server stop requested');
    this.ready = false;
    return Promise.resolve();
  }

  getPort() {
    return this.port;
  }

  isReady() {
    return this.ready;
  }
}

export default IntegratedServer;