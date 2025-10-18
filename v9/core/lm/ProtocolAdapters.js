// Protocol adapter system
class ProtocolAdapters {
  constructor() {
    this.rest = new RESTAdapter();
    this.websocket = new WebSocketAdapter();
    this.grpc = new GRPCAdapter();
  }
}

class RESTAdapter {
  request(url, options) {
    return { url, options, adapter: 'rest', type: 'request' };
  }
}

class WebSocketAdapter {
  connect(url) {
    return { url, connected: true, type: 'websocket' };
  }
}

class GRPCAdapter {
  call(method, data) {
    return { method, data, type: 'grpc' };
  }
}

export default ProtocolAdapters;