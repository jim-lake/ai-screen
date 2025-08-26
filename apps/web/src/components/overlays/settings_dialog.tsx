import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from '../base_components';
import BusyOverlay from '../busy_overlay';

import Dialog from './dialog';
import Select from '../select';
import TextButton from '../buttons/text_button';

import { useSetting, fetch, saveSettings } from '../../stores/setting_store';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from '../../lib/defaults';
import { useBusy } from '../../tools/util';

import type { JSONObject } from '@ai-screen/shared';

const styles = StyleSheet.create({
  settingsDialog: {
    margin: 'auto',
    width: '50vw',
    minWidth: '30rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  inner: {
    alignSelf: 'stretch',
    margin: '1.5rem',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: 'black', fontSize: '1.5rem', fontWeight: '500' },
  line: {
    marginTop: '1rem',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: 'black', fontSize: '1.4rem' },
  select: {
    paddingLeft: '1rem',
    paddingRight: '1rem',
    height: '2.5rem',
    minWidth: '15rem',
    color: 'black',
    fontSize: '1.4rem',
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: '0.4rem',
    borderColor: '#ccc',
    textAlign: 'left',
  },
  input: {
    paddingRight: '0.5rem',
    width: '5rem',
    height: '2.5rem',
    color: 'black',
    fontSize: '1.4rem',
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: '0.4rem',
    borderColor: '#ccc',
    textAlign: 'right',
  },
  preview: {
    marginLeft: '0.5rem',
    marginRight: '0.5rem',
    padding: '1rem',
    height: '10rem',
    background: 'black',
    flexDirection: 'column',
  },
  previewText: { color: '#bfbfbf' },
  spacer: { flex: 1 },
  buttons: {
    marginTop: '2rem',
    marginLeft: '1rem',
    marginRight: '1rem',
    marginBottom: '1rem',
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
});

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}
export default function SettingsDialog(props: SettingsDialogProps) {
  const [family, setFamily] = useState<string | undefined>();
  const [size, setSize] = useState<number | undefined>();
  const saved_family = useSetting('fontFamily', 'string');
  const saved_size = useSetting('fontSize', 'number');
  const [is_busy, setBusy, clearBusy] = useBusy();
  useEffect(() => {
    void fetch();
  }, []);

  const preview_family = family ?? saved_family ?? DEFAULT_FONT_FAMILY;
  const preview_size = size ?? saved_size ?? DEFAULT_FONT_SIZE;
  const preview_style = { fontFamily: preview_family, fontSize: preview_size };
  async function _onSavePress() {
    const obj: JSONObject = {};
    if (family) {
      obj.fontFamily = family;
    }
    if (size) {
      obj.fontSize = size;
    }
    if (Object.keys(obj).length > 0 && setBusy()) {
      try {
        await saveSettings(obj);
        clearBusy();
        props.onClose();
        setFamily(undefined);
        setSize(undefined);
      } catch {
        clearBusy();
        window.alert('Failed to save settings, please try again.');
      }
    }
  }
  return (
    <Dialog
      style={styles.settingsDialog}
      open={props.open}
      onClose={props.onClose}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.line}>
          <Text style={styles.label}>Font</Text>
          <Select
            style={styles.select}
            value={preview_family}
            options={['Monaco', 'Monospace', 'Courier New']}
            onChange={setFamily}
          />
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>Size</Text>
          <TextInput
            style={styles.input}
            type='number'
            value={String(preview_size)}
            onChangeText={(text) => setSize(parseInt(text))}
          />
        </View>
      </View>
      <View style={styles.preview}>
        <Text style={[styles.previewText, preview_style]}>
          This is a preview
        </Text>
        <Text style={[styles.previewText, preview_style]}>user@host:/mnt$</Text>
        <Text style={[styles.previewText, preview_style]}>
          user@host:/mnt$ ls
        </Text>
      </View>
      <View style={styles.buttons}>
        <TextButton text='Cancel' onPress={props.onClose} />
        <View style={styles.spacer} />
        <TextButton text='Save' onPress={_onSavePress} />
      </View>
      <BusyOverlay isBusy={is_busy} />
    </Dialog>
  );
}
