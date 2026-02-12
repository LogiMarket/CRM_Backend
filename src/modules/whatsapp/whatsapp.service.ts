import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { Readable } from 'stream';

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
            const parsed = this.parseCloudMessage(message);

            if (!senderId || !messageId) {
              continue;
            }

            const normalizedPhone = this.normalizePhoneNumber(senderId);

            await this.processIncomingMessage(
              parsed.content,
              `whatsapp:+${normalizedPhone}`,
              messageId,
              {
                message_type: parsed.message_type,
                media_id: parsed.media?.id,
                media_mime_type: parsed.media?.mime_type,
                media_sha256: parsed.media?.sha256,
                media_filename: parsed.media?.filename,
                media_caption: parsed.media?.caption,
                metadata: parsed.metadata,
              },
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
    extra?: {
      message_type?: string;
      media_id?: string;
      media_mime_type?: string;
      media_sha256?: string;
      media_filename?: string;
      media_caption?: string;
      media_url?: string;
      metadata?: Record<string, any>;
    },
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
        content: messageBody ?? '',
        message_type: (extra?.message_type || 'text') as any,
        is_from_whatsapp: true,
        whatsapp_message_id: messageId,
        media_id: extra?.media_id,
        media_mime_type: extra?.media_mime_type,
        media_sha256: extra?.media_sha256,
        media_filename: extra?.media_filename,
        media_caption: extra?.media_caption,
        media_url: extra?.media_url,
        metadata: extra?.metadata,
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

  async sendMediaMessage(
    phoneNumber: string,
    input: {
      type: 'image' | 'document' | 'audio' | 'video' | 'sticker';
      fileBuffer: Buffer;
      mimeType?: string;
      filename?: string;
      caption?: string;
    },
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    media_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
    try {
      const cleanPhone = this.normalizePhoneNumber(phoneNumber);

      if (!this.cloudAccessToken || !this.cloudPhoneNumberId) {
        return {
          success: false,
          error: 'Cloud API not configured',
          hint:
            'Configura WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID para poder enviar media. Twilio fallback para media requiere URLs públicas (mediaUrl), no upload binario desde este endpoint.',
        };
      }

      if (!input?.fileBuffer?.length) {
        return {
          success: false,
          error: 'fileBuffer is required',
        };
      }

      const upload = await this.uploadCloudMedia({
        fileBuffer: input.fileBuffer,
        mimeType: input.mimeType,
        filename: input.filename,
      });
      if (!upload.success) return upload;

      const send = await this.sendCloudMediaMessage(cleanPhone, {
        type: input.type,
        mediaId: upload.media_id!,
        caption: input.caption,
        filename: input.filename,
      });
      if (!send.success) return send;

      return {
        success: true,
        whatsapp_message_id: send.whatsapp_message_id,
        media_id: upload.media_id,
      };
    } catch (error: any) {
      this.logger.error('Error sending media message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send media message',
      };
    }
  }

  async downloadCloudMedia(
    mediaId: string,
    options?: { filename?: string },
  ): Promise<{
    stream: Readable;
    contentType?: string;
    contentDisposition?: string;
  }> {
    if (!this.cloudAccessToken) {
      throw new HttpException('Cloud API not configured', HttpStatus.BAD_REQUEST);
    }

    const id = String(mediaId || '').trim();
    if (!id) {
      throw new HttpException('mediaId is required', HttpStatus.BAD_REQUEST);
    }

    // 1) Get media info (download URL + mime_type, etc.)
    const infoResponse = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.cloudAccessToken}`,
        },
      },
    );

    const infoText = await infoResponse.text();
    let infoData: any = null;
    try {
      infoData = infoText ? JSON.parse(infoText) : null;
    } catch {
      infoData = null;
    }

    if (!infoResponse.ok) {
      // Graph devuelve { error: { ... } }
      const formatted = this.formatCloudApiError(infoData || { error: { message: infoText } });
      throw new HttpException(formatted, HttpStatus.BAD_GATEWAY);
    }

    const downloadUrl = String(infoData?.url || '');
    if (!downloadUrl) {
      throw new HttpException(
        { success: false, error: 'Cloud API did not return media url' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // 2) Download binary from the returned URL
    const fileResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.cloudAccessToken}`,
      },
    });

    if (!fileResponse.ok) {
      const errText = await fileResponse.text();
      let errJson: any = null;
      try {
        errJson = errText ? JSON.parse(errText) : null;
      } catch {
        errJson = null;
      }
      const formatted = this.formatCloudApiError(
        errJson || { error: { message: errText || 'Failed to download media' } },
      );
      throw new HttpException(formatted, HttpStatus.BAD_GATEWAY);
    }

    const bodyStream: any = fileResponse.body;
    if (!bodyStream) {
      throw new HttpException(
        { success: false, error: 'Media download returned empty body' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Node fetch returns a web ReadableStream; convert it to Node Readable.
    const stream = Readable.fromWeb(bodyStream as any);
    const contentType =
      fileResponse.headers.get('content-type') ||
      String(infoData?.mime_type || '') ||
      'application/octet-stream';

    const requestedName = String(options?.filename || '').trim();
    const safeName = requestedName
      ? requestedName.replace(/[\r\n"\\]/g, '_')
      : '';

    const contentDisposition = safeName
      ? `inline; filename="${safeName}"`
      : undefined;

    return {
      stream,
      contentType,
      contentDisposition,
    };
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

  private async uploadCloudMedia(input: {
    fileBuffer: Buffer;
    mimeType?: string;
    filename?: string;
  }): Promise<
    | { success: true; media_id: string }
    | { success: false; error: string; error_code?: number; hint?: string }
  > {
    const mimeType = input.mimeType || 'application/octet-stream';
    const filename = input.filename || 'file';

    const FormDataAny = (globalThis as any).FormData;
    const BlobAny = (globalThis as any).Blob;
    if (!FormDataAny || !BlobAny) {
      return {
        success: false,
        error: 'FormData/Blob not available in this runtime',
        hint:
          'Actualiza Node a v18+ (recomendado v20+) para usar fetch/FormData/Blob nativos, o agrega un polyfill.',
      };
    }

    const form = new FormDataAny();
    form.append('messaging_product', 'whatsapp');
    form.append(
      'file',
      new BlobAny([input.fileBuffer], { type: mimeType }),
      filename,
    );

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${this.cloudPhoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cloudAccessToken}`,
        },
        body: form as any,
      },
    );

    const data: any = await response.json();
    if (!response.ok) {
      return this.formatCloudApiError(data);
    }

    const mediaId = String(data?.id || '');
    if (!mediaId) {
      return { success: false, error: 'Cloud API did not return media id' };
    }

    return { success: true, media_id: mediaId };
  }

  private async sendCloudMediaMessage(
    cleanPhone: string,
    input: {
      type: 'image' | 'document' | 'audio' | 'video' | 'sticker';
      mediaId: string;
      caption?: string;
      filename?: string;
    },
  ): Promise<{
    success: boolean;
    whatsapp_message_id?: string;
    error?: string;
    error_code?: number;
    hint?: string;
  }> {
    const mediaPayload: any = { id: input.mediaId };

    if (input.type === 'image' || input.type === 'video' || input.type === 'document') {
      if (input.caption) mediaPayload.caption = input.caption;
    }

    if (input.type === 'document' && input.filename) {
      mediaPayload.filename = input.filename;
    }

    const body: any = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: input.type,
      [input.type]: mediaPayload,
    };

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
      return this.formatCloudApiError(data);
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

  private parseCloudMessage(message: any): {
    message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker';
    content: string;
    media?: {
      id?: string;
      mime_type?: string;
      sha256?: string;
      caption?: string;
      filename?: string;
    };
    metadata?: Record<string, any>;
  } {
    const type = String(message?.type || 'text');

    if (type === 'image' && message?.image) {
      const caption = message.image?.caption;
      return {
        message_type: 'image',
        content: caption || '[imagen]',
        media: {
          id: message.image?.id,
          mime_type: message.image?.mime_type,
          sha256: message.image?.sha256,
          caption,
        },
        metadata: { image: message.image },
      };
    }

    if (type === 'document' && message?.document) {
      const caption = message.document?.caption;
      return {
        message_type: 'document',
        content: caption || message.document?.filename || '[documento]',
        media: {
          id: message.document?.id,
          mime_type: message.document?.mime_type,
          sha256: message.document?.sha256,
          caption,
          filename: message.document?.filename,
        },
        metadata: { document: message.document },
      };
    }

    if (type === 'audio' && message?.audio) {
      return {
        message_type: 'audio',
        content: '[audio]',
        media: {
          id: message.audio?.id,
          mime_type: message.audio?.mime_type,
          sha256: message.audio?.sha256,
        },
        metadata: { audio: message.audio },
      };
    }

    if (type === 'video' && message?.video) {
      const caption = message.video?.caption;
      return {
        message_type: 'video',
        content: caption || '[video]',
        media: {
          id: message.video?.id,
          mime_type: message.video?.mime_type,
          sha256: message.video?.sha256,
          caption,
        },
        metadata: { video: message.video },
      };
    }

    if (type === 'sticker' && message?.sticker) {
      return {
        message_type: 'sticker',
        content: '[sticker]',
        media: {
          id: message.sticker?.id,
          mime_type: message.sticker?.mime_type,
          sha256: message.sticker?.sha256,
        },
        metadata: { sticker: message.sticker },
      };
    }

    return {
      message_type: 'text',
      content: this.getCloudMessageText(message),
      metadata: { type },
    };
  }

  private normalizePhoneNumber(value: string): string {
    return String(value).replace('whatsapp:', '').replace(/\D/g, '');
  }
}
