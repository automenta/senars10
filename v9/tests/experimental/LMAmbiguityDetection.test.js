
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite demonstrates how the system handles ambiguity in
 * natural language. When a user's command is vague, the system uses the LM to
 * identify multiple possible interpretations. It then translates these into
 * distinct Narsese statements and presents them back to the user in a
 * clarifying question, preventing the reasoner from acting on a wrong assumption.
 */
describe('Experimental: LM-driven Ambiguity Detection and Clarification', () => {

  it('should ask for clarification when a command is ambiguous', async () => {
    const core = createCore();

    // 1. The user gives an ambiguous command. "Play 'Fire'" could mean a song, a movie, etc.
    const ambiguousCommand = "Play 'Fire'";

    // 2. A hypothetical "input processing" module sends the command to the LM to check for ambiguity.
    //    LM Prompt (using 'identifyAmbiguity' function):
    //    "The command is 'Play \'Fire\''. What are the different possible interpretations
    //     of what 'Fire' refers to? List the specific types of media."
    const interpretations = await core.lm.identifyAmbiguity(ambiguousCommand);

    // 3. The LM should return the different possible meanings.
    expect(interpretations).toEqual(expect.arrayContaining([
      { type: 'song', artist: 'Jimi Hendrix' },
      { type: 'movie', year: '1996' },
      { type: 'book', author: 'Kristin Cashore' }
    ]));

    // 4. The system translates these interpretations into distinct, actionable Narsese operations.
    const option1 = "play(song, 'Fire_by_Jimi_Hendrix')!";
    const option2 = "play(movie, 'Fire_1996')!";
    const option3 = "play(book, 'Fire_by_Kristin_Cashore')!";

    // 5. The system then uses the LM to generate a natural language question for the user.
    //    LM Prompt (using 'generateClarification' function):
    //    "I received the command 'Play \'Fire\''. To proceed, I need to know which
    //     one you mean. Present the following options to the user:
    //     1. The song 'Fire' by Jimi Hendrix.
    //     2. The 1996 movie 'Fire'.
    //     3. The book 'Fire' by Kristin Cashore."
    const clarificationQuestion = await core.lm.generateClarification(ambiguousCommand, interpretations);

    // 6. The generated question should be clear and present the options.
    expect(clarificationQuestion).toContain("Which 'Fire' did you mean?");
    expect(clarificationQuestion).toContain("song by Jimi Hendrix");
    expect(clarificationQuestion).toContain("1996 movie");

    // The system would then await user input to resolve the ambiguity before proceeding.
  });
});
