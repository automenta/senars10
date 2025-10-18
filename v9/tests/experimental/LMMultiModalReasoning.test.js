
import { createCore } from '../../core/createCore';

/**
 * This experimental test suite simulates multi-modal reasoning. The system
 * receives a goal that depends on understanding a visual scene. It uses an LM
 * to process a textual description of the scene (simulating a vision module),
 * extracts the relevant facts into Narsese, and then uses its reasoner to
 * solve the goal based on this new perceptual information.
 */
describe('Experimental: LM-driven Multi-Modal Scene Understanding', () => {

  it('should achieve a goal by reasoning about a described visual scene', async () => {
    const core = createCore();

    // 1. A textual description of a visual scene (simulating image-to-text).
    const sceneDescription = "A red box is on top of a blue box. A green key is inside the red box.";

    // 2. A goal that requires understanding the scene.
    await core.addInput('get(green_key)!');

    // 3. The system uses the LM to extract structured information from the scene description.
    //    LM Prompt (using 'extractRelations' function):
    //    "From the text, describe the relationships between the objects.
    //     Text: A red box is on top of a blue box. A green key is inside the red box."
    const extractedRelations = await core.lm.extractRelations(sceneDescription);

    // The LM should return structured data.
    expect(extractedRelations).toEqual([
      { object1: 'red_box', relation: 'on_top_of', object2: 'blue_box' },
      { object1: 'green_key', relation: 'inside', object2: 'red_box' }
    ]);

    // 4. The system translates these relations into Narsese beliefs.
    await core.addInput('((red_box, on_top_of, blue_box) --> location).');
    await core.addInput('((green_key, inside, red_box) --> location).');

    // 5. The system also has background knowledge about how to get things.
    await core.addInput('(((&/, get(?X), get(?Y)) ==> get(?Z)) <==> (((?Z, inside, ?X) --> location) &| ((?X, on_top_of, ?Y) --> location))).');
    // Rough logic: To get Z, which is inside X, which is on top of Y, you must first get Y, then get X.

    // 6. NARS should now be able to reason that to get the green key, it must first
    //    interact with the red box. It should generate a subgoal.
    await core.cycle();
    const subGoal = core.memory.getTask('get(red_box)!');

    // Verify that the system has generated the necessary subgoal.
    expect(subGoal).toBeDefined();
    expect(subGoal.priority).toBeGreaterThan(0.5);
  });
});
