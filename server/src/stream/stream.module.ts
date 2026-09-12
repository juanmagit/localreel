import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';

@Module({
  imports: [MediaModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
