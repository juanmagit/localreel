import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('LocalReel');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const networkInterfaces = os.networkInterfaces();
  const lanIps: string[] = [];

  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName]?.forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        lanIps.push(net.address);
      }
    });
  });

  logger.log(`===================================================`);
  logger.log(` LocalReel Server iniciado con éxito!`);
  logger.log(` Acceso Local (esta máquina): http://localhost:${port}`);
  lanIps.forEach((ip) => {
    logger.log(` Acceso Red Local (LAN):       http://${ip}:${port}`);
  });
  logger.log(`===================================================`);
}

bootstrap();
