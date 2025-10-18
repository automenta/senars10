import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import { setTimeout } from 'timers/promises';

// Final integration test to ensure the UI and server work together with simple protocol
test('UI Integration Test - Full Simple Protocol Functionality', async (t) => {
  // Start the server
  const serverProcess = spawn('node', ['core/server.mjs'], {
    cwd: '.',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    let serverReady = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('SeNARS server listening on port 8080')) {
        serverReady = true;
        console.log('✓ Server started successfully');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    setTimeout(10000).then(() => {
      if (!serverReady) {
        reject(new Error('Server failed to start within 10 seconds'));
      }
    });
  });

  // Wait for complete initialization
  await setTimeout(2000);

  try {
    // Test using the URL parameter approach that matches the UI implementation
    await t.test('should work with URL parameter protocol detection', async () => {
      const connectResult = await new Promise((resolve, reject) => {
        // Connect using URL parameter (mimicking the UI approach)
        const ws = new WebSocket('ws://localhost:8080?protocol=simple');

        let connected = false;
        let receivedInitialState = false;
        let receivedUpdateAfterCommand = false;
        
        ws.on('open', () => {
          connected = true;
          console.log('✓ Connected to server with protocol=simple parameter');
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (!receivedInitialState) {
              // Initial state
              receivedInitialState = true;
              console.log(`✓ Received initial state with ${message.payload.tasks.length} tasks`);
              
              // Verify structure
              assert.ok(Array.isArray(message.payload.tasks));
              assert.ok(Array.isArray(message.payload.concepts));
              assert.ok(Array.isArray(message.payload.logs));
              assert.ok(message.payload.stats);
              
              // Send a command to test the feedback loop
              const addCommand = {
                type: 'control',
                command: 'add_task',
                payload: {
                  content: 'UI Integration Test Task',
                  priority: 0.6,
                  type: 'Input',
                  status: 'Input'
                }
              };
              ws.send(JSON.stringify(addCommand));
              console.log('✓ Sent add_task command');
            } else {
              // State update after command
              receivedUpdateAfterCommand = true;
              console.log(`✓ Received updated state with ${message.payload.tasks.length} tasks after command`);
              
              // Look for our test task
              const testTask = message.payload.tasks.find(task => 
                task.content === 'UI Integration Test Task'
              );
              
              if (testTask) {
                console.log('✓ Test task found in updated state');
                assert.equal(testTask.priority, 0.6);
                assert.equal(testTask.type, 'Input');
                assert.equal(testTask.status, 'Input');
                
                // Also test update functionality
                const updateCommand = {
                  type: 'control',
                  command: 'update_task',
                  payload: {
                    id: testTask.id,
                    priority: 0.9,
                    status: 'Processed'
                  }
                };
                ws.send(JSON.stringify(updateCommand));
                console.log('✓ Sent update_task command');
              } else {
                // If it's the update after the update command
                const updatedTask = message.payload.tasks.find(task => 
                  task.content === 'UI Integration Test Task' && task.priority === 0.9
                );
                
                if (updatedTask) {
                  console.log('✓ Task update confirmed in state');
                  assert.equal(updatedTask.status, 'Processed');
                  assert.equal(updatedTask.priority, 0.9);
                  ws.close();
                  resolve(true);
                }
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(10000).then(() => {
          ws.close();
          if (!receivedUpdateAfterCommand) {
            reject(new Error('Did not receive expected state updates'));
          }
        });
      });
      
      assert.ok(connectResult, 'Integration test should complete successfully');
    });

    // Test all major functionality 
    await t.test('should support all major UI operations', async () => {
      const operationsResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080?protocol=simple');

        let step = 0;
        let createdTaskId = null;
        
        ws.on('open', () => {
          console.log('✓ Connected for operations test');
          step = 1;
          // Add a task
          const addCommand = {
            type: 'control',
            command: 'add_task',
            payload: {
              content: 'Operation Test Task',
              priority: 0.5
            }
          };
          ws.send(JSON.stringify(addCommand));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (step === 1) {
              // After adding - find the created task
              const newTask = message.payload.tasks.find(task => 
                task.content === 'Operation Test Task'
              );
              if (newTask) {
                createdTaskId = newTask.id;
                console.log('✓ Task creation confirmed, ID:', createdTaskId);
                step = 2;
                
                // Now update the task
                const updateCommand = {
                  type: 'control',
                  command: 'update_task',
                  payload: {
                    id: createdTaskId,
                    priority: 0.8,
                    status: 'Updated'
                  }
                };
                ws.send(JSON.stringify(updateCommand));
              }
            } else if (step === 2) {
              // After updating - verify update
              const updatedTask = message.payload.tasks.find(task => 
                task.id === createdTaskId && task.priority === 0.8
              );
              if (updatedTask) {
                console.log('✓ Task update confirmed');
                step = 3;
                
                // Now delete the task
                const deleteCommand = {
                  type: 'control',
                  command: 'delete_task',
                  payload: {
                    id: createdTaskId
                  }
                };
                ws.send(JSON.stringify(deleteCommand));
              }
            } else if (step === 3) {
              // After deleting - verify deletion
              const deletedTask = message.payload.tasks.find(task => 
                task.id === createdTaskId
              );
              if (!deletedTask && message.payload.tasks.length > 0) {  // Should still have other tasks
                console.log('✓ Task deletion confirmed');
                step = 4;
                
                // Test reset command
                const resetCommand = {
                  type: 'control',
                  command: 'reset'
                };
                ws.send(JSON.stringify(resetCommand));
              }
            } else if (step === 4) {
              // After reset - should have 2 initial tasks
              if (message.payload.tasks.length === 2) {
                console.log('✓ Reset command confirmed - back to 2 initial tasks');
                // Verify initial tasks exist
                const task1 = message.payload.tasks.find(t => t.content === '(a-->b).');
                const task2 = message.payload.tasks.find(t => t.content === '(b-->c).');
                
                if (task1 && task2) {
                  console.log('✓ Initial tasks found after reset');
                  ws.close();
                  resolve(true);
                }
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(15000).then(() => {
          ws.close();
          if (step < 4) {
            reject(new Error(`Operations test incomplete, reached step ${step}`));
          }
        });
      });
      
      assert.ok(operationsResult, 'Operations test should complete successfully');
    });

  } finally {
    // Clean up
    serverProcess.kill('SIGTERM');
  }
});

console.log('Running UI Integration Test for Simple Protocol...');