import { LM, setupLangChainProvider, setupXenovaProvider } from '../core/index.js';

const demonstrateLMProviders = async () => {
  console.log('🚀 Demonstrating LM Providers\n');

  console.log('1️⃣ Setting up Xenova provider (local distilgpt2)...');
  const localLM = new LM();
  setupXenovaProvider(localLM, {
    modelName: 'Xenova/distilgpt2',
    temperature: 0.7,
    maxTokens: 50,
  }, 'local');

  console.log('2️⃣ Setting up LangChain provider (OpenAI-compatible API)...');
  const apiLM = new LM();
  setupLangChainProvider(apiLM, {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 100,
  }, 'api');

  console.log('3️⃣ Testing local model...');
  try {
    const localResponse = await localLM.generateText('Hello, how are you?');
    console.log('Local response:', localResponse.slice(0, 100) + '...');
  } catch (error) {
    console.log('Local model test skipped (requires model download):', error.message);
  }

  console.log('4️⃣ Testing API model (if API key available)...');
  try {
    const apiResponse = await apiLM.generateText('Explain quantum computing simply.');
    console.log('API response:', apiResponse.slice(0, 100) + '...');
  } catch (error) {
    console.log('API model test skipped (requires API key):', error.message);
  }

  console.log('\n✅ LM Providers demonstration complete!');
};

demonstrateLMProviders().catch(console.error);