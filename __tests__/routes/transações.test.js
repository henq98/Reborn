const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');

const MAIN_ROUTE = '/v1/transactions';
let user;
let user2;
let accUser;
let accUser2;

beforeAll(async () => {
  await app.db('transactions').del();
  await app.db('transfers').del();
  await app.db('accounts').del();
  await app.db('users').del();

  const users = await app.db('users').insert([
    { name: 'User #1', email: 'user@email.com', password: '$2a$10$6.jH9AuG2ghkszKF692cHOZCUXVxw0XQI3MUrUN9Qs2tq4cydjdZi' },
    { name: 'User #2', email: 'user2@email.com', password: '$2a$10$6.jH9AuG2ghkszKF692cHOZCUXVxw0XQI3MUrUN9Qs2tq4cydjdZi' },
  ], '*');

  [user, user2] = users;
  delete user.password;
  user.token = jwt.sign(user, process.env.JWT_SECRET);

  const accs = await app.db('accounts').insert([
    { name: 'Acc #1', user_id: user.id },
    { name: 'Acc #2', user_id: user2.id },
  ], '*');

  [accUser, accUser2] = accs;
});

test('Deve listar apenas as transações do usuário', () => app.db('transactions').insert([
  { description: 'T1', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id },
  { description: 'T2', date: new Date(), amount: 300, type: 'O', acc_id: accUser2.id },
]).then(() => request(app).get(MAIN_ROUTE).set('authorization', `Bearer ${user.token}`))
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].description).toBe('T1');
  }));

test('Deve inserir uma transação com sucesso', () => request(app).post(MAIN_ROUTE)
  .set('authorization', `Bearer ${user.token}`)
  .send({ description: 'New T', date: new Date(), amount: 160, type: 'I', acc_id: accUser.id })
  .then((res) => {
    expect(res.status).toBe(201);
    expect(res.body.acc_id).toBe(accUser.id);
    expect(res.body.amount).toBe('160.00');
  }));

it('Transações de entrada devem ser positivas', () => request(app).post(MAIN_ROUTE)
  .set('authorization', `Bearer ${user.token}`)
  .send({ description: 'New T', date: new Date(), amount: -160, type: 'I', acc_id: accUser.id })
  .then((res) => {
    expect(res.status).toBe(201);
    expect(res.body.acc_id).toBe(accUser.id);
    expect(res.body.amount).toBe('160.00');
  }));

it('Transações de saída devem ser negativas', () => request(app).post(MAIN_ROUTE)
  .set('authorization', `Bearer ${user.token}`)
  .send({ description: 'New T', date: new Date(), amount: 160, type: 'O', acc_id: accUser.id })
  .then((res) => {
    expect(res.status).toBe(201);
    expect(res.body.acc_id).toBe(accUser.id);
    expect(res.body.amount).toBe('-160.00');
  }));

describe('Ao tentar criar uma transação inválida...', () => {
  const testTemplate = (newData, errorMessage) => request(app).post(MAIN_ROUTE)
    .set('authorization', `Bearer ${user.token}`)
    .send({
      description: 'New T',
      date: new Date(),
      amount: 160,
      type: 'I',
      acc_id: accUser.id,
      ...newData,
    })
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(errorMessage);
    });

  test('Não deve inserir sem descrição', () => testTemplate({ description: null }, 'Descrição é um atributo obrigatório'));
  test('Não deve inserir sem valor', () => testTemplate({ amount: null }, 'Valor é um atributo obrigatório'));
  test('Não deve inserir uma transação sem data', () => testTemplate({ date: null }, 'Data é um atributo obrigatório'));
  test('Não deve inserir uma transação sem conta', () => testTemplate({ acc_id: null }, 'Conta é um atributo obrigatório'));
  test('Não deve inserir uma transação sem tipo', () => testTemplate({ type: null }, 'Tipo é um atributo obrigatório'));
  test('Não deve inserir uma transação com tipo inválido', () => testTemplate({ type: 'A' }, 'Tipo inválido'));
});

test('Deve retornar uma transação por ID', () => app.db('transactions').insert({
  description: 'T ID',
  date: new Date(),
  amount: 160,
  type: 'I',
  acc_id: accUser.id,
}, ['id']).then((trans) => request(app).get(`${MAIN_ROUTE}/${trans[0].id}`)
  .set('authorization', `Bearer ${user.token}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(trans[0].id);
    expect(res.body.description).toBe('T ID');
  })));

test('Deve alterar uma transação', () => app.db('transactions').insert({
  description: 'T to update',
  date: new Date(),
  amount: 160,
  type: 'I',
  acc_id: accUser.id,
}, ['id']).then((trans) => request(app).put(`${MAIN_ROUTE}/${trans[0].id}`)
  .set('authorization', `Bearer ${user.token}`)
  .send({ description: 'T updated', amount: 300 })
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('T updated');
  })));

test('Deve remover uma transação', () => app.db('transactions').insert({
  description: 'T to remove',
  date: new Date(),
  amount: 100,
  type: 'I',
  acc_id: accUser.id,
}, ['id']).then((trans) => request(app).delete(`${MAIN_ROUTE}/${trans[0].id}`)
  .set('authorization', `Bearer ${user.token}`)
  .then((res) => {
    expect(res.status).toBe(204);
  })));

test('Não deve remover uma transação de outro usuário', () => app.db('transactions').insert({
  description: 'T to remove',
  date: new Date(),
  amount: 100,
  type: 'I',
  acc_id: accUser2.id,
}, ['id']).then((trans) => request(app).delete(`${MAIN_ROUTE}/${trans[0].id}`)
  .set('authorization', `Bearer ${user.token}`)
  .then((res) => {
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Este recurso não pertence ao usuário');
  })));
