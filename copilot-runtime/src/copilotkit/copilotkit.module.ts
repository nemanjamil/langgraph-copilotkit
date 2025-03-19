import { Module } from '@nestjs/common';
import { CopilotkitService } from './copilotkit.service';
import { CopilotkitController } from './copilotkit.controller';

@Module({
  controllers: [CopilotkitController],
  providers: [CopilotkitService],
})
export class CopilotkitModule {}
