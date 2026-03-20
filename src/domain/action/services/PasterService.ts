import { ClipboardPort } from '../ports/ClipboardPort';

export class PasterService {
  constructor(private readonly clipboard: ClipboardPort) {}

  paste(_text: string): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  pasteAll(_text: string): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }
}
