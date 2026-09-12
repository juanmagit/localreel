import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MediaFile } from './entities/media-file.entity';
import { WatchProgress } from './entities/watch-progress.entity';
import { LibraryFolder } from './entities/library-folder.entity';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, execFile } from 'child_process';
import { MediaFile as SharedMediaFile } from '@shared/types';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.ts', '.flv', '.wmv']);

export const THUMBNAILS_FOLDER_NAME = process.env.THUMBNAILS_FOLDER || 'thumbnails';
export const THUMBNAILS_SERVE_PATH = `/${THUMBNAILS_FOLDER_NAME}`;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly thumbnailsDir = path.join(process.cwd(), 'public', THUMBNAILS_FOLDER_NAME);
  private ffmpegAvailable = false;

  constructor(
    @InjectRepository(MediaFile)
    private mediaRepository: Repository<MediaFile>,
    @InjectRepository(WatchProgress)
    private progressRepository: Repository<WatchProgress>,
    @InjectRepository(LibraryFolder)
    private folderRepository: Repository<LibraryFolder>,
  ) {
    this.ensureDirs();
    this.checkFfmpegAvailability();
  }

  private ensureDirs() {
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
    }
  }

  private checkFfmpegAvailability() {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.ffmpegAvailable = true;
      this.logger.log('FFmpeg detected successfully on system path.');
    } catch {
      this.ffmpegAvailable = false;
      this.logger.warn('FFmpeg binary is NOT found in system PATH. Dynamic transcoding will be limited.');
    }
  }

  isFfmpegAvailable(): boolean {
    return this.ffmpegAvailable;
  }

  private getThumbnailFilename(mediaIdOrUrl: string): string {
    const base = path.basename(mediaIdOrUrl);
    return base.endsWith('.jpg') ? base : `${base}.jpg`;
  }

  private getThumbnailUrl(mediaId: string): string {
    return `${THUMBNAILS_SERVE_PATH}/${this.getThumbnailFilename(mediaId)}`;
  }

  private getThumbnailAbsolutePath(mediaIdOrUrl: string): string {
    return path.join(this.thumbnailsDir, this.getThumbnailFilename(mediaIdOrUrl));
  }

  async getAllFolders(): Promise<LibraryFolder[]> {
    return this.folderRepository.find({ order: { createdAt: 'DESC' } });
  }

  async addFolder(folderPath: string, label?: string): Promise<LibraryFolder> {
    const normalized = path.normalize(folderPath.trim());
    if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
      throw new NotFoundException(`La carpeta "${folderPath}" no existe o no es un directorio válido.`);
    }

    let folder = await this.folderRepository.findOne({ where: { path: normalized } });
    if (!folder) {
      folder = this.folderRepository.create({
        path: normalized,
        label: label || path.basename(normalized) || normalized,
      });
      await this.folderRepository.save(folder);
    }

    // Trigger asynchronous scan
    this.scanFolder(normalized).catch((err) => {
      this.logger.error(`Error escaneando la carpeta ${normalized}: ${err.message}`);
    });

    return folder;
  }

  async removeFolder(id: string): Promise<void> {
    const folder = await this.folderRepository.findOne({ where: { id } });
    if (folder) {
      await this.folderRepository.remove(folder);
    }
  }

  async findAll(query?: string): Promise<SharedMediaFile[]> {
    const qb = this.mediaRepository
      .createQueryBuilder('media')
      .leftJoinAndMapOne('media.progress', WatchProgress, 'progress', 'progress.mediaId = media.id')
      .orderBy('media.title', 'ASC');

    if (query && query.trim() !== '') {
      qb.where('media.title LIKE :query', { query: `%${query.trim()}%` });
    }

    return (await qb.getMany()) as unknown as SharedMediaFile[];
  }

  async findOne(id: string): Promise<MediaFile> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Película o vídeo con ID "${id}" no encontrado.`);
    }
    return media;
  }

  async scanAllFolders(): Promise<{ scannedFilesCount: number; purgedFilesCount: number }> {
    const folders = await this.folderRepository.find();
    let totalScanned = 0;

    for (const folder of folders) {
      const count = await this.scanFolder(folder.path);
      totalScanned += count;
    }

    const purgedCount = await this.purgeMissingFiles();
    return { scannedFilesCount: totalScanned, purgedFilesCount: purgedCount };
  }

  async purgeMissingFiles(): Promise<number> {
    const allMedia = await this.mediaRepository.find();
    const activeFolders = await this.folderRepository.find();
    const activePaths = activeFolders.map((f) => f.path);

    let purgedCount = 0;
    for (const media of allMedia) {
      const fileExists = fs.existsSync(media.filePath);
      const isBelongingToActiveFolder = activePaths.some((p) => media.filePath.startsWith(p));

      if (!fileExists || !isBelongingToActiveFolder) {
        await this.deleteMedia(media.id);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      this.logger.log(`Se han purgado ${purgedCount} archivos inexistentes o de carpetas eliminadas.`);
    }

    return purgedCount;
  }

  async clearAllMedia(): Promise<void> {
    const allMedia = await this.mediaRepository.find();
    for (const media of allMedia) {
      await this.deleteMedia(media.id);
    }
  }

  private async scanFolder(dirPath: string): Promise<number> {
    if (!fs.existsSync(dirPath)) return 0;

    const filesFound: string[] = [];
    const scanDir = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (VIDEO_EXTENSIONS.has(ext)) {
              filesFound.push(fullPath);
            }
          }
        }
      } catch (err) {
        this.logger.error(`No se pudo leer el directorio ${currentPath}: ${err.message}`);
      }
    };

    scanDir(dirPath);
    this.logger.log(`Se encontraron ${filesFound.length} archivos de vídeo en "${dirPath}".`);

    let newCount = 0;
    for (const filePath of filesFound) {
      let media = await this.mediaRepository.findOne({ where: { filePath } });
      if (!media) {
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const baseTitle = path.basename(filePath, ext)
          .replace(/[._-]/g, ' ')
          .trim();

        media = this.mediaRepository.create({
          title: baseTitle,
          filePath,
          fileSize: stats.size,
          format: ext,
          folderPath: dirPath,
          duration: 0,
        });

        await this.mediaRepository.save(media);
        newCount++;

        // Extract ffprobe metadata & generate thumbnail asynchronously
        this.processMetadataAndThumbnail(media).catch((err) => {
          this.logger.error(`Error procesando metadatos para ${filePath}: ${err.message}`);
        });
      }
    }

    return filesFound.length;
  }

  private async processMetadataAndThumbnail(media: MediaFile): Promise<void> {
    if (!this.ffmpegAvailable) return;

    return new Promise((resolve) => {
      execFile(
        'ffprobe',
        [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          media.filePath,
        ],
        (err, stdout) => {
          if (err || !stdout) {
            resolve();
            return;
          }

          try {
            const metadata = JSON.parse(stdout);
            media.duration = parseFloat(metadata.format?.duration) || 0;

            const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
            const audioStream = metadata.streams?.find((s: any) => s.codec_type === 'audio');

            if (videoStream) {
              media.videoCodec = videoStream.codec_name;
              media.width = videoStream.width;
              media.height = videoStream.height;
            }
            if (audioStream) {
              media.audioCodec = audioStream.codec_name;
            }

            const thumbnailPath = this.getThumbnailAbsolutePath(media.id);
            const seekTime = Math.min(10, Math.floor(media.duration * 0.1));

            execFile(
              'ffmpeg',
              [
                '-ss', seekTime.toString(),
                '-i', media.filePath,
                '-vframes', '1',
                '-vf', 'scale=640:-2',
                '-y',
                thumbnailPath,
              ],
              async (thumbErr) => {
                if (thumbErr) {
                  this.logger.error(`Error generando miniatura con FFmpeg para ${media.filePath}: ${thumbErr.message}`);
                }
                if (!thumbErr && fs.existsSync(thumbnailPath)) {
                  media.thumbnailPath = this.getThumbnailUrl(media.id);
                }
                await this.mediaRepository.save(media);
                resolve();
              },
            );
          } catch {
            this.mediaRepository.save(media).then(() => resolve());
          }
        },
      );
    });
  }

  async saveProgress(mediaId: string, stoppedAt: number, duration: number): Promise<WatchProgress> {
    let record = await this.progressRepository.findOne({ where: { mediaId } });
    const isCompleted = duration > 0 ? stoppedAt / duration > 0.9 : false;

    if (!record) {
      record = this.progressRepository.create({
        mediaId,
        stoppedAt,
        duration,
        isCompleted,
      });
    } else {
      record.stoppedAt = stoppedAt;
      record.duration = duration;
      record.isCompleted = isCompleted;
    }

    return this.progressRepository.save(record);
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) return;
    if (media.thumbnailPath) {
      const fullThumbPath = this.getThumbnailAbsolutePath(media.thumbnailPath);
      if (fs.existsSync(fullThumbPath)) {
        try { fs.unlinkSync(fullThumbPath); } catch {}
      }
    }
    const progress = await this.progressRepository.findOne({ where: { mediaId: id } });
    if (progress) {
      await this.progressRepository.remove(progress);
    }
    await this.mediaRepository.remove(media);
  }
}
