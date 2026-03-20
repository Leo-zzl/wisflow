import { ContentSession } from '../entities/ContentSession';
import type { PolishPort, PolishConfig } from '../ports/PolishPort';

export class PolishService {
  constructor(private readonly port: PolishPort) {}

  async isAvailable(): Promise<boolean> {
    return this.port.isAvailable();
  }

  async polish(session: ContentSession, config?: PolishConfig): Promise<ContentSession> {
    if (!(await this.port.isAvailable())) {
      throw new Error('润色服务不可用');
    }
    const polished = await this.port.polish(session.rawText, session.polishStyle, config);
    return session.setPolishedText(polished);
  }
}
