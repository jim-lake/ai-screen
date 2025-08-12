export enum CliExitCode {
  ALREADY_RUNNING = 1,
  NO_SERVER = 2,
  SESSION_CONFLICT = 3,
  UNKNOWN_ERROR = 255,
}

export default { CliExitCode };
