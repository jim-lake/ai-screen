import { RequestError, request } from './request';

import type { Session, SessionParams } from '../lib/session';
import type { JsonClass } from '../tools/util';

export { RequestError } from './request';

export default { RequestError, getSessions, killServer, createSession };

export async function getSessions() {
  const opts = { url: '/api/1/session' };
  interface SessionListBody {
    session_list: JsonClass<typeof Session>[];
  }
  const result = await request<SessionListBody>(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    throw new Error('NO_SERVER', result.err);
  } else if (result.err) {
    throw result.err;
  } else if (!result.body) {
    throw new Error('INVALID_RESPONSE');
  }
  return result.body.session_list;
}
export async function killServer() {
  const opts = { url: '/quit' };
  const result = await request(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    throw new Error('NO_SERVER', result.err);
  } else if (result.err) {
    throw result.err;
  }
}
export async function createSession(params: SessionParams) {
  const { name, ...body } = params;
  const opts = {
    method: 'POST',
    url: `/api/1/session/${encodeURIComponent(name)}`,
    body,
  };
  const result = await request<JsonClass<typeof Session>>(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    throw new Error('NO_SERVER', { cause: result.err });
  } else if (result.status === 409) {
    throw new Error('SESSION_CONFLICT');
  } else if (result.err) {
    throw result.err;
  } else if (!result.body) {
    throw new Error('INVALID_RESPONSE');
  }
  return result.body;
}
