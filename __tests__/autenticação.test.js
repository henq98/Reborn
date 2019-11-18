const request = require('supertest');

const app = require('../src/app.js');

test('Deve criar usuário via signup', () => request(app).post('/auth/signup')
  .send({
    name: 'Walter',
    email: `${Date.now()}@email.com`,
    password: '1234',
  }).then((res) => {
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Walter');
    expect(res.body).toHaveProperty('email');
    expect(res.body).not.toHaveProperty('password');
  }));

test('Deve receber token ao logar', () => {
  const email = `${Date.now()}@email.com`;

  return app.services.user.create({
    name: 'Walter',
    email,
    password: '1234',
  }).then(() => request(app).post('/auth/signin')
    .send({ email, password: '1234' })
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    }));
});

test('Não deve autenticar usuário com email errado', () => request(app).post('/auth/signin')
  .send({ email: 'inexistent@email.com', password: 'admin' })
  .then((res) => {
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Usuário ou senha inválido');
  }));

test('Não deve autenticar usuário com senha errada', () => {
  const email = `${Date.now()}@email.com`;

  return app.services.user.create({
    name: 'Walter',
    email,
    password: '1234',
  }).then(() => request(app).post('/auth/signin')
    .send({ email, password: '4321' })
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Usuário ou senha inválido');
    }));
});
test('Não deve acessar uma rota protegida sem token', () => request(app).get('/v1/users')
  .then((res) => {
    expect(res.status).toBe(401);
  }));
