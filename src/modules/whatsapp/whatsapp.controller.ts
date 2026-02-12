import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpException,
  HttpStatus,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiHeader,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('WhatsApp - Twilio/Cloud Integration')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private whatsappService: WhatsappService,
    private configService: ConfigService,
  ) {}

  /**
   * Webhook para recibir mensajes desde Twilio
   */
  @Get('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verificar webhook de WhatsApp Cloud API',
    description:
      'Endpoint de verificación de Meta (hub.challenge). Se usa al guardar el webhook en el panel de Meta.',
  })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      return challenge;
    }
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Recibir mensajes de WhatsApp',
    description:
      'Endpoint webhook para Twilio y WhatsApp Cloud API. ' +
      'Twilio envía datos en formato form-encoded, Cloud API envía JSON.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        MessageSid: { type: 'string', example: 'SM1234567890abcdef' },
        AccountSid: { type: 'string', example: 'ACxxxxxxxxxxxxxxxxxx' },
        From: { type: 'string', example: '+34612345678' },
        To: { type: 'string', example: '+14155238886' },
        Body: { type: 'string', example: 'Hola, ¿cómo estás?' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje recibido y procesado correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  async handleWebhook(@Body() body: any) {
    await this.whatsappService.handleWebhook(body);
    return { success: true };
  }

  /**
   * Health check - Verificar conexión con Twilio
   */
  @Get('health')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verificar estado de conexión',
    description:
      'Comprueba que la conexión con Twilio está activa y las credenciales son válidas. ' +
      'Sin autenticación requerida. Perfecto para monitoreo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conexión activa con Twilio',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        accountSid: { type: 'string', example: 'ACxxxxxxxxxxxxxxxxxx' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Error en la conexión',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'No account found' },
      },
    },
  })
  async healthCheck() {
    return this.whatsappService.healthCheck();
  }

  /**
   * Enviar mensaje de texto por WhatsApp
   */
  @Post('send')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Enviar mensaje de texto',
    description:
      'Envía un mensaje de texto a un número de WhatsApp. ' +
      'Requiere JWT autenticado. El número puede estar con o sin prefijo "whatsapp:+".',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone_number: {
          type: 'string',
          example: '+34612345678',
          description: 'Número del destinatario con código de país',
        },
        message: {
          type: 'string',
          example: 'Hola, este es un mensaje de prueba',
          description: 'Contenido del mensaje',
        },
      },
      required: ['phone_number', 'message'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        whatsapp_message_id: {
          type: 'string',
          example: 'SM1234567890abcdef',
          description: 'ID de Twilio para rastrear el mensaje',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Error al enviar',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'string',
          example: 'Invalid phone number format',
        },
      },
    },
  })
  async sendMessage(
    @Body() body: { phone_number: string; message: string },
  ) {
    return this.whatsappService.sendMessage(
      body.phone_number,
      body.message,
    );
  }

  /**
   * Enviar mensaje con plantilla
   */
  @Post('send-template')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Enviar mensaje con plantilla',
    description:
      'Envía un mensaje usando un template. ' +
      'Si WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID están configurados, se envía como template real de WhatsApp Cloud API (requerido fuera de la ventana de 24h). ' +
      'Si no, hace fallback y envía texto plano (Twilio o sin Cloud API).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone_number: {
          type: 'string',
          example: '+34612345678',
          description: 'Número del destinatario',
        },
        template_name: {
          type: 'string',
          example: 'order_confirmation',
          description: 'Nombre de la plantilla',
        },
        parameters: {
          type: 'array',
          items: { type: 'string' },
          example: ['#12345', 'Juan Pérez'],
          description: 'Parámetros para la plantilla (opcional)',
        },
      },
      required: ['phone_number', 'template_name'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje enviado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        whatsapp_message_id: { type: 'string' },
      },
    },
  })
  async sendTemplate(
    @Body()
    body: {
      phone_number: string;
      template_name: string;
      parameters?: string[];
    },
  ) {
    return this.whatsappService.sendTemplateMessage(
      body.phone_number,
      body.template_name,
      body.parameters,
    );
  }

  /**
   * Enviar mensaje con media (Cloud API)
   */
  @Post('send-media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Enviar media (imagen/documento/audio/video/sticker)',
    description:
      'Envía un archivo como media usando WhatsApp Cloud API. ' +
      'Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID configurados. ' +
      'El archivo se sube primero a /{phone_number_id}/media y luego se envía el mensaje referenciando el media_id.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone_number: {
          type: 'string',
          example: '+5215548780484',
          description: 'Número del destinatario (E.164)',
        },
        type: {
          type: 'string',
          enum: ['image', 'document', 'audio', 'video', 'sticker'],
          example: 'image',
        },
        caption: { type: 'string', example: 'Mira esto' },
        filename: { type: 'string', example: 'archivo.pdf' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['phone_number', 'type', 'file'],
    },
  })
  async sendMedia(
    @UploadedFile() file: any,
    @Body()
    body: {
      phone_number: string;
      type: 'image' | 'document' | 'audio' | 'video' | 'sticker';
      caption?: string;
      filename?: string;
    },
  ) {
    if (!file?.buffer?.length) {
      throw new HttpException('file is required', HttpStatus.BAD_REQUEST);
    }

    return this.whatsappService.sendMediaMessage(body.phone_number, {
      type: body.type,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      filename: body.filename || file.originalname,
      caption: body.caption,
    });
  }

  /**
   * Descargar/visualizar media desde WhatsApp Cloud API (proxy)
   */
  @Get('media/:mediaId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Descargar/visualizar media (proxy Cloud API)',
    description:
      'Dado un media_id de WhatsApp Cloud API, obtiene la URL de descarga y hace proxy del binario. ' +
      'Útil para mostrar imágenes/documentos/audios/videos/stickers en el CRM sin exponer el access token.',
  })
  @ApiQuery({
    name: 'filename',
    required: false,
    description: 'Nombre sugerido para Content-Disposition',
    example: 'archivo.pdf',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT opcional por query param. Útil para renderizar media en <img src>/<a href> cuando no se puede enviar Authorization header.',
  })
  @ApiResponse({ status: 200, description: 'Binario del media' })
  async downloadMedia(
    @Param('mediaId') mediaId: string,
    @Query('filename') filename: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.whatsappService.downloadCloudMedia(mediaId, {
      filename,
    });

    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
    }
    if (result.contentDisposition) {
      res.setHeader('Content-Disposition', result.contentDisposition);
    }

    return new StreamableFile(result.stream);
  }

  /**
   * Obtener estado de un mensaje
   */
  @Get('message-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtener estado de mensaje',
    description:
      'Consulta el estado actual de un mensaje enviado. ' +
      'Posibles estados: accepted, queued, sending, sent, failed, delivered, undelivered, read.',
  })
  @ApiQuery({
    name: 'message_id',
    type: 'string',
    description: 'ID de Twilio del mensaje (MessageSid)',
    example: 'SM1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado obtenido',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        status: {
          type: 'string',
          example: 'sent',
          description:
            'Estado del mensaje: accepted | queued | sending | sent | failed | delivered | read',
        },
      },
    },
  })
  async getMessageStatus(@Query('message_id') messageId: string) {
    return this.whatsappService.getMessageStatus(messageId);
  }

  /**
   * Obtener números de teléfono disponibles
   */
  @Get('phone-numbers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar números de WhatsApp',
    description:
      'Obtiene todos los números de WhatsApp Business asociados a tu cuenta de Twilio. ' +
      'Estos son los números desde los que puedes enviar mensajes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de números obtenida',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        numbers: {
          type: 'array',
          items: { type: 'string' },
          example: ['+14155238886', '+14155238887'],
          description: 'Números de WhatsApp disponibles',
        },
      },
    },
  })
  async getPhoneNumbers() {
    return this.whatsappService.getPhoneNumbers();
  }
}
