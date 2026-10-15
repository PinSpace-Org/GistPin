import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** node-postgres returns bigint columns as strings; expose them as numbers. */
const bigintToNumber = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? value : Number(value),
};

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
    transformer: bigintToNumber,
  })
  lastProcessedLedger: number;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}