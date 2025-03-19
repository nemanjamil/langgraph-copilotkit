import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CopilotkitModule } from './copilotkit/copilotkit.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CopilotkitModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
