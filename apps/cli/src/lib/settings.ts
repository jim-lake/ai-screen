import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { jsonParse } from '@ai-screen/shared';

import { errorLog } from '../tools/log';
import { isCode } from '../tools/util';

import type { JSONObject, JSONValue } from '@ai-screen/shared';

export default { loadSettings, saveSettings };

const DIR = join(homedir(), '.ai-screen');
const FILE = join(DIR, 'settings.json');

export async function loadSettings(
  subkey?: string
): Promise<JSONObject | undefined> {
  let ret: JSONObject | undefined;
  try {
    const data = await readFile(FILE, { encoding: 'utf8' });
    console.log("data:", data);
    ret = jsonParse(data);
    console.log("ret:", ret);
    if (ret && subkey) {
      const sub = ret[subkey];
      console.log(subkey, sub, _isObj(sub));
      if (_isObj(sub)) {
        ret = sub;
      } else {
        ret = undefined;
      }
    }
  } catch (e) {
    errorLog('loadSettings: threw:', e);
  }
  console.log("return:", ret);
  return ret;
}

let g_promise: Promise<JSONObject> | undefined;

export interface SaveParams {
  parentKey?: string;
  obj: JSONObject;
}
export async function saveSettings(params: SaveParams) {
  const { parentKey } = params;
  let settings: JSONObject | undefined;
  while (g_promise) {
    settings = await g_promise;
  }
  g_promise = (async (): Promise<JSONObject> => {
    settings ??= (await loadSettings()) ?? {};
    if (parentKey) {
      if (!_isObj(settings[parentKey])) {
        settings[parentKey] = {};
      }
      Object.assign(settings[parentKey], params.obj);
    } else {
      Object.assign(settings, params.obj);
    }
    await _mkdir(DIR);
    const json = JSON.stringify(settings, null, '  ') + "\n";
    await writeFile(FILE, json, { encoding: 'utf8' });
    return settings;
  })();
  void (await g_promise);
  g_promise = undefined;
}
function _isObj(obj: JSONValue): obj is JSONObject {
  return Boolean(obj && typeof obj === 'object' && !Array.isArray(obj));
}
async function _mkdir(path: string) {
  try {
    await mkdir(path);
  } catch (e) {
    if (!isCode(e, 'EEXIST')) {
      throw e;
    }
  }
}
