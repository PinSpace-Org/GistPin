import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('indexer_state')
export class IndexerState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({
    name: 'last_processed_ledger',
    type: 'bigint',
    default: 0,
  })
  lastProcessedLedger: number;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}