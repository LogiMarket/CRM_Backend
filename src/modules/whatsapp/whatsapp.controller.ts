import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('WhatsApp - Twilio Integration')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  /**
   * Webhook para recibir mensajes desde Twilio
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Recibir mensajes de WhatsApp',
    description:
      'Endpoint webhook que recibe mensajes desde Twilio. Se configura en Twilio Dashboard → Messaging → Settings. ' +
      'Twilio envía datos en formato form-encoded, NO JSON.',
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
      'Envía un mensaje formateado usando un nombre de plantilla y parámetros. ' +
      'Útil para mensajes repetitivos como confirmaciones, recordatorios, etc. ' +
      'Por ahora, concatena el template_name con los parámetros.',
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
