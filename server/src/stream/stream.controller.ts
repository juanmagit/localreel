import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamService } from './stream.service';
import { TranscodePreset } from '@shared/types';

@Controller('api/stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get(':id')
  async stream(
    @Param('id') id: string,
    @Query('preset') preset: TranscodePreset = 'direct',
    @Query('startTime') startTime: string = '0',
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const startSec = parseFloat(startTime) || 0;
    await this.streamService.handleStream(id, preset, startSec, req, res);
  }
}
