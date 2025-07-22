import winston from 'winston';
import { Config } from './Config';
import {
  format as formatDate,
} from 'date-fns';

export class Logger {
  private logger: winston.Logger;
  private className: string;

  constructor(className: string) {
    this.className = className;
    const config = new Config();
    this.logger = winston.createLogger({
      level: config.getConfig('loggerLevel'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message }) => {
          const date = formatDate(new Date(timestamp as Date), 'MM/dd/yyyy HH:mm:ss.SSS');
          return `${date} [\x1b[34m${this.className}\x1b[0m] [\x1b[32m${level}\x1b[0m] ${message}`;
        })
      ),
      transports: [new winston.transports.Console({ level: config.getConfig('loggerLevel') })],
    });
  }

  public info(message: string) {
    this.logger.info(message);
  }

  public error(message: string) {
    this.logger.error(message);
  }

  public warn(message: string) {
    this.logger.warn(message);
  }

  public debug(message: string) {
    this.logger.debug(message);
  }
}
