
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates personalized interaction. The system
 * learns a user's preferred communication style (e.g., formal, concise, humorous)
 * and stores this as a NARS belief. When generating subsequent natural language
 * responses, it uses this preference to instruct the LM, tailoring the tone and
 * style of the output to the specific user.
 */
describe('Experimental: LM-driven Personalized Interaction Style', () => {

  it('should tailor its response style based on a learned user preference', async () => {
    const core = createCore();

    // 1. The system infers or is told about a user's preference.
    //    This is stored as a property of the 'user' agent.
    await core.addInput('(user --} prefers_casual_style).');

    // 2. The system needs to explain a fact, e.g., why the sky is blue.
    //    It has the core knowledge in Narsese.
    await core.addInput('(sky --} blue_because_of_rayleigh_scattering).');

    // 3. A hypothetical "response generation" module retrieves the user's preference.
    const userPreference = await core.memory.getProperty('user', 'prefers_casual_style');
    expect(userPreference).toBeDefined();

    // 4. The module sends the core fact and the style preference to the LM.
    //    LM Prompt (using a 'generateStyledResponse' function):
    //    "Explain the fact that the sky is blue because of Rayleigh scattering.
    //     Style requirement: Casual and simple."
    const casualResponse = await core.lm.generateStyledResponse({
      fact: 'The sky is blue because of Rayleigh scattering.',
      style: 'casual'
    });

    // 5. The LM should generate a response in the requested style.
    expect(casualResponse).toBeDefined();
    expect(casualResponse.toLowerCase()).not.toContain('due to the phenomenon of');
    expect(casualResponse.toLowerCase()).toContain("it's basically because");
    expect(casual_response.toLowerCase()).toContain("tiny air molecules scatter blue light more than other colors");

    // 6. Now, let's test a different style for contrast.
    await core.addInput('(user --} prefers_formal_style).');
    const formalResponse = await core.lm.generateStyledResponse({
      fact: 'The sky is blue because of Rayleigh scattering.',
      style: 'formal'
    });

    // 7. The formal response should be structured differently.
    expect(formalResponse).toBeDefined();
    expect(formalResponse.toLowerCase()).toContain('the coloration of the sky is attributed to');
    expect(formalResponse.toLowerCase()).toContain('a phenomenon known as rayleigh scattering');
  });
});
