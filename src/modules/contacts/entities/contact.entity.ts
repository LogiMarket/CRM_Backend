import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('contacts')
@Index(['phone_number'], { unique: true })
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Conversation, (conv) => conv.contact)
  conversations: Conversation[];

  @OneToMany(() => Order, (order) => order.contact)
  orders: Order[];
}
