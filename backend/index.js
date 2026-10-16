import cluster from 'cluster';
import os from 'os';

import { expressServer } from './app.js';
import { ENV_VARS } from './config/env.config.js';
import { connectDB } from './config/db.config.js';

/**
 * Determines the number of available CPU cores on the system.
 */
let totalCPUs = os.cpus().length || 2;

let isShuttingDown = false;

/**
 * Primary cluster process manages worker lifecycle.
 */
if (cluster.isPrimary) {
  console.log(`Primary Server ${process.pid} is running`);

  // Gracefully handle termination signals from Docker (SIGTERM, SIGINT)
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => {
      isShuttingDown = true;
      console.log(`Primary received ${signal}, stopping workers cleanly...`);
      for (const id in cluster.workers) {
        try {
          cluster.workers[id]?.process.kill(signal);
        } catch (e) {}
      }
      setTimeout(() => process.exit(0), 1000);
    });
  });

  // Fork worker processes
  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  /**
   * Only restart dead workers if the server is NOT shutting down.
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited (code: ${code}, signal: ${signal})`);
    if (!isShuttingDown) {
      cluster.fork();
    }
  });
} else {
  // Worker processes run the Express application
  const app = expressServer();

  const { PORT, CLIENT_URL } = ENV_VARS;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} is up and running on port: ${PORT}`);
    console.log(`➜  Server:   http://localhost:${PORT}`);
    console.log(`➜  Website:   ${CLIENT_URL}`);
    connectDB();
  });
}
