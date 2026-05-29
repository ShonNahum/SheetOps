import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Sheet } from './sheet.entity';

@Entity('sheet_rows')
@Unique(['sheetId', 'rowIndex'])
export class SheetRow {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'sheet_id', type: 'uuid' })
  sheetId: string;

  @Column({ name: 'row_index', type: 'int' })
  rowIndex: number;

  @Column({ type: 'jsonb', default: '[]' })
  data: any[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Sheet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sheet_id' })
  sheet: Sheet;
}
