import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workbook } from './workbook.entity';

@Entity('sheets')
export class Sheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workbook_id', type: 'uuid' })
  workbookId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'sheet_index', type: 'int' })
  sheetIndex: number;

  @Column({ name: 'row_count', type: 'int', default: 0 })
  rowCount: number;

  @Column({ name: 'col_count', type: 'int', default: 0 })
  colCount: number;

  @Column({ type: 'jsonb', default: '[]' })
  headers: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Workbook, workbook => workbook.sheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workbook_id' })
  workbook: Workbook;
}
