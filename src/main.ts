import "module-alias/register";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { writeFileSync } from "fs";
import * as YAML from "yamljs";
``;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  // const port = configService.get("PORT") || 3000;
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || "0.0.0.0";
  const apiPrefix = configService.get("API_PREFIX") || "api";
  const apiVersion = configService.get("API_VERSION") || "v1";

  // Global prefix
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("WAVLET API")
    .setDescription("Business Virtual Card Issuance API platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // writeFileSync("./openapi-spec.json", JSON.stringify(document, null, 2), {
  //   encoding: "utf8",
  // });
  // writeFileSync("openapi-spec.yaml", YAML.stringify(document, 12));

  // 4. (Optional) serve Swagger UI at `/api-docs`
  SwaggerModule.setup("api-docs", app, document);

  // await app.listen(port);
  // await app.listen(3000, "0.0.0.0"); // <-- Listen on 0.0.0.0:3000

  await app.listen(port, host);
  console.log(`Application is running on: http://${host}:${port}`);
  console.log(`API Documentation: http://${host}:${port}/docs`);

  // console.log(`Application is running on: http://localhost:${port}`);
  // console.log(`API Documentation: http://localhost:${port}/docs`);
}

bootstrap();
