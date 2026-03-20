import { ClipboardPort } from '../ports/ClipboardPort';
import { ClipboardSnapshot } from '../value-objects/ClipboardSnapshot';

export class ClipboardService {
  private savedSnapshot: ClipboardSnapshot | null = null;

  constructor(private readonly clipboard: ClipboardPort) {}

  async readText(): Promise<string> {
    return this.clipboard.readText();
  }

  async writeText(text: string): Promise<void> {
    await this.clipboard.writeText(text);
  }

  async saveSnapshot(): Promise<ClipboardSnapshot> {
    const text = await this.clipboard.readText();
    this.savedSnapshot = ClipboardSnapshot.create(text);
    return this.savedSnapshot;
  }

  async restoreSnapshot(snapshot: ClipboardSnapshot): Promise<void> {
    await this.clipboard.writeText(snapshot.text);
  }

  async withRestoredClipboard<T>(fn: () => Promise<T>): Promise<T> {
    const snapshot = await this.saveSnapshot();
    try {
      const result = await fn();
      await this.restoreSnapshot(snapshot);
      return result;
    } catch (error) {
      await this.restoreSnapshot(snapshot).catch(() => {
        /* best-effort restore */
      });
      throw error;
    }
  }

  getSavedSnapshot(): ClipboardSnapshot | null {
    return this.savedSnapshot;
  }
}
