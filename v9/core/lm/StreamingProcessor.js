// Streaming processing system
class StreamingProcessor {
  async processStream(stream, handler) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return chunks;
  }

  createStream(data) {
    return { data, type: 'stream' };
  }
}

export default StreamingProcessor;