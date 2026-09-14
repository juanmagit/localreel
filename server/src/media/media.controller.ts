import { Controller, Get, Post, Delete, Body, Param, Query, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MediaService } from './media.service';
import { UserAuthGuard } from '../users/guards/user-auth.guard';
import { AdminOnly, CurrentUser } from '../users/decorators/user.decorator';

@Controller('api/media')
@UseGuards(UserAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Sse('events')
  sendEvents(): Observable<MessageEvent> {
    return this.mediaService.getMediaEventsObservable();
  }

  @Get()
  async getMedia(
    @Query('q') query: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.findAll(query, userId);
  }

  @Get('folders')
  async getFolders() {
    return this.mediaService.getAllFolders();
  }

  @Post('folders')
  @AdminOnly()
  async addFolder(@Body() body: { path: string; label?: string }) {
    return this.mediaService.addFolder(body.path, body.label);
  }

  @Delete('folders/:id')
  @AdminOnly()
  async removeFolder(@Param('id') id: string) {
    await this.mediaService.removeFolder(id);
    return { success: true };
  }

  @Post('scan')
  @AdminOnly()
  async scanLibrary() {
    return this.mediaService.scanAllFolders();
  }

  @Post('clean')
  @AdminOnly()
  async cleanLibrary() {
    const purgedCount = await this.mediaService.purgeMissingFiles();
    return { success: true, purgedCount };
  }

  @Get(':id')
  async getMediaById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.findOne(id, userId);
  }

  @Post(':id/progress')
  async saveProgress(
    @Param('id') id: string,
    @Body() body: { stoppedAt: number; duration: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.saveProgress(id, body.stoppedAt, body.duration, userId);
  }

  @Delete(':id')
  @AdminOnly()
  async deleteMedia(@Param('id') id: string) {
    await this.mediaService.deleteMedia(id);
    return { success: true };
  }
}
