import http from 'http';
import app from './app';
import { config } from './config/env';
import { initSocket } from './realtime/socket';
import prisma from './config/prisma';

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start Server
const start = async () => {
    try {
        console.log('Connecting to database...');
        // Set a timeout for the database connection
        const connectionTimeout = setTimeout(() => {
            console.error('Database connection timed out. Check your credentials and if the database is running.');
            process.exit(1);
        }, 10000);

        await prisma.$connect();
        clearTimeout(connectionTimeout);
        console.log('Database connected successfully');

        const port = config.PORT || 5000;
        server.listen(port, '0.0.0.0', () => {
            console.log(`🚀 PACU Backend Protocol established at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful Shutdown
const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(async () => {
        console.log('HTTP server closed');
        await prisma.$disconnect();
        console.log('Database disconnected');
        process.exit(0);
    });

    // If server takes too long to shut down, force exit
    setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
