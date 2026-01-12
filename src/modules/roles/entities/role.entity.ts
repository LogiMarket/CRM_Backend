import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  permissions: {
    conversations?: { read?: boolean; write?: boolean; delete?: boolean };
    contacts?: { read?: boolean; write?: boolean; delete?: boolean };
    users?: { read?: boolean; write?: boolean; delete?: boolean };
    orders?: { read?: boolean; write?: boolean; delete?: boolean };
    macros?: { read?: boolean; write?: boolean; delete?: boolean };
    settings?: { read?: boolean; write?: boolean };
    reports?: { read?: boolean };
    whatsapp?: { send?: boolean; receive?: boolean };
  };

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
