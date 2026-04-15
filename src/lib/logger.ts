type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
}

function createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
    };
}

export const logger = {
    info(message: string, context?: Record<string, unknown>) {
        const entry = createLogEntry('info', message, context);
        console.log(formatLog(entry));
    },

    warn(message: string, context?: Record<string, unknown>) {
        const entry = createLogEntry('warn', message, context);
        console.warn(formatLog(entry));
    },

    error(message: string, context?: Record<string, unknown>) {
        const entry = createLogEntry('error', message, context);
        console.error(formatLog(entry));
    },

    debug(message: string, context?: Record<string, unknown>) {
        if (process.env.NODE_ENV === 'development') {
            const entry = createLogEntry('debug', message, context);
            console.debug(formatLog(entry));
        }
    },

    // Structured log helpers for common operations
    uploadFailure(eventId: string, photoId: string, error: unknown) {
        this.error('Upload failed', {
            category: 'upload',
            eventId,
            photoId,
            error: error instanceof Error ? error.message : String(error),
        });
    },

    aiFailure(photoId: string, error: unknown) {
        this.error('AI processing failed', {
            category: 'ai',
            photoId,
            error: error instanceof Error ? error.message : String(error),
        });
    },

    queueFailure(jobId: string, error: unknown) {
        this.error('Queue job failed', {
            category: 'queue',
            jobId,
            error: error instanceof Error ? error.message : String(error),
        });
    },

    searchFailure(eventId: string, ip: string, error: unknown) {
        this.error('Face search failed', {
            category: 'search',
            eventId,
            ip,
            error: error instanceof Error ? error.message : String(error),
        });
    },

    suspiciousActivity(ip: string, reason: string) {
        this.warn('Suspicious activity detected', {
            category: 'security',
            ip,
            reason,
        });
    },
};
