import { Window } from "./window";

export class Session {
  public name: string;
  public windows: Window[] = [];
  private windowCounter = 0;

  constructor(name: string) {
    this.name = name;
  }

  public createWindow(command?: string[]): Window {
    const window = new Window(this.windowCounter++, command);
    this.windows.push(window);
    return window;
  }
}
