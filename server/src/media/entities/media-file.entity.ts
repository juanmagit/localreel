import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SubtitleTrack } from '@shared/types';

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  filePath: string;

  @Column({ type: 'integer', default: 0 })
  fileSize: number;

  @Column({ type: 'float', default: 0 })
  duration: number;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  videoCodec: string;

  @Column({ nullable: true })
  audioCodec: string;

  @Column({ type: 'integer', nullable: true })
  width: number;

  @Column({ type: 'integer', nullable: true })
  height: number;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ nullable: true })
  folderPath: string;

  @Column({ type: 'simple-json', nullable: true })
  subtitles: SubtitleTrack[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
