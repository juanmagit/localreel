import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserRole } from '@shared/types';

const DEFAULT_USER_ROLE: UserRole = 'user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', default: DEFAULT_USER_ROLE })
  role: UserRole;

  @Column({ nullable: true, select: false })
  pin?: string;

  @Column({ default: '#8B5CF6' })
  avatarColor: string;

  @CreateDateColumn()
  createdAt: Date;
}
