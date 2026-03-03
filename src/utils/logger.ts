/**
 * Simple Logger utility satisfying RNF.11
 * Tracks errors, application usage, and performance.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
}

class Logger {
    private static instance: Logger;

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: LogLevel, message: string, context?: any): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };
    }

    public info(message: string, context?: any) {
        const log = this.formatMessage('info', message, context);
        console.info(`[INFO] ${log.timestamp}: ${message}`, context || '');
        // In a real production environment, this would send to a centralized logging service
    }

    public warn(message: string, context?: any) {
        const log = this.formatMessage('warn', message, context);
        console.warn(`[WARN] ${log.timestamp}: ${message}`, context || '');
    }

    public error(message: string, context?: any) {
        const log = this.formatMessage('error', message, context);
        console.error(`[ERROR] ${log.timestamp}: ${message}`, context || '');
    }

    public logPerformance(metric: string, value: number) {
        this.info(`Performance Metric: ${metric}`, { value: `${value}ms` });
    }
}

export const logger = Logger.getInstance();
