// JSON serialization system
class JSONSerializer {
  serialize(data) {
    return JSON.stringify(data);
  }

  deserialize(json) {
    return JSON.parse(json);
  }

  toNarsese(json) {
    const parsed = JSON.parse(json);
    return `[Narsese from JSON: ${JSON.stringify(parsed)}]`;
  }

  fromNarsese(narsese) {
    return { convertedFrom: narsese, type: 'narsese' };
  }
}

export default JSONSerializer;