const moment = require('moment');

exports.seed = (knex) => {
  knex('users').insert([
    { id: 10100, name: 'User #3', email: 'user3@email.com', password: '2a$10$6.jH9AuG2ghkszKF692cHOZCUXVxw0XQI3MUrUN9Qs2tq4cydjdZi' },
    { id: 10101, name: 'User #4', email: 'user4@email.com', password: '2a$10$6.jH9AuG2ghkszKF692cHOZCUXVxw0XQI3MUrUN9Qs2tq4cydjdZi' },
    { id: 10102, name: 'User #5', email: 'user5@email.com', password: '2a$10$6.jH9AuG2ghkszKF692cHOZCUXVxw0XQI3MUrUN9Qs2tq4cydjdZi' },
  ])
    .then(() => knex('accounts').insert([
      { id: 10100, name: 'Acc Saldo Principal', user_id: 10100 },
      { id: 10101, name: 'Acc Saldo Secundário', user_id: 10100 },
      { id: 10102, name: 'Acc Alternativa 1', user_id: 10101 },
      { id: 10103, name: 'Acc Alternativa 2', user_id: 10101 },
      { id: 10104, name: 'Acc Geral Principal', user_id: 10102 },
      { id: 10105, name: 'Acc Geral Secundário', user_id: 10102 },
    ]))
    .then(() => knex('transfers').insert([
      { id: 10100, description: 'Transfer #1', user_id: 10102, acc_ori_id: 10105, acc_dest_id: 10104, amount: 256, date: new Date() },
      { id: 10101, description: 'Transfer #2', user_id: 10101, acc_ori_id: 10102, acc_dest_id: 10103, amount: 512, date: new Date() },
    ]))
    .then(() => knex('transactions').insert([
      // transação positiva / Saldo = 2
      { description: '2', date: new Date(), amount: 2, type: 'I', acc_id: 10104, status: true },
      // transação de usuário errado / Saldo = 2
      { description: '2', date: new Date(), amount: 4, type: 'I', acc_id: 10102, status: true },
      // transação de outra conta / Saldo = 2 / Saldo = 8
      { description: '2', date: new Date(), amount: 8, type: 'I', acc_id: 10105, status: true },
      // transação pendente / Saldo = 2 / Saldo = 8
      { description: '2', date: new Date(), amount: 16, type: 'I', acc_id: 10104, status: false },
      // transação passada / Saldo = 34 / Saldo = 8
      { description: '2', date: moment().subtract({ days: 5 }), amount: 32, type: 'I', acc_id: 10104, status: true },
      // transação futura / Saldo = 34 / Saldo = 8
      { description: '2', date: moment().add({ days: 5 }), amount: 64, type: 'I', acc_id: 10104, status: true },
      // transação negativa / Saldo = -94 / Saldo = 8
      { description: '2', date: new Date(), amount: -128, type: 'O', acc_id: 10104, status: true },
      // transferência / Saldo = 162 / Saldo = -248
      { description: '2', date: new Date(), amount: 256, type: 'I', acc_id: 10104, status: true },
      { description: '2', date: new Date(), amount: -256, type: 'O', acc_id: 10105, status: true },
      // transferência / Saldo = 162 / Saldo = -248
      { description: '2', date: new Date(), amount: 512, type: 'I', acc_id: 10103, status: true },
      { description: '2', date: new Date(), amount: -512, type: 'O', acc_id: 10102, status: true },
    ]));
};
