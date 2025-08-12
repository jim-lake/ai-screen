export const CLI_OPTIONS = [
  {
    flags: '-a',
    description: "Force all capabilities into each window's termcap.",
    key: 'a',
  },
  {
    flags: '-A',
    description: 'Adapt all windows to the new display width & height.',
    key: 'A',
  },
  {
    flags: '-c <file>',
    description: "Read configuration file instead of '.screenrc'.",
    key: 'c',
  },
  {
    flags: '-d [session]',
    description: 'Detach the elsewhere running screen (and reattach here).',
    key: 'd',
  },
  {
    flags: '-dmS <name>',
    description: 'Start as daemon: Screen session in detached mode.',
    key: 'DmS',
  },
  {
    flags: '-D [session]',
    description: 'Detach and logout remote (and reattach here).',
    key: 'D',
  },
  { flags: '-e <xy>', description: 'Change command characters.', key: 'e' },
  {
    flags: '-f',
    description: 'Flow control on, -fn = off, -fa = auto.',
    key: 'f',
  },
  { flags: '-fn', description: 'Flow control off.', key: 'fn' },
  { flags: '-fa', description: 'Flow control auto.', key: 'fa' },
  {
    flags: '-h <lines>',
    description: 'Set the size of the scrollback history buffer.',
    key: 'h',
  },
  {
    flags: '-i',
    description: 'Interrupt output sooner when flow control is on.',
    key: 'i',
  },
  {
    flags: '-ls, --list',
    description: 'Do nothing, just list our SockDir.',
    key: 'list',
  },
  { flags: '-L', description: 'Turn on output logging.', key: 'L' },
  {
    flags: '-m',
    description: 'ignore $STY variable, do create a new screen session.',
    key: 'm',
  },
  {
    flags: '-O',
    description: 'Choose optimal output rather than exact vt100 emulation.',
    key: 'O',
  },
  {
    flags: '-p <window>',
    description: 'Preselect the named window if it exists.',
    key: 'p',
  },
  {
    flags: '-q',
    description:
      'Quiet startup. Exits with non-zero return code if unsuccessful.',
    key: 'q',
  },
  {
    flags: '-r [session]',
    description: 'Reattach to a detached screen process.',
    key: 'r',
  },
  {
    flags: '-R [session]',
    description: 'Reattach if possible, otherwise start a new session.',
    key: 'R',
  },
  {
    flags: '-RR [session]',
    description: 'Reattach if possible, otherwise start a new session.',
    key: 'RR',
  },
  {
    flags: '-s <shell>',
    description: 'Shell to execute rather than $SHELL.',
    key: 's',
  },
  {
    flags: '-S <sockname>',
    description:
      'Name this session <pid>.sockname instead of <pid>.<tty>.<host>.',
    key: 'S',
  },
  { flags: '-t <title>', description: "Set title. (window's name).", key: 't' },
  {
    flags: '-T <term>',
    description: 'Use term as $TERM for windows, rather than "screen".',
    key: 'T',
  },
  { flags: '-U', description: 'Tell screen to use UTF-8 encoding.', key: 'U' },
  { flags: '-v, --version', description: 'Print version.', key: 'version' },
  {
    flags: '-wipe [session]',
    description: 'Do nothing, just clean up SockDir.',
    key: 'wipe',
  },
  {
    flags: '-x [session]',
    description: 'Attach to a not detached screen. (Multi display mode).',
    key: 'x',
  },
  {
    flags: '-X',
    description: 'Execute <cmd> as a screen command in the specified session.',
    key: 'X',
  },
  {
    flags: '--timeout <seconds>',
    description: 'Exit after N seconds (for testing).',
    key: 'timeout',
  },
  {
    flags: '--background <session>',
    description: 'Run session in background (internal use).',
    key: 'background',
  },
  {
    flags: '--server',
    description: 'Just run the server, do not connect to a session.',
    key: 'server',
  },
  {
    flags: '--foreground',
    description: 'Run the server in the foreground.',
    key: 'foreground',
  },
  {
    flags: '--kill-server',
    description: 'Kills the running server and all sessions.',
    key: 'killServer',
  },
] as const;
export default { CLI_OPTIONS };

type InferTypeFromFlags<T extends string> = T extends `${string}<${string}>`
  ? string
  : T extends `${string}[${string}]`
    ? string
    : boolean;

export type CliOptions = {
  [K in (typeof CLI_OPTIONS)[number] as K['key']]?: InferTypeFromFlags<
    K['flags']
  >;
};
