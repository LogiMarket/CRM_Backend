import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../messages/entities/message.entity';
import { ConversationTag } from '../../conversation-tags/entities/conversation-tag.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contact_id: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_agent_id: string;

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'resolved'],
    default: 'active',
  })
  status: 'active' | 'paused' | 'resolved';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority: 'low' | 'medium' | 'high';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Contact, (contact) => contact.conversations)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @ManyToOne(() => User, (user) => user.assigned_conversations, {
    nullable: true,
  })
  @JoinColumn({ name: 'assigned_agent_id' })
  assigned_agent: User;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];

  @OneToMany(() => ConversationTag, (tag) => tag.conversation)
  tags: ConversationTag[];
}
