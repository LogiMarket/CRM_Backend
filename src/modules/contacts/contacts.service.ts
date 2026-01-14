import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(createContactDto: CreateContactDto) {
    const contact = this.contactRepository.create(createContactDto);
    return this.contactRepository.save(contact);
  }

  async findAll() {
    return this.contactRepository.find();
  }

  async findOne(id: string) {
    return this.contactRepository.findOne({
      where: { id },
    });
  }

  async findByPhoneNumber(phoneNumber: string) {
    return this.contactRepository.findOne({
      where: { phone_number: phoneNumber },
    });
  }

  async findOrCreateByPhone(phoneNumber: string) {
    let contact = await this.findByPhoneNumber(phoneNumber);
    if (!contact) {
      contact = await this.create({
        phone_number: phoneNumber,
        name: phoneNumber, // Usar el teléfono como nombre inicial
      });
    }
    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    await this.contactRepository.update(id, updateContactDto);
    return this.findOne(id);
  }

  async updateLastSeen(id: string) {
    await this.contactRepository.update(id, {
      last_seen: new Date(),
    } as any);
  }

  async remove(id: string) {
    await this.contactRepository.delete(id);
  }
}
