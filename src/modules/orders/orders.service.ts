import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.orderRepository.save(createOrderDto);
  }

  async findAll() {
    return this.orderRepository.find({
      relations: ['contact'],
    });
  }

  async findOne(id: string) {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['contact'],
    });
  }

  async findByContact(contactId: string) {
    return this.orderRepository.find({
      where: { contact_id: contactId },
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return this.orderRepository.findOne({
      where: { order_number: orderNumber },
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    await this.orderRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.orderRepository.delete(id);
  }
}
