import { RequestError, request } from './request';
import { errorLog } from '../tools/log';

import type { Session } from '../lib/session';
import type { JsonClass } from '../tools/util';

export { RequestError } from './request';

export default { RequestError, getSessions, quitServer };

type SessionResult =
  | { err: RequestError }
  | { err: null; session_list: JsonClass<typeof Session>[] };
export async function getSessions(): Promise<SessionResult> {
  const opts = { url: '/api/1/session' };
  interface SessionListBody {
    session_list: JsonClass<typeof Session>[];
  }
  const result = await request<SessionListBody>(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    return { err: new RequestError('NO_SERVER', result.err) };
  } else if (result.err) {
    errorLog('client.getSessions: err:', result.err);
    return { err: result.err };
  } else if (!result.body) {
    errorLog('client.getSessions: bad body:', result);
    return { err: new RequestError('BAD_BODY') };
  }
  return { err: null, session_list: result.body.session_list };
}
export async function quitServer(): Promise<RequestError | null> {
  const opts = { url: '/quit' };
  const result = await request(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    return new RequestError('NO_SERVER', result.err);
  } else if (result.err) {
    errorLog('client.quitServer: err:', result.err);
    return result.err;
  }
  return null;
}
