import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly twilioClient: twilio.Twilio;
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
    this.twilioPhoneNumber = configService.get('TWILIO_PHONE_NUMBER');
    this.webhookToken = configService.get('TWILIO_WEBHOOK_TOKEN');
  }

  /**
   * Validate webhook token (for Twilio verification)
   */
  validateWebhookToken(token: string): boolean {
    return token === this.webhookToken;
  }

  /**
   * Handle incoming webhook from Twilio
   */
  async handleWebhook(body: any): Promise<void> {
    try {
      // Twilio sends form-encoded data, not JSON
      const messageBody = body.Body;
      const senderPhoneNumber = body.From;
      const messageId = body.MessageSid;
      const accountId = body.AccountSid;

      // Verify account
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

  /**
   * Process incoming message from Twilio
   */
  private async processIncomingMessage(
    content: string,
    senderPhoneNumber: string,
    messageId: string,
  ): Promise<void> {
    try {
      // Clean phone number (remove +55 prefix for storage, but keep it for Twilio)
      const cleanPhoneNumber = senderPhoneNumber.replace(/^\+/, '');

      // Find or create contact
      const contact = await this.contactsService.findOrCreateByPhone(
        cleanPhoneNumber,
      );

      // Find or create conversation
      let conversation = (
        await this.conversationsService.findByContactId(contact.id)
      )?.[0];

      if (!conversation) {
        conversation = await this.conversationsService.create({
          contact_id: contact.id,
          status: 'open',
          priority: 'normal',
        });
      }

      // Create message record
      await this.messagesService.create({
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_id: contact.id,
        content,
        message_type: 'text',
        is_from_whatsapp: true,
        whatsapp_message_id: messageId,
        metadata: {
          timestamp: new Date(),
          type: 'text',
          provider: 'twilio',
        },
      });

      // Update conversation last message time
      await this.conversationsService.update(conversation.id, {
        last_message_at: new Date(),
      });

      // Update contact last seen
      await this.contactsService.updateLastSeen(contact.id);

      this.logger.log(`Processed message ${messageId} from ${senderPhoneNumber}`);
    } catch (error) {
      this.logger.error('Error processing incoming message:', error);
    }
  }

  /**
   * Send text message to WhatsApp via Twilio
   */
  async sendMessage(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
    try {
      // Ensure phone number has proper format
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('whatsapp:+')) {
        // Remove any special characters and ensure it starts with country code
        const cleanPhone = formattedPhone.replace(/\D/g, '');
        formattedPhone = `whatsapp:+${cleanPhone}`;
      }

      const response = await this.twilioClient.messages.create({
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: formattedPhone,
        body: message,
      });

      this.logger.log(
        `Message sent to ${phoneNumber}, SID: ${response.sid}`,
      );

      return {
        success: true,
        whatsapp_message_id: response.sid,
      };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send template message (using standard message for now)
   * Twilio supports templates but they need to be configured differently
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    parameters?: string[],
  ): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
    try {
      // For now, we'll send a formatted message using the template name and params
      // In a real implementation, you'd configure templates in Twilio
      let message = templateName;
      if (parameters && parameters.length > 0) {
        message = `${templateName}: ${parameters.join(', ')}`;
      }

      return this.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error('Error sending template message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send template message',
      };
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const message = await this.twilioClient.messages(messageId).fetch();

      return {
        success: true,
        status: message.status, // 'accepted', 'queued', 'sending', 'sent', 'failed', etc.
      };
    } catch (error) {
      this.logger.error('Error getting message status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get message status',
      };
    }
  }

  /**
   * Get available phone numbers
   */
  async getPhoneNumbers(): Promise<{
    success: boolean;
    numbers?: string[];
    error?: string;
  }> {
    try {
      const services = await this.twilioClient.messaging.services.list();

      if (services.length === 0) {
        return {
          success: false,
          error: 'No messaging services found',
        };
      }

      const numbers = [];
      for (const service of services) {
        const phoneNumbers =
          await this.twilioClient.messaging.services(service.sid).phoneNumbers.list();
        numbers.push(...phoneNumbers.map((pn) => pn.phoneNumber));
      }

      return {
        success: true,
        numbers,
      };
    } catch (error) {
      this.logger.error('Error getting phone numbers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get phone numbers',
      };
    }
  }

  /**
   * Health check - verify Twilio connection
   */
  async healthCheck(): Promise<{
    success: boolean;
    accountSid?: string;
    error?: string;
  }> {
    try {
      const account = await this.twilioClient.api.accounts.list({ limit: 1 });

      if (account.length === 0) {
        return {
          success: false,
          error: 'No account found',
        };
      }

      return {
        success: true,
        accountSid: account[0].sid,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        error: error.message || 'Health check failed',
      };
    }
  }
}
