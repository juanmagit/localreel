import { Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, User as SharedUser, LoginResponse } from '@shared/types';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const defaultAdmin = this.userRepository.create({
        name: 'Anónimo',
        role: 'admin',
        pin: '0000',
        avatarColor: '#8B5CF6',
      });
      await this.userRepository.save(defaultAdmin);
      this.logger.log('Usuario Administrador inicial ("Anónimo") creado correctamente con PIN "0000".');
    }
  }

  async findAll(): Promise<SharedUser[]> {
    const users = await this.userRepository.find({
      select: ['id', 'name', 'role', 'pin', 'avatarColor', 'createdAt'],
      order: { createdAt: 'ASC' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatarColor: u.avatarColor,
      hasPin: !!u.pin && u.pin.trim() !== '',
      createdAt: u.createdAt,
    }));
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createUser(dto: CreateUserDto): Promise<SharedUser> {
    const nameTrimmed = dto.name.trim();
    if (!nameTrimmed) {
      throw new BadRequestException('El nombre de usuario no puede estar vacío.');
    }

    const existing = await this.userRepository.findOne({ where: { name: nameTrimmed } });
    if (existing) {
      throw new ConflictException(`Ya existe un usuario con el nombre "${nameTrimmed}".`);
    }

    if (dto.role === 'admin' && (!dto.pin || dto.pin.trim().length !== 4)) {
      throw new BadRequestException('Los usuarios administradores requieren un PIN de 4 dígitos.');
    }

    const newUser = this.userRepository.create({
      name: nameTrimmed,
      role: dto.role,
      pin: dto.role === 'admin' ? dto.pin?.trim() : undefined,
      avatarColor: dto.avatarColor || '#3B82F6',
    });

    const saved = await this.userRepository.save(newUser);
    return {
      id: saved.id,
      name: saved.name,
      role: saved.role,
      avatarColor: saved.avatarColor,
      hasPin: !!saved.pin,
      createdAt: saved.createdAt,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<SharedUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    if (dto.name !== undefined) {
      const nameTrimmed = dto.name.trim();
      if (!nameTrimmed) {
        throw new BadRequestException('El nombre de usuario no puede estar vacío.');
      }
      const existing = await this.userRepository.findOne({ where: { name: nameTrimmed } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe un usuario con el nombre "${nameTrimmed}".`);
      }
      user.name = nameTrimmed;
    }

    if (dto.role !== undefined) {
      if (user.role === 'admin' && dto.role !== 'admin') {
        const adminCount = await this.userRepository.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          throw new BadRequestException('No se puede cambiar el rol del único usuario Administrador.');
        }
      }
      user.role = dto.role;
    }

    if (user.role === 'admin') {
      if (dto.pin !== undefined && dto.pin.trim() !== '') {
        if (dto.pin.trim().length !== 4) {
          throw new BadRequestException('El PIN de Administrador debe tener 4 dígitos.');
        }
        user.pin = dto.pin.trim();
      } else if (!user.pin) {
        throw new BadRequestException('Los usuarios administradores requieren un PIN de 4 dígitos.');
      }
    } else {
      user.pin = undefined;
    }

    if (dto.avatarColor !== undefined) {
      user.avatarColor = dto.avatarColor;
    }

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      name: saved.name,
      role: saved.role,
      avatarColor: saved.avatarColor,
      hasPin: !!saved.pin,
      createdAt: saved.createdAt,
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    if (user.role === 'admin') {
      const adminCount = await this.userRepository.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        throw new BadRequestException('No se puede eliminar el único usuario Administrador de la plataforma.');
      }
    }

    await this.userRepository.remove(user);
  }

  async verifyPin(userId: string, pin?: string): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'role', 'pin', 'avatarColor', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (user.role === 'admin') {
      if (user.pin !== pin?.trim()) {
        return { success: false, message: 'PIN incorrecto.' };
      }
    }

    const sharedUser: SharedUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      hasPin: !!user.pin,
      createdAt: user.createdAt,
    };

    return { success: true, user: sharedUser };
  }
}
