import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workbook } from './workbook.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workbook_id', type: 'uuid', nullable: true })
  workbookId: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'queued' })
  status: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'jsonb', nullable: true })
  result: any;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Workbook, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workbook_id' })
  workbook: Workbook;
}
