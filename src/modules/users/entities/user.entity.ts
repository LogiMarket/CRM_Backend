import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Message } from '../../messages/entities/message.entity';
import { Macro } from '../../macros/entities/macro.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string;

  @Column({
    type: 'enum',
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
  })
  status: 'available' | 'busy' | 'offline';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Conversation, (conv) => conv.assigned_agent)
  assigned_conversations: Conversation[];

  @OneToMany(() => Message, (msg) => msg.sender)
  sent_messages: Message[];

  @OneToMany(() => Macro, (macro) => macro.created_by)
  created_macros: Macro[];
}

