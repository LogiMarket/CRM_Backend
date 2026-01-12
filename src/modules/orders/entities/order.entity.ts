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
import { Contact } from '../../contacts/entities/contact.entity';

@Entity('orders')
@Index(['contact_id'])
@Index(['order_number'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  order_number: string;

  @Column({ type: 'uuid' })
  contact_id: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;

  @Column({ type: 'text', nullable: true })
  shipping_address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tracking_number: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Contact, (contact) => contact.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;
}
