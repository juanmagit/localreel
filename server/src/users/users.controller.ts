import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, LoginDto } from '@shared/types';
import { UserAuthGuard } from './guards/user-auth.guard';
import { AdminOnly } from './decorators/user.decorator';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    return this.usersService.findAll();
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.usersService.verifyPin(dto.userId, dto.pin);
  }

  @Post()
  @UseGuards(UserAuthGuard)
  @AdminOnly()
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @AdminOnly()
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @AdminOnly()
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { success: true };
  }
}
