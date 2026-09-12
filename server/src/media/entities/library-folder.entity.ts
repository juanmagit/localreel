import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('library_folders')
export class LibraryFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  path: string;

  @Column({ nullable: true })
  label: string;

  @CreateDateColumn()
  createdAt: Date;
}
