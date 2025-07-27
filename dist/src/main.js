"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || "0.0.0.0";
    const apiPrefix = configService.get("API_PREFIX") || "api";
    const apiVersion = configService.get("API_VERSION") || "v1";
    app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle("WAVLET API")
        .setDescription("Business Virtual Card Issuance API platform")
        .setVersion("1.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("docs", app, document);
    await app.listen(port, host);
    console.log(`Application is running on: http://${host}:${port}`);
    console.log(`API Documentation: http://${host}:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map