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
  private readonly cloudWabaId: string | null = null;
  private readonly cloudTemplateLanguage: string;

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
    this.cloudWabaId = configService.get('WHATSAPP_WABA_ID') || null;
    this.cloudTemplateLanguage =
      configService.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'es_MX';
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
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
    try {
      const cleanPhone = this.normalizePhoneNumber(phoneNumber);

      if (this.cloudAccessToken && this.cloudPhoneNumberId) {
        return this.sendCloudTextMessage(cleanPhone, message);
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
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
    try {
      const cleanPhone = this.normalizePhoneNumber(phoneNumber);

      // Para producción (fuera de ventana 24h) WhatsApp exige templates.
      if (this.cloudAccessToken && this.cloudPhoneNumberId) {
        const parameters = this.normalizeTemplateVariables(variables);
        return this.sendCloudTemplateMessage(cleanPhone, templateName, parameters);
      }

      // Fallback (Twilio o no configurado): se envía como texto plano.
      let message = templateName;
      const params = this.normalizeTemplateVariables(variables);
      if (params.length > 0) {
        message = `${templateName} ${params.join(' ')}`;
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

  private normalizeTemplateVariables(
    variables?: string[] | Record<string, string>,
  ): string[] {
    if (!variables) return [];
    if (Array.isArray(variables)) return variables.map(v => String(v));
    return Object.keys(variables)
      .sort()
      .map(k => String(variables[k]));
  }

  private async sendCloudTextMessage(
    cleanPhone: string,
    message: string,
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
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
      return this.formatCloudApiError(data);
    }

    return {
      success: true,
      whatsapp_message_id: data?.messages?.[0]?.id,
    };
  }

  private async sendCloudTemplateMessage(
    cleanPhone: string,
    templateName: string,
    parameters: string[],
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
    const body: any = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: this.cloudTemplateLanguage },
      },
    };

    if (parameters.length > 0) {
      body.template.components = [
        {
          type: 'body',
          parameters: parameters.map(text => ({ type: 'text', text })),
        },
      ];
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${this.cloudPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cloudAccessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    const data: any = await response.json();
    if (!response.ok) {
      return this.formatCloudApiError(data, {
        templateName,
        language: this.cloudTemplateLanguage,
      });
    }

    return {
      success: true,
      whatsapp_message_id: data?.messages?.[0]?.id,
    };
  }

  private formatCloudApiError(
    data: any,
    context?: { templateName?: string; language?: string },
  ): {
    success: false;
    error: string;
    error_code?: number;
    hint?: string;
  } {
    const errorCode = Number(data?.error?.code);
    const errorMessage =
      data?.error?.message || 'Failed to send message via Cloud API';
    const errorDetails = data?.error?.error_data?.details;
    const errorType = data?.error?.type;

    // Dev-mode restriction
    const isNotAllowedList =
      errorCode === 131030 ||
      /not in allowed list/i.test(String(errorMessage)) ||
      /131030/.test(String(errorMessage));

    // Out of 24h window / requires template
    const isRequiresTemplate =
      errorCode === 470 ||
      /template/i.test(String(errorMessage)) ||
      /outside the 24/i.test(String(errorMessage));

    // Misconfiguration: using WABA ID where Phone Number ID is required
    const isUnsupportedPostRequest =
      errorCode === 100 && /Unsupported post request/i.test(String(errorMessage));

    let hint: string | undefined;
    if (isNotAllowedList) {
      hint =
        'Tu app/WhatsApp Cloud API está en modo desarrollo: solo puedes enviar a números agregados como destinatarios de prueba (Allowed recipients/Test numbers) en Meta Developer > WhatsApp > API Setup. Agrega el número (E.164), completa el opt-in y reintenta. Para enviar a cualquier número necesitas pasar a producción.';
    } else if (isRequiresTemplate) {
      hint =
        'WhatsApp restringe mensajes fuera de la ventana de 24h: debes enviar un template aprobado. Usa el endpoint /api/whatsapp/send-template con un template existente y el language correcto.';
      if (context?.templateName || context?.language) {
        hint += ` (template=${context?.templateName || 'N/A'}, language=${context?.language || 'N/A'})`;
      }
    } else if (isUnsupportedPostRequest) {
      const maybeUsingWabaAsPhoneId =
        Boolean(this.cloudWabaId) && this.cloudPhoneNumberId === this.cloudWabaId;
      hint = maybeUsingWabaAsPhoneId
        ? 'Parece que configuraste WHATSAPP_PHONE_NUMBER_ID con el WABA ID. Para enviar mensajes debes usar el Phone Number ID (Identificador de número de teléfono) del panel de WhatsApp > API Setup. Actualiza la variable en Railway y reinicia el servicio.'
        : 'Error 100 (Unsupported post request). Verifica que WHATSAPP_PHONE_NUMBER_ID sea el Phone Number ID (no el WABA ID) y que el access token tenga permisos whatsapp_business_messaging + whatsapp_business_management para esa cuenta.';
    }

    const finalMessageParts = [errorMessage];
    if (errorDetails) finalMessageParts.push(String(errorDetails));
    if (errorType) finalMessageParts.push(`type=${String(errorType)}`);

    return {
      success: false,
      error: finalMessageParts.join(' | '),
      error_code: Number.isFinite(errorCode) ? errorCode : undefined,
      hint,
    };
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
