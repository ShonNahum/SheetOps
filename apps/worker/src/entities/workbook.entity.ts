import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Sheet } from './sheet.entity';
import { ApiKey } from './api-key.entity';

@Entity('workbooks')
export class Workbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Sheet, sheet => sheet.workbook)
  sheets: Sheet[];

  @OneToMany(() => ApiKey, apiKey => apiKey.workbook)
  apiKeys: ApiKey[];
}
