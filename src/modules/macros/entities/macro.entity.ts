import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('macros')
@Index(['created_by_id'])
@Index(['shortcut'], { unique: true })
export class Macro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  shortcut: string; // e.g., "!saludo", "!gracias"

  @Column({ type: 'uuid' })
  created_by_id: string;

  @Column({ type: 'bigint', default: 0 })
  usage_count: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.created_macros, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;
}
