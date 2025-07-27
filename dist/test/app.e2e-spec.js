"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/modules/prisma/prisma.service");
describe('Virtual Card API (e2e)', () => {
    let app;
    let prisma;
    let authToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        prisma = moduleFixture.get(prisma_service_1.PrismaService);
        await app.init();
        const authResponse = await request(app.getHttpServer())
            .post('/api/v1/auth/token')
            .send({
            client_id: 'demo_client_001',
            client_key: 'demo_client_key_123',
        });
        authToken = authResponse.body.access_token;
    });
    afterAll(async () => {
        await app.close();
    });
    describe('Authentication', () => {
        it('/api/v1/auth/token (POST)', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/token')
                .send({
                client_id: 'demo_client_001',
                client_key: 'demo_client_key_123',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('access_token');
                expect(res.body).toHaveProperty('token_type', 'Bearer');
                expect(res.body).toHaveProperty('expires_in');
            });
        });
        it('/api/v1/auth/token (POST) - Invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/token')
                .send({
                client_id: 'invalid',
                client_key: 'invalid',
            })
                .expect(401);
        });
    });
    describe('Business Balance', () => {
        it('/api/v1/balance (GET)', () => {
            return request(app.getHttpServer())
                .get('/api/v1/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('balance');
                expect(res.body).toHaveProperty('currency');
                expect(res.body).toHaveProperty('business_name');
            });
        });
        it('/api/v1/balance (GET) - Unauthorized', () => {
            return request(app.getHttpServer())
                .get('/api/v1/balance')
                .expect(401);
        });
    });
    describe('Customers', () => {
        it('/api/v1/customers (POST)', () => {
            return request(app.getHttpServer())
                .post('/api/v1/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Test Customer',
                email: 'test@customer.com',
                phone: '+1234567890',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body).toHaveProperty('name', 'Test Customer');
                expect(res.body).toHaveProperty('email', 'test@customer.com');
            });
        });
        it('/api/v1/customers (GET)', () => {
            return request(app.getHttpServer())
                .get('/api/v1/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
        });
    });
    describe('Cards', () => {
        let customerId;
        let cardId;
        beforeAll(async () => {
            const customerResponse = await request(app.getHttpServer())
                .post('/api/v1/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Card Test Customer',
                email: 'cardtest@customer.com',
                phone: '+1234567890',
            });
            customerId = customerResponse.body.id;
        });
        it('/api/v1/cards (POST)', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/cards')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                customer_id: customerId,
                card_type: 'VIRTUAL',
                currency: 'USD',
            })
                .expect(201);
            cardId = response.body.id;
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('card_number');
            expect(response.body).toHaveProperty('status', 'ACTIVE');
        });
        it('/api/v1/cards (GET)', () => {
            return request(app.getHttpServer())
                .get('/api/v1/cards')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
        });
        it('/api/v1/cards/:id/fund (POST)', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/cards/${cardId}/fund`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                amount: 100,
            })
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('success', true);
            });
        });
        it('/api/v1/cards/:id (GET)', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/cards/${cardId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('id', cardId);
                expect(res.body).toHaveProperty('cvv');
            });
        });
    });
});
//# sourceMappingURL=app.e2e-spec.js.map