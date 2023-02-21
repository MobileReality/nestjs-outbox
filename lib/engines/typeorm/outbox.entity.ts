import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OutboxStatus {
    PENDING = 'pending',
    SENT = 'sent',
    ERRORED = 'errored',
}

@Entity({ name: 'outbox' })
@Index(['status', 'nextRetry', 'grouping', 'createdAt'])
export class OutboxEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 32 })
    @Index()
    grouping: string;

    @Column({ type: 'varchar', length: 32 })
    @Index()
    name: string;

    @Column({ type: 'varchar', length: 32, nullable: true })
    @Index()
    tag: string | null;

    @Column({ name: 'serialized_args', type: 'longtext' })
    serializedArgs: string;

    @Column({
        type: 'enum',
        enum: OutboxStatus,
        default: OutboxStatus.PENDING,
    })
    status: OutboxStatus;

    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    @Column({
        name: 'next_retry',
        type: 'timestamp',
        precision: 6,
        default: () => 'CURRENT_TIMESTAMP(6)',
    })
    nextRetry: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}

// TODO postgres engine workaround
@Entity({ name: 'outbox', synchronize: false })
@Index(['status', 'nextRetry', 'grouping', 'createdAt'])
export class OutboxEntityPostgres extends OutboxEntity {
    @Column({ name: 'id', unique: true })
    id_overwrite: number;
}
