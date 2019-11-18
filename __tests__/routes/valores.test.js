const request = require('supertest');
const moment = require('moment');

const app = require('../../src/app');

const MAIN_ROUTE = '/v1/balance';
const TRANSACTION_ROUTE = '/v1/transactions';
const TRANSFERENCE_ROUTE = '/v1/transfers';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAxMDAsIm5hbWUiOiJVc2VyICMzIiwiZW1haWwiOiJ1c2VyM0BlbWFpbC5jb20ifQ.5yJNsJEjH3kN6kdHs6J6h-LFq2d6bT5By4Fg0rYEb3w';
const TOKEN_GERAL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAxMDIsIm5hbWUiOiJVc2VyICM1IiwiZW1haWwiOiJ1c2VyNUBlbWFpbC5jb20ifQ.vDTBp8xx7I64l-T-iHWIohq_CgF28yk1eo8FMmHppUM';

beforeAll(async () => {
  //   await app.db.migrate.rollback();
  // await app.db.migrate.latest();
  await app.db.seed.run();
});

describe('when calculation user balance', () => {
  
  it('deveria retornar apenas contas com alguma transação', () => request(app).get(MAIN_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    }));

  it('should add inbound values', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 100,
      type: 'I',
      acc_id: 10100,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('100.00');
      })));

  it('should add outbound values', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 200,
      type: 'O',
      acc_id: 10100,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('-100.00');
      })));

  it('should not consider pending transactions (status: false)', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 200,
      type: 'O',
      acc_id: 10100,
      status: false,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('-100.00');
      })));

  it('should not consider the balance from different accounts', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 50,
      type: 'I',
      acc_id: 10101,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('-100.00');
        expect(res.body[1].id).toBe(10101);
        expect(res.body[1].sum).toBe('50.00');
      })));

  it('should not consider the accounts from other users', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 200,
      type: 'O',
      acc_id: 10102,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('-100.00');
        expect(res.body[1].id).toBe(10101);
        expect(res.body[1].sum).toBe('50.00');
      })));

  it('should consider a past transaction', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: moment().subtract({ days: 5 }),
      amount: 250,
      type: 'I',
      acc_id: 10100,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('150.00');
        expect(res.body[1].id).toBe(10101);
        expect(res.body[1].sum).toBe('50.00');
      })));

  it('should consider a future transaction', () => request(app).post(TRANSACTION_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: moment().add({ days: 5 }),
      amount: 250,
      type: 'I',
      acc_id: 10100,
      status: true,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('150.00');
        expect(res.body[1].id).toBe(10101);
        expect(res.body[1].sum).toBe('50.00');
      })));

  it('should consider transfers', () => request(app).post(TRANSFERENCE_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: '1',
      date: new Date(),
      amount: 250,
      acc_ori_id: 10100,
      acc_dest_id: 10101,
    })
    .then(() => request(app).get(MAIN_ROUTE)
      .set('authorization', `Bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe(10100);
        expect(res.body[0].sum).toBe('-100.00');
        expect(res.body[1].id).toBe(10101);
        expect(res.body[1].sum).toBe('300.00');
      })));
});

test('to calculate user account balance', () => request(app).get(MAIN_ROUTE)
  .set('authorization', `Bearer ${TOKEN_GERAL}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(10104);
    expect(res.body[0].sum).toBe('162.00');
    expect(res.body[1].id).toBe(10105);
    expect(res.body[1].sum).toBe('-248.00');
  }));
