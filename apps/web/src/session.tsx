import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { StyleSheet, Text, View } from './components/base_components';
import ProgressSpinner from './components/progress_spinner';
import Terminal from './components/terminal';
import ImageButton from './components/buttons/image_button';
import SettingsDialog from './components/overlays/settings_dialog';

import SessionStore from './stores/session_store';
import { useTerminalSize } from './stores/connect_store';
import { useLocalState } from './tools/local_state';

import SETTINGS from './assets/img/settings_black.svg';
import EXPAND from './assets/img/expand_black.svg';
import FIT from './assets/img/fit_black.svg';
import SHRINK from './assets/img/shrink_black.svg';

import type { SessionJson } from '@ai-screen/shared';

const ZOOM_MODE_KEY = 'AI_SCREEN_ZOOM_MODE';

export const Component = Session;

const styles = StyleSheet.create({
  session: { position: 'absolute', inset: 0, flexDirection: 'column' },
  topBar: {
    marginRight: '1rem',
    marginLeft: '1rem',
    height: '3rem',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
  text: { fontSize: '1.5rem' },
  button: {
    width: '2rem',
    height: '2rem',
    padding: '0.5rem',
    borderRadius: '0.2rem',
  },
  activeZoom: {
    filter:
      'invert(42%) sepia(30%) saturate(4419%) hue-rotate(166deg) brightness(102%) contrast(101%)',
  },
});

type ZoomValues = 'SHRINK' | 'FIT' | 'EXPAND';
export default function Session() {
  const { session_name } = useParams();
  const list = SessionStore.useList();
  const session = SessionStore.useSession(session_name ?? '');
  const [show_settings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useLocalState<ZoomValues>(ZOOM_MODE_KEY, 'SHRINK');
  useEffect(() => {
    void SessionStore.fetch();
  }, [session_name]);

  function _showSettings() {
    setShowSettings(true);
  }

  let content: React.ReactNode = null;
  if (!list) {
    content = <ProgressSpinner />;
  } else if (!session) {
    content = (
      <>
        <Text style={styles.text}>Session not found</Text>
      </>
    );
  } else {
    content = (
      <>
        <SessionTopBar
          session={session}
          zoom={zoom}
          onZoomChange={setZoom}
          onSettings={_showSettings}
        />
        <Terminal session={session} zoom={zoom} />
      </>
    );
  }

  return (
    <View style={styles.session}>
      {content}
      <SettingsDialog
        open={show_settings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

interface SessionTopBarProps {
  session: SessionJson;
  zoom: ZoomValues;
  onZoomChange: (new_zoom: ZoomValues) => void;
  onSettings: () => void;
}
function SessionTopBar(props: SessionTopBarProps) {
  const { session, zoom, onZoomChange, onSettings } = props;
  const size = useTerminalSize(session.sessionName);

  return (
    <View style={styles.topBar}>
      <Text style={styles.text}>
        Session: {session.sessionName}{' '}
        {size ? `- ${size.columns}x${size.rows}` : ''}
      </Text>
      <View style={styles.spacer} />
      <ImageButton
        style={[styles.button, zoom === 'SHRINK' ? styles.activeZoom : null]}
        title='Shrink - Set font size to fit window'
        source={SHRINK}
        onPress={() => onZoomChange('SHRINK')}
      />
      <ImageButton
        style={[styles.button, zoom === 'FIT' ? styles.activeZoom : null]}
        title='Fit - Change terminal size to fit window at prefered font size'
        source={FIT}
        onPress={() => onZoomChange('FIT')}
      />
      <ImageButton
        style={[styles.button, zoom === 'EXPAND' ? styles.activeZoom : null]}
        title='Expand - Use prefered font size and allow scrolling'
        source={EXPAND}
        onPress={() => onZoomChange('EXPAND')}
      />
      <ImageButton
        style={styles.button}
        title='Settings'
        source={SETTINGS}
        onPress={() => onSettings()}
      />
    </View>
  );
}
