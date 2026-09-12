import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { MediaService } from '../media/media.service';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import { TranscodePreset } from '@shared/types';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(private mediaService: MediaService) {}

  async handleStream(
    mediaId: string,
    preset: TranscodePreset = 'direct',
    startTime: number = 0,
    req: Request,
    res: Response,
  ): Promise<void> {
    const media = await this.mediaService.findOne(mediaId);

    if (!fs.existsSync(media.filePath)) {
      throw new NotFoundException(`El archivo de vídeo ya no existe en el disco duro: ${media.filePath}`);
    }

    const isNativeFormat = ['.mp4', '.webm'].includes(media.format?.toLowerCase());
    const isNativeCodec = ['h264', 'vp8', 'vp9', 'av1'].includes(media.videoCodec?.toLowerCase() || '');

    // Direct HTTP Range Request streaming if requested as direct and natively supported by browser
    if (preset === 'direct' && isNativeFormat && isNativeCodec) {
      this.streamDirectRange(media.filePath, req, res);
      return;
    }

    // Otherwise, spawn FFmpeg process outputting to pipe:1 HTTP response
    if (!this.mediaService.isFfmpegAvailable()) {
      // Fallback to direct range if FFmpeg is not installed
      this.logger.warn(`FFmpeg no está disponible. Intentando streaming directo para ${media.filePath}`);
      this.streamDirectRange(media.filePath, req, res);
      return;
    }

    this.streamTranscodedPipe(media.filePath, preset, startTime, res);
  }

  private streamDirectRange(filePath: string, req: Request, res: Response): void {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const mimeType = this.getMimeType(filePath);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      });

      fs.createReadStream(filePath).pipe(res);
    }
  }

  private streamTranscodedPipe(
    filePath: string,
    preset: TranscodePreset,
    startTime: number,
    res: Response,
  ): void {
    this.logger.log(`Iniciando streaming con FFmpeg pipe. Archivo: ${filePath}, Preset: ${preset}, Seek: ${startTime}s`);

    const ffmpegArgs: string[] = [];

    // Fast input seeking before -i
    if (startTime > 0) {
      ffmpegArgs.push('-ss', startTime.toString());
    }

    ffmpegArgs.push('-i', filePath);

    // Resolution & bitrate scaling
    switch (preset) {
      case '1080p':
        ffmpegArgs.push('-vf', 'scale=-2:1080', '-b:v', '4500k');
        break;
      case '720p':
        ffmpegArgs.push('-vf', 'scale=-2:720', '-b:v', '2500k');
        break;
      case '480p':
        ffmpegArgs.push('-vf', 'scale=-2:480', '-b:v', '1200k');
        break;
      case '360p':
        ffmpegArgs.push('-vf', 'scale=-2:360', '-b:v', '700k');
        break;
      default:
        // Direct stream copy or default transcode
        break;
    }

    // Transcoding output settings for standard HTML5 player compatibility via stream pipe
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-g', '25',
      '-keyint_min', '25',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1',
    );

    const ffmpegProcess: ChildProcessWithoutNullStreams = spawn('ffmpeg', ffmpegArgs);

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });

    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on('data', (data) => {
      // Diagnostic output (can be uncommented for debugging ffmpeg pipe errors)
      // this.logger.debug(`FFmpeg log: ${data.toString()}`);
    });

    ffmpegProcess.on('error', (err) => {
      this.logger.error(`FFmpeg process error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send('Error en el proceso de streaming FFmpeg.');
      }
    });

    // CRITICAL: Clean up child process immediately on socket disconnect or page unload
    res.on('close', () => {
      this.logger.log(`Cliente desconectado. Finalizando proceso FFmpeg (PID ${ffmpegProcess.pid}).`);
      try {
        ffmpegProcess.kill('SIGKILL');
      } catch (err) {
        // Ignored
      }
    });
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.mp4': return 'video/mp4';
      case '.webm': return 'video/webm';
      case '.mkv': return 'video/x-matroska';
      case '.avi': return 'video/x-msvideo';
      case '.mov': return 'video/quicktime';
      default: return 'video/mp4';
    }
  }
}
