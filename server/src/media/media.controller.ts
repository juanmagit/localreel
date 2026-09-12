import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async getMedia(@Query('q') query?: string) {
    return this.mediaService.findAll(query);
  }

  @Get('folders')
  async getFolders() {
    return this.mediaService.getAllFolders();
  }

  @Post('folders')
  async addFolder(@Body() body: { path: string; label?: string }) {
    return this.mediaService.addFolder(body.path, body.label);
  }

  @Delete('folders/:id')
  async removeFolder(@Param('id') id: string) {
    await this.mediaService.removeFolder(id);
    return { success: true };
  }

  @Post('scan')
  async scanLibrary() {
    return this.mediaService.scanAllFolders();
  }

  @Post('clean')
  async cleanLibrary() {
    const purgedCount = await this.mediaService.purgeMissingFiles();
    return { success: true, purgedCount };
  }

  @Get(':id')
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Post(':id/progress')
  async saveProgress(
    @Param('id') id: string,
    @Body() body: { stoppedAt: number; duration: number },
  ) {
    return this.mediaService.saveProgress(id, body.stoppedAt, body.duration);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    await this.mediaService.deleteMedia(id);
    return { success: true };
  }
}
