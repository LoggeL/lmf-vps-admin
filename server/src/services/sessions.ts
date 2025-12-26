import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { createSession, updateSessionStatus, deleteSession, getSession, addSessionMessage } from '../db';
import { v4 as uuid } from 'uuid';

const OPENCODE_PATH = '/home/fedora/.opencode/bin/opencode';

interface Session {
  id: string;
  name: string;
  workingDir: string;
  pty: pty.IPty;
  buffer: string[];
}

class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();

  create(name: string, workingDir: string = '/home/fedora'): string {
    const id = uuid();

    const ptyProcess = pty.spawn(OPENCODE_PATH, [], {
      name: 'xterm-color',
      cols: 120,
      rows: 40,
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        HOME: '/home/fedora'
      } as { [key: string]: string }
    });

    const session: Session = {
      id,
      name,
      workingDir,
      pty: ptyProcess,
      buffer: []
    };

    ptyProcess.onData((data: string) => {
      session.buffer.push(data);
      // Keep buffer limited
      if (session.buffer.length > 1000) {
        session.buffer.shift();
      }
      this.emit(`data:${id}`, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`Session ${id} exited with code ${exitCode}`);
      updateSessionStatus(id, 'terminated');
      this.sessions.delete(id);
      this.emit(`exit:${id}`, exitCode);
    });

    this.sessions.set(id, session);
    createSession({ id, name, working_dir: workingDir });

    return id;
  }

  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.pty.write(data);
    return true;
  }

  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.pty.resize(cols, rows);
    return true;
  }

  getBuffer(id: string): string[] {
    const session = this.sessions.get(id);
    return session?.buffer || [];
  }

  terminate(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.pty.kill();
    this.sessions.delete(id);
    updateSessionStatus(id, 'terminated');
    return true;
  }

  isActive(id: string): boolean {
    return this.sessions.has(id);
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  // Restore session by spawning new PTY for existing session record
  restore(id: string): boolean {
    const dbSession = getSession(id) as any;
    if (!dbSession || dbSession.status === 'terminated') return false;
    if (this.sessions.has(id)) return true; // Already active

    const ptyProcess = pty.spawn(OPENCODE_PATH, [], {
      name: 'xterm-color',
      cols: 120,
      rows: 40,
      cwd: dbSession.working_dir || '/home/fedora',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        HOME: '/home/fedora'
      } as { [key: string]: string }
    });

    const session: Session = {
      id,
      name: dbSession.name,
      workingDir: dbSession.working_dir,
      pty: ptyProcess,
      buffer: []
    };

    ptyProcess.onData((data: string) => {
      session.buffer.push(data);
      if (session.buffer.length > 1000) {
        session.buffer.shift();
      }
      this.emit(`data:${id}`, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      updateSessionStatus(id, 'terminated');
      this.sessions.delete(id);
      this.emit(`exit:${id}`, exitCode);
    });

    this.sessions.set(id, session);
    updateSessionStatus(id, 'active');
    return true;
  }
}

export const sessionManager = new SessionManager();
