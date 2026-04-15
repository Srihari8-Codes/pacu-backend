import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { config } from '../config/env';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: config.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
        path: '/realtime', // As requested
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        const payload = verifyToken(token as string);
        if (!payload) {
            return next(new Error('Authentication error'));
        }
        // Attach user to socket
        (socket as any).user = payload;
        next();
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${(socket as any).user.userId}`);

        socket.on('join_episode', (episodeId: string) => {
            socket.join(`episode:${episodeId}`);
            console.log(`User joined episode:${episodeId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
