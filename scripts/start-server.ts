#!/usr/bin/env ts-node

import { server } from '../lib/server';

async function startServer() {
  try {
    console.log('Starting ContextForge background services...');
    
    // Load environment variables
    require('dotenv').config();
    
    // Initialize the server
    await server.initialize();
    
    console.log('Background services started successfully');
    console.log('Server status:', JSON.stringify(server.getStatus(), null, 2));
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this script is run directly
if (require.main === module) {
  startServer();
}

export default startServer;