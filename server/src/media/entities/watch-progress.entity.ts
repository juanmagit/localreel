import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('watch_progress')
export class WatchProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  mediaId: string;

  @Column({ type: 'float', default: 0 })
  stoppedAt: number;

  @Column({ type: 'float', default: 0 })
  duration: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
