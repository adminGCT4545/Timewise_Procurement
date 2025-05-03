import { Request, Response, NextFunction } from 'express';
import { log } from './logger';
import NodeCache from 'node-cache';

// Initialize cache (adjust TTL as needed)
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Middleware for response caching
export const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = '__express__' + req.originalUrl || req.url;

    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      log.info(`Cache hit for ${req.originalUrl || req.url}`);
      res.send(cachedResponse);
    } else {
      const originalSend = res.send.bind(res);

      res.send = (body) => {
        cache.set(key, body, duration);
        log.info(`Cache set for ${req.originalUrl || req.url}`);
        return originalSend(body);
      };
      next();
    }
  };
};

// Example implementation for request batching (using a simple queue)
const requestQueue: { [key: string]: { req: Request; res: Response }[] } = {};

export const batchRequests = (req: Request, res: Response) => {
  const key = req.originalUrl || req.url;

  if (!requestQueue[key]) {
    requestQueue[key] = [];
  }

  requestQueue[key].push({ req, res });

  // Process the queue after a short delay (e.g., 10ms)
  setTimeout(() => {
    processQueue(key);
  }, 10);
};

const processQueue = async (key: string) => {
  const queue = requestQueue[key];
  if (!queue || queue.length === 0) return;

  try {
    // Simulate batch processing (replace with actual batch operation)
    const results = await Promise.all(queue.map(() => Promise.resolve({ message: 'Batch processed' })));

    // Send responses to all requests in the queue
    queue.forEach((item, index) => {
      item.res.json(results[index]);
    });
  } catch (error) {
    log.error(`Error processing batch for ${key}:`, error);
    queue.forEach(item => {
      item.res.status(500).json({ error: 'Batch processing failed' });
    });
  } finally {
    delete requestQueue[key]; // Clear the queue
  }
};