import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';
import { getIO } from '../realtime/socket';

export const sendMessageSchema = z.object({
    body: z.object({
        type: z.enum(['CHAT', 'INSTRUCTION', 'TASK']),
        text: z.string().min(1),
        priority: z.enum(['NORMAL', 'URGENT']).optional().default('NORMAL'),
    }),
});

export const updateTaskSchema = z.object({
    body: z.object({
        status: z.enum(['PENDING', 'DONE']),
    }),
});

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const { type, text, priority } = req.body;
        const { id: userId, role } = req.user!;

        // Authorization checks
        if (role === 'NURSE' && type !== 'CHAT') {
            return errorResponse(res, 'Nurses can only send CHAT messages', 403);
        }
        // Doctor can send anything

        const message = await prisma.message.create({
            data: {
                episodeId,
                senderUserId: userId,
                type,
                text,
                priority,
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            }
        });

        // Create TaskStatus if TASK
        if (type === 'TASK') {
            await prisma.taskStatus.create({
                data: {
                    messageId: message.id,
                    status: 'PENDING',
                },
            });
        }

        // Emit Realtime
        const io = getIO();
        // Re-fetch to include taskStatus if needed, or just emit message. 
        // Usually frontend needs to know if it's a task and its status.
        const fullMessage = await prisma.message.findUnique({
            where: { id: message.id },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                taskStatus: true
            }
        });

        io.to(`episode:${episodeId}`).emit('new_message', fullMessage);

        return successResponse(res, { message: fullMessage }, 'Message sent', 201);
    } catch (error) {
        next(error);
    }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const messages = await prisma.message.findMany({
            where: { episodeId },
            orderBy: { createdAt: 'asc' }, // Chat history order
            include: {
                sender: { select: { id: true, name: true, role: true } },
                taskStatus: true,
            },
        });

        return successResponse(res, { messages });
    } catch (error) {
        next(error);
    }
};

export const updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body; // Expect DONE
        const userId = req.user!.id;

        // Verify it is a task
        const taskStatus = await prisma.taskStatus.findUnique({ where: { messageId } });
        if (!taskStatus) {
            return errorResponse(res, 'Task not found', 404);
        }

        const updatedTask = await prisma.taskStatus.update({
            where: { messageId },
            data: {
                status,
                updatedByUserId: userId,
            },
            include: { message: true }
        });

        // Emit event
        const io = getIO();
        io.to(`episode:${updatedTask.message.episodeId}`).emit('task_updated', {
            messageId,
            status,
            updatedBy: userId,
        });

        return successResponse(res, { taskStatus: updatedTask }, 'Task updated');
    } catch (error) {
        next(error);
    }
};
