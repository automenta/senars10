import Tools from '../../core/system/Tools.js';

describe('Tools', () => {
  let tools;
  let testTool;
  let originalConsoleError;

  beforeEach(async () => {
    // Store original console.error and suppress it during tests to keep output clean
    originalConsoleError = console.error;
    console.error = () => {};

    tools = new Tools();

    testTool = {
      id: 'test-tool',
      description: 'A tool for testing.',
      parameters: [{ name: 'param1', required: true }],
      execute: async (params) => 'tool result',
    };

    await tools.initialize();
    tools.registerTool(testTool);
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  test('register tool', () => {
    const availableTools = tools.getAvailableTools();
    expect(availableTools.length).toBe(1);
    expect(availableTools[0].id).toBe('test-tool');
  });

  test('execute tool with correct parameters', async () => {
    const result = await tools.execute('test-tool', { param1: 'value' });
    expect(result).toBe('tool result');
  });

  test('throw error for missing required parameter', async () => {
    await expect(tools.execute('test-tool', {})).rejects.toThrow('Missing required parameter "param1" for tool "test-tool".');
  });

  test('throw error for tool not found', async () => {
    await expect(tools.execute('nonexistent-tool')).rejects.toThrow('Tool "nonexistent-tool" not found.');
  });

  test('throw error for invalid tool registration', () => {
    expect(() => tools.registerTool({ id: 'invalid' })).toThrow('tool.execute must be function, got undefined');
  });

  test('handle tool execution errors', async () => {
    testTool.execute = async () => { throw new Error('Tool failed'); };

    await expect(tools.execute('test-tool', { param1: 'value' })).rejects.toThrow('Tool failed');
  });
});