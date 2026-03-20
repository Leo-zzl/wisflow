import type { ContentSession } from '../entities/ContentSession';
import type { PolishPort, PolishConfig } from '../ports/PolishPort';

export class PolishService {
  constructor(private readonly port: PolishPort) {}

  isAvailable(): Promise<boolean> {
    return Promise.reject(new Error('Not implemented'));
  }

  polish(_session: ContentSession, _config?: PolishConfig): Promise<ContentSession> {
    return Promise.reject(new Error('Not implemented'));
  }
}
