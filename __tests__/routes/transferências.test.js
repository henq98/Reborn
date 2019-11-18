const request = require('supertest');

const app = require('../../src/app');

const MAIN_ROUTE = '/v1/transfers';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMDAsIm5hbWUiOiJVc2VyICMxIiwiZW1haWwiOiJ1c2VyMUBlbWFpbC5jb20ifQ.uWD9nlVO5CWR8A-Qm3RzsvPvQBhzsYQ5NyWTyX0PNLE';

beforeAll(async () => {
  // await app.db.migrate.rollback();
  // await app.db.migrate.latest();
  await app.db.seed.run();
});

test('Deve listar apenas as transferências do usuário', () => request(app).get(MAIN_ROUTE)
  .set('authorization', `Bearer ${TOKEN}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].description).toBe('Transfer #1');
  }));

test('Deve inserir uma transferência com sucesso', () => request(app).post(MAIN_ROUTE)
  .set('authorization', `Bearer ${TOKEN}`)
  .send({
    description: 'Regular Transfer',
    user_id: 10000,
    acc_ori_id: 10000,
    acc_dest_id: 10001,
    amount: 100,
    date: new Date(),
  })
  .then(async (res) => {
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Regular Transfer');

    const transactions = await app.db('transactions').where({ transfer_id: res.body.id });
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('Transfer to acc #10001');
    expect(transactions[1].description).toBe('Transfer from acc #10000');
    expect(transactions[0].amount).toBe('-100.00');
    expect(transactions[1].amount).toBe('100.00');
    expect(transactions[0].acc_id).toBe(10000);
    expect(transactions[1].acc_id).toBe(10001);
  }));

describe('Ao salvar uma transferência válida...', () => {
  let transferId;
  let inbound;
  let outbound;

  it('Deve retornar o status 201 e os dados da transferência', () => request(app).post(MAIN_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: 'Regular Transfer',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      amount: 100,
      date: new Date(),
    })
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Regular Transfer');
      transferId = res.body.id;
    }));

  it('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.db('transactions')
      .where({ transfer_id: transferId })
      .orderBy('amount');

    expect(transactions).toHaveLength(2);
    [outbound, inbound] = transactions;
  });

  it('Ambas devem referenciar a transferência que as originou', () => {
    expect(inbound.transfer_id).toBe(transferId);
    expect(outbound.transfer_id).toBe(transferId);
  });

  it('A transação de saída deve ser negativa', () => {
    expect(outbound.description).toBe('Transfer to acc #10001');
    expect(outbound.amount).toBe('-100.00');
    expect(outbound.acc_id).toBe(10000);
    expect(outbound.type).toBe('O');
  });

  it('A transação de entrada deve ser positiva', () => {
    expect(inbound.description).toBe('Transfer from acc #10000');
    expect(inbound.amount).toBe('100.00');
    expect(inbound.acc_id).toBe(10001);
    expect(inbound.type).toBe('I');
  });
});

describe('Ao tentar salvar uma transferência inválida...', () => {
  const template = (newData, errorMessage) => request(app).post(MAIN_ROUTE)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: 'this transfer gonna fail',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      amount: 300,
      date: new Date(),
      ...newData,
    })
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(errorMessage);
    });

  it('sem informar descrição', () => template({ description: null }, 'Descrição é um atributo obrigatório'));
  it('sem informar valor', () => template({ amount: null }, 'Valor é um atributo obrigatório'));
  it('sem informar data', () => template({ date: null }, 'Data é um atributo obrigatório'));
  it('sem informar conta de origem', () => template({ acc_ori_id: null }, 'Conta de origem é obrigatória'));
  it('sem informar conta de destino', () => template({ acc_dest_id: null }, 'Conta de destino é obrigatória'));
  it('cuja conta de origem é a mesma da conta de destino', () => template({ acc_dest_id: 10000 }, 'Conta de origem deve ser diferente da conta de destino'));
  it('cuja conta pertence a um outro usuário', () => template({ acc_ori_id: 10002 }, 'Conta de origem #10002 não pertence ao usuário'));
});

test('Deve retorar uma transferência por ID', () => request(app).get(`${MAIN_ROUTE}/10000`)
  .set('authorization', `Bearer ${TOKEN}`)
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Transfer #1');
  }));

describe('Ao alterar uma transferência válida...', () => {
  let transferId;
  let inbound;
  let outbound;

  it('Deve retornar o status 200 e os dados da transferência', () => request(app).put(`${MAIN_ROUTE}/10000`)
    .set('authorization', `Bearer ${TOKEN}`)
    .send({
      description: 'Transfer updated',
      user_id: 10000,
      acc_ori_id: 10000,
      acc_dest_id: 10001,
      amount: 500,
      date: new Date(),
    })
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Transfer updated');
      expect(res.body.amount).toBe('500.00');
      transferId = res.body.id;
    }));

  it('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.db('transactions')
      .where({ transfer_id: transferId })
      .orderBy('amount');

    expect(transactions).toHaveLength(2);
    [outbound, inbound] = transactions;
  });

  it('Ambas devem referenciar a transferência que as originou', () => {
    expect(inbound.transfer_id).toBe(transferId);
    expect(outbound.transfer_id).toBe(transferId);
  });
  
  it('Ambas devem ter o status de concluído', () => {
    expect(inbound.status).toBe(true);
    expect(outbound.status).toBe(true);
  });

  it('A transação de saída deve ser negativa', () => {
    expect(outbound.description).toBe('Transfer to acc #10001');
    expect(outbound.amount).toBe('-500.00');
    expect(outbound.acc_id).toBe(10000);
    expect(outbound.type).toBe('O');
  });

  it('A transação de entrada deve ser positiva', () => {
    expect(inbound.description).toBe('Transfer from acc #10000');
    expect(inbound.amount).toBe('500.00');
    expect(inbound.acc_id).toBe(10001);
    expect(inbound.type).toBe('I');
  });
});

// describe('Ao modificar uma transação inválida...', () => {
//   const template = (newData, errorMessage) => request(app).put(`${MAIN_ROUTE}/10000`)
//     .set('authorization', `Bearer ${TOKEN}`)
//     .send({
//       description: 'this transfer gonna fail',
//       user_id: 10000,
//       acc_ori_id: 10000,
//       acc_dest_id: 10001,
//       amount: 300,
//       date: new Date(),
//       ...newData,
//     })
//     .then((res) => {
//       expect(res.status).toBe(400);
//       expect(res.body.error).toBe(errorMessage);
//     });

//   it('sem informar a descrição', () => template({ description: null }, 'Descrição é um atributo obrigatório'));
//   it('sem informar o valor', () => template({ amount: null }, 'Valor é um atributo obrigatório'));
//   it('sem informar a data', () => template({ date: null }, 'Data é um atributo obrigatório'));
//   it('sem informar a conta de origem', () => template({ acc_ori_id: null }, 'Conta de origem é obrigatória'));
//   it('sem informar a conta de destino', () => template({ acc_dest_id: null }, 'Conta de destino é obrigatória'));
//   it('cuja conta de origem é a mesma da conta de destino', () => template({ acc_dest_id: 10000 }, 'Conta de origem deve ser diferente da conta de destino'));
//   it('cuja conta pertence a um outro usuário', () => template({ acc_ori_id: 10002 }, 'Conta de origem #10002 não pertence ao usuário'));
// });

describe('Ao remover um transferência...', () => {
  it('deve retornar código do status HTTP 204', () => request(app).delete(`${MAIN_ROUTE}/10000`)
    .set('authorization', `Bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(204);
    }));

  it('o registro deve ser removido do Banco de Dados', () => app.db('transfers').where({ id: 10000 })
    .then((result) => {
      expect(result).toHaveLength(0);
    }));

  it('as transferências associadas devem ter sido removidas', () => app.db('transactions').where({ transfer_id: 10000 })
    .then((result) => {
      expect(result).toHaveLength(0);
    }));
});

// test('to not return a transfer from another user', () => request(app).get(`${MAIN_ROUTE}/10001`)
//   .set('authorization', `Bearer ${TOKEN}`)
//   .then((res) => {
//     expect(res.status).toBe(403);
//     expect(res.body.error).toBe('Este recurso não pertence ao usuário');
//   }));
