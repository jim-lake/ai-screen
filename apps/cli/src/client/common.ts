import { request } from './request';

export default { getStatus };

export interface StatusBody {
  pid: number;
  port: number;
  sock_path: string;
}
export async function getStatus() {
  const opts = { url: '/api/1/status' };
  const result = await request<StatusBody>(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    throw new Error('NO_SERVER', { cause: result.err });
  } else if (result.err) {
    throw result.err;
  } else if (!result.body) {
    throw new Error('NO_SERVER');
  }
  return result.body;
}
