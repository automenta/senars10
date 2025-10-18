import Core from './Core.js';

async function createCore(config = {}) {
  const core = new Core();
  await core.initialize(config);
  return core;
}

export default createCore;
export { createCore };