import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as fs from 'fs';
import { MediaModule } from './media/media.module';
import { StreamModule } from './stream/stream.module';
import { MediaFile } from './media/entities/media-file.entity';
import { WatchProgress } from './media/entities/watch-progress.entity';
import { LibraryFolder } from './media/entities/library-folder.entity';
import { THUMBNAILS_SERVE_PATH } from './media/media.service';

const dataDir = join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(dataDir, 'localreel.sqlite'),
      entities: [MediaFile, WatchProgress, LibraryFolder],
      synchronize: true, // Auto schema migration for SQLite
      logging: false,
    }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'public'),
        serveRoot: '/',
        exclude: ['/api/(.*)'],
      },
      {
        rootPath: join(process.cwd(), '..', 'client', 'dist'),
        serveRoot: '/',
        exclude: ['/api/(.*)', `${THUMBNAILS_SERVE_PATH}/(.*)`],
      },
    ),
    MediaModule,
    StreamModule,
  ],
})
export class AppModule {}
