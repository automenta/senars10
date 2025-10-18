import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import { setTimeout } from 'timers/promises';

// Test to verify the simple message protocol implementation works completely
test('Simple WebSocket Protocol Implementation - Full Functionality Test', async (t) => {
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
        console.log('Server started successfully');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(10000).then(() => {
      if (!serverReady) {
        reject(new Error('Server failed to start within 10 seconds'));
      }
    });
  });

  // Wait a bit more for complete initialization
  await setTimeout(2000);

  try {
    // Test 1: Connect to simple protocol and receive initial state
    await t.test('should connect to simple protocol and receive initial state', async () => {
      const connectResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080', {
          headers: {
            'x-protocol': 'simple'
          }
        });

        ws.on('open', () => {
          console.log('Connected to simple protocol');
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            console.log('Received initial state with', message.payload.tasks.length, 'tasks');
            
            // Verify state structure
            assert.ok(Array.isArray(message.payload.tasks), 'Tasks should be an array');
            assert.ok(Array.isArray(message.payload.concepts), 'Concepts should be an array');
            assert.ok(Array.isArray(message.payload.logs), 'Logs should be an array');
            assert.ok(message.payload.stats, 'Stats should exist');
            
            // Verify initial tasks are present
            assert.ok(message.payload.tasks.length >= 2, 'Should have at least 2 initial tasks');
            
            // Check for expected initial tasks
            const task1 = message.payload.tasks.find(task => task.content === '(a-->b).');
            const task2 = message.payload.tasks.find(task => task.content === '(b-->c).');
            
            assert.ok(task1, 'Should have initial task (a-->b).');
            assert.ok(task2, 'Should have initial task (b-->c).');
            assert.equal(task1.priority, 0.9, 'Task 1 should have priority 0.9');
            assert.equal(task2.priority, 0.8, 'Task 2 should have priority 0.8');
            
            ws.close();
            resolve(true);
          }
        });

        ws.on('error', reject);

        setTimeout(5000).then(() => {
          ws.close();
          reject(new Error('Timeout waiting for initial state'));
        });
      });
      
      assert.ok(connectResult, 'Connection test should complete successfully');
    });

    // Test 2: Add a new task via simple protocol
    await t.test('should add a new task via simple protocol', async () => {
      const addTaskResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080', {
          headers: {
            'x-protocol': 'simple'
          }
        });

        let initialTasksReceived = false;
        let taskAddedReceived = false;
        
        ws.on('open', () => {
          console.log('Connected for add task test');
          // Send add task command
          const addTaskCommand = {
            type: 'control',
            command: 'add_task',
            payload: {
              content: 'New test task via simple protocol',
              priority: 0.7,
              type: 'Input',
              status: 'Input'
            }
          };
          ws.send(JSON.stringify(addTaskCommand));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (!initialTasksReceived) {
              // This is the initial state
              initialTasksReceived = true;
              console.log('Received initial state with', message.payload.tasks.length, 'tasks');
            } else {
              // This is the updated state after task addition
              console.log('Received updated state with', message.payload.tasks.length, 'tasks after add');
              
              const newTask = message.payload.tasks.find(task => 
                task.content === 'New test task via simple protocol'
              );
              
              if (newTask) {
                assert.equal(newTask.content, 'New test task via simple protocol');
                assert.equal(newTask.priority, 0.7);
                assert.equal(newTask.type, 'Input');
                assert.equal(newTask.status, 'Input');
                
                taskAddedReceived = true;
                console.log('Task successfully added and verified');
                ws.close();
                resolve(true);
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(5000).then(() => {
          ws.close();
          reject(new Error('Timeout waiting for task addition'));
        });
      });
      
      assert.ok(addTaskResult, 'Add task test should complete successfully');
    });

    // Test 3: Update an existing task via simple protocol
    await t.test('should update an existing task via simple protocol', async () => {
      const updateResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080', {
          headers: {
            'x-protocol': 'simple'
          }
        });

        let initialTasksReceived = false;
        let taskUpdatedReceived = false;
        
        ws.on('open', () => {
          console.log('Connected for update task test');
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (!initialTasksReceived) {
              // First state update - get an existing task to update
              initialTasksReceived = true;
              console.log('Received initial state with', message.payload.tasks.length, 'tasks');
              
              // Find a task to update (preferably one we know exists)
              const taskToUpdate = message.payload.tasks.find(task => 
                task.content.startsWith('(a-->b)') || task.content.startsWith('(b-->c)')
              );
              
              if (taskToUpdate) {
                console.log('Updating task:', taskToUpdate.id, taskToUpdate.content);
                // Send update command
                const updateTaskCommand = {
                  type: 'control',
                  command: 'update_task',
                  payload: {
                    id: taskToUpdate.id,
                    priority: 0.95,
                    status: 'Processed',
                    content: 'Updated: ' + taskToUpdate.content
                  }
                };
                ws.send(JSON.stringify(updateTaskCommand));
              } else {
                reject(new Error('No task found to update'));
              }
            } else {
              // Updated state after task modification
              console.log('Received updated state after modification');
              
              // Look for the updated task
              const updatedTask = message.payload.tasks.find(task => 
                task.content.startsWith('Updated:')
              );
              
              if (updatedTask) {
                assert.equal(updatedTask.priority, 0.95);
                assert.equal(updatedTask.status, 'Processed');
                
                taskUpdatedReceived = true;
                console.log('Task successfully updated and verified');
                ws.close();
                resolve(true);
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(5000).then(() => {
          ws.close();
          reject(new Error('Timeout waiting for task update'));
        });
      });
      
      assert.ok(updateResult, 'Update task test should complete successfully');
    });

    // Test 4: Delete a task via simple protocol
    await t.test('should delete a task via simple protocol', async () => {
      const deleteResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080', {
          headers: {
            'x-protocol': 'simple'
          }
        });

        let initialTasksReceived = false;
        let taskDeletedReceived = false;
        let initialTaskCount;
        
        ws.on('open', () => {
          console.log('Connected for delete task test');
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (!initialTasksReceived) {
              // First state update - get initial count and select a task to delete
              initialTasksReceived = true;
              initialTaskCount = message.payload.tasks.length;
              console.log('Initial task count:', initialTaskCount);
              
              // Find a task to delete (add one first if needed)
              const taskToDelete = message.payload.tasks[0]; // Delete the first task
              
              if (taskToDelete) {
                console.log('Deleting task:', taskToDelete.id, taskToDelete.content);
                // Send delete command
                const deleteTaskCommand = {
                  type: 'control',
                  command: 'delete_task',
                  payload: {
                    id: taskToDelete.id
                  }
                };
                ws.send(JSON.stringify(deleteTaskCommand));
              } else {
                reject(new Error('No task found to delete'));
              }
            } else {
              // Updated state after task deletion
              console.log('Received updated state after deletion, new count:', message.payload.tasks.length);
              
              // Verify task count decreased by 1
              if (message.payload.tasks.length === initialTaskCount - 1) {
                taskDeletedReceived = true;
                console.log('Task successfully deleted');
                ws.close();
                resolve(true);
              }
            }
          }
        });

        ws.on('error', reject);

        setTimeout(5000).then(() => {
          ws.close();
          reject(new Error('Timeout waiting for task deletion'));
        });
      });
      
      assert.ok(deleteResult, 'Delete task test should complete successfully');
    });

    // Test 5: Test control commands (start, stop, reset)
    await t.test('should handle control commands via simple protocol', async () => {
      const controlResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080', {
          headers: {
            'x-protocol': 'simple'
          }
        });

        let resetCommandSent = false;
        let resetConfirmationReceived = false;
        
        ws.on('open', () => {
          console.log('Connected for control commands test');
          // First, add a task to have something to reset
          const addCommand = {
            type: 'control',
            command: 'add_task',
            payload: {
              content: 'Task to be reset',
              priority: 0.5
            }
          };
          ws.send(JSON.stringify(addCommand));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'state_update' && message.payload) {
            if (!resetCommandSent && message.payload.tasks.some(t => t.content === 'Task to be reset')) {
              // We've confirmed the task was added, now send reset command
              resetCommandSent = true;
              console.log('Sending reset command');
              const resetCommand = {
                type: 'control',
                command: 'reset'
              };
              ws.send(JSON.stringify(resetCommand));
            } else if (resetCommandSent && message.payload.tasks.length === 2) {
              // After reset, we should be back to initial 2 tasks
              resetConfirmationReceived = true;
              console.log('Reset command processed, task count is back to 2');
              ws.close();
              resolve(true);
            }
          }
        });

        ws.on('error', reject);

        setTimeout(8000).then(() => {
          ws.close();
          reject(new Error('Timeout waiting for control commands'));
        });
      });
      
      assert.ok(controlResult, 'Control commands test should complete successfully');
    });

  } finally {
    // Clean up: kill the server process
    serverProcess.kill('SIGTERM');
  }
});