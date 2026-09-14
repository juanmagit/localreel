import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('watch_progress')
@Index(['mediaId', 'userId'], { unique: true })
export class WatchProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mediaId: string;

  @Column({ default: 'default' })
  userId: string;

  @Column({ type: 'float', default: 0 })
  stoppedAt: number;

  @Column({ type: 'float', default: 0 })
  duration: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
