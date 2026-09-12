import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
