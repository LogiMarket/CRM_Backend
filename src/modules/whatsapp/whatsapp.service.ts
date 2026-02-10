import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly twilioClient: any | null = null;
  private readonly twilioPhoneNumber: string | null = null;
  private readonly webhookToken: string;
  private readonly cloudAccessToken: string | null = null;
  private readonly cloudPhoneNumberId: string | null = null;

  constructor(
    private configService: ConfigService,
    private contactsService: ContactsService,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {
    const accountSid = configService.get('TWILIO_ACCOUNT_SID');
    const authToken = configService.get('TWILIO_AUTH_TOKEN');
    this.webhookToken = configService.get('TWILIO_WEBHOOK_TOKEN') || 'default-token';

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      this.twilioPhoneNumber = configService.get('TWILIO_PHONE_NUMBER') || '+1234567890';
    } else {
      this.logger.warn('Twilio credentials not configured. Twilio features disabled.');
    }

    this.cloudAccessToken = configService.get('WHATSAPP_ACCESS_TOKEN') || null;
    this.cloudPhoneNumberId = configService.get('WHATSAPP_PHONE_NUMBER_ID') || null;
  }

  validateWebhookToken(token: string): boolean {
    return token === this.webhookToken;
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      if (body?.object === 'whatsapp_business_account' || body?.entry?.length) {
        await this.handleCloudWebhook(body);
        return;
      }

      const messageBody = body.Body;
      const senderPhoneNumber = body.From;
      const messageId = body.MessageSid;
      const accountId = body.AccountSid;

      if (accountId && accountId !== this.configService.get('TWILIO_ACCOUNT_SID')) {
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

  async handleCloudWebhook(body: any): Promise<void> {
    try {
      for (const entry of body?.entry || []) {
        for (const change of entry?.changes || []) {
          const value = change?.value;
          const contacts = value?.contacts || [];
          const contactMap = new Map<string, string>();

          for (const contact of contacts) {
            const waId = contact?.wa_id;
            const name = contact?.profile?.name;
            if (waId) {
              contactMap.set(waId, name || `WhatsApp ${String(waId).slice(-6)}`);
            }
          }

          for (const message of value?.messages || []) {
            const senderId = message.from;
            const messageId = message.id;
            const messageText = this.getCloudMessageText(message);

            if (!senderId || !messageId) {
              continue;
            }

            const normalizedPhone = this.normalizePhoneNumber(senderId);
            await this.processIncomingMessage(
              messageText,
              `whatsapp:+${normalizedPhone}`,
              messageId,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing Cloud webhook:', error);
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
      const cleanPhone = this.normalizePhoneNumber(phoneNumber);

      if (this.cloudAccessToken && this.cloudPhoneNumberId) {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${this.cloudPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.cloudAccessToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: message },
            }),
          },
        );

        const data: any = await response.json();
        if (!response.ok) {
          return {
            success: false,
            error: data?.error?.message || 'Failed to send message via Cloud API',
          };
        }

        return {
          success: true,
          whatsapp_message_id: data?.messages?.[0]?.id,
        };
      }

      if (!this.twilioClient || !this.twilioPhoneNumber) {
        return {
          success: false,
          error: 'Twilio not configured and Cloud API not configured',
        };
      }

      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('whatsapp:+')) {
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
      if (this.cloudAccessToken && this.cloudPhoneNumberId) {
        return { status: 'Cloud API configured' };
      }
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
      if (!this.twilioClient) {
        return { status: 'unknown' };
      }
      const message = await this.twilioClient.messages(messageId).fetch();
      return { status: message.status };
    } catch (error: any) {
      this.logger.error('Error getting message status:', error);
      return { status: 'unknown' };
    }
  }

  async getPhoneNumbers(): Promise<any[]> {
    try {
      if (!this.twilioClient) {
        return [];
      }
      const phoneNumbers = await this.twilioClient.incomingPhoneNumbers.list();
      return phoneNumbers;
    } catch (error: any) {
      this.logger.error('Error getting phone numbers:', error);
      return [];
    }
  }

  private getCloudMessageText(message: any): string {
    if (!message) return '';
    if (message.text?.body) return message.text.body;
    if (message.button?.text) return message.button.text;
    if (message.interactive?.button_reply?.title) {
      return message.interactive.button_reply.title;
    }
    if (message.interactive?.list_reply?.title) {
      return message.interactive.list_reply.title;
    }
    if (message.type) return `[${message.type} mensaje]`;
    return '';
  }

  private normalizePhoneNumber(value: string): string {
    return String(value).replace('whatsapp:', '').replace(/\D/g, '');
  }
}
