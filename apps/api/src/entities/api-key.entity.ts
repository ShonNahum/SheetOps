import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workbook } from './workbook.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workbook_id', type: 'uuid' })
  workbookId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255, unique: true })
  keyHash: string;

  @Column({ name: 'last_used', type: 'timestamptz', nullable: true })
  lastUsed: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Workbook, workbook => workbook.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workbook_id' })
  workbook: Workbook;
}
