import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only log of every decoded on-chain event, including event types
 * that don't otherwise mutate the `gists` table. Lets stats endpoints
 * derive counts of edits/hides/reports over time without those actions
 * being separately tracked elsewhere.
 *
 * `event_id` is the Soroban RPC's own unique event id — replaying the
 * same event (e.g. after an indexer restart re-fetches a ledger range)
 * is idempotent via the unique constraint on that column.
 */
@Entity('indexed_events')
export class IndexedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', unique: true })
  eventId: string;

  @Column({ type: 'bigint' })
  ledger: number;

  @Index()
  @Column({ name: 'event_type' })
  eventType: string;

  @Index()
  @Column({ name: 'stellar_gist_id', nullable: true })
  stellarGistId: string | null;

  @Index()
  @CreateDateColumn({ name: 'observed_at' })
  observedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;
}
