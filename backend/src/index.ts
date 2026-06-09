import type { Env } from './env';
import { handleRequest } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
