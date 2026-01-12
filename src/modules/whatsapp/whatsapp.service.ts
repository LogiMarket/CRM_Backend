import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly twilioClient: any;
  private readonly twilioPhoneNumber: string;
  private readonly webhookToken: string;

  constructor(
    private configService: ConfigService,
    private contactsService: ContactsService,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {
    const accountSid = configService.get('TWILIO_ACCOUNT_SID');
    const authToken = configService.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.twilioPhoneNumber = configService.get('TWILIO_PHONE_NUMBER') || '+1234567890';
    this.webhookToken = configService.get('TWILIO_WEBHOOK_TOKEN') || 'default-token';
  }

  validateWebhookToken(token: string): boolean {
    return token === this.webhookToken;
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      const messageBody = body.Body;
      const senderPhoneNumber = body.From;
      const messageId = body.MessageSid;
      const accountId = body.AccountSid;

      if (accountId !== this.configService.get('TWILIO_ACCOUNT_SID')) {
        this.logger.warn('Invalid account ID in webhook');
        return;
      }

      if (!messageBody || !senderPhoneNumber || !messageId) {
        this.logger.warn('Missing required fields in webhook');
        return;
      }

      await this.processIncomingMessage(messageBody, senderPhoneNumber, messageId);
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
    }
  }

  private async processIncomingMessage(
    messageBody: string,
    senderPhoneNumber: string,
    messageId: string,
  ): Promise<void> {
    try {
      const contact = await this.contactsService.findOrCreateByPhone(senderPhoneNumber);
      const conversations = await this.conversationsService.findByContact(contact.id);
      
      let activeConversation = null;
      if (conversations && conversations.length > 0) {
        activeConversation = conversations[0];
      } else {
        activeConversation = await this.conversationsService.create({
          contact_id: contact.id,
        } as any);
      }

      await this.messagesService.create({
        conversation_id: activeConversation.id,
        sender_type: 'contact' as any,
        content: messageBody,
        message_type: 'text' as any,
        is_from_whatsapp: true,
        whatsapp_message_id: messageId,
      });

      await this.conversationsService.update(activeConversation.id, {
        status: activeConversation.status || 'active',
        priority: activeConversation.priority || 'medium',
      } as any);

      await this.contactsService.updateLastSeen(contact.id);
      this.logger.log(`Processed message ${messageId} from ${senderPhoneNumber}`);
    } catch (error) {
      this.logger.error('Error processing incoming message:', error);
    }
  }

  async sendMessage(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
    try {
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('whatsapp:+')) {
        const cleanPhone = formattedPhone.replace(/\D/g, '');
        formattedPhone = `whatsapp:+${cleanPhone}`;
      }

      const response = await this.twilioClient.messages.create({
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: formattedPhone,
        body: message,
      });

      this.logger.log(`Message sent to ${phoneNumber}, SID: ${response.sid}`);

      return {
        success: true,
        whatsapp_message_id: response.sid,
      };
    } catch (error: any) {
      this.logger.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      if (!accountSid) {
        return { status: 'Twilio not configured' };
      }
      return { status: 'Twilio connection is healthy' };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return { status: 'Twilio connection failed' };
    }
  }

  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    variables?: string[] | Record<string, string>,
  ): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
    try {
      let message = templateName;
      if (variables) {
        if (Array.isArray(variables)) {
          message = templateName.replace(/\{(\d+)\}/g, (match, index) => variables[parseInt(index)] || match);
        } else {
          Object.keys(variables).forEach(key => {
            message = message.replace(`{${key}}`, variables[key]);
          });
        }
      }
      return this.sendMessage(phoneNumber, message);
    } catch (error: any) {
      this.logger.error('Error sending template message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send template message',
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<{ status: string }> {
    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return { status: message.status };
    } catch (error: any) {
      this.logger.error('Error getting message status:', error);
      return { status: 'unknown' };
    }
  }

  async getPhoneNumbers(): Promise<any[]> {
    try {
      const phoneNumbers = await this.twilioClient.incomingPhoneNumbers.list();
      return phoneNumbers;
    } catch (error: any) {
      this.logger.error('Error getting phone numbers:', error);
      return [];
    }
  }
}
