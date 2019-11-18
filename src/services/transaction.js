const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const find = (userId, filter = {}) => app.db('transactions')
    .join('accounts', 'accounts.id', 'acc_id')
    .where(filter)
    .andWhere('accounts.user_id', '=', userId)
    .select();

  const findOne = (filter) => app.db('transactions').where(filter).first();

  const create = (transaction) => {
    const { description, amount, date, acc_id: accId, type } = transaction;

    if (!description) throw new ValidationError('Descrição é um atributo obrigatório');
    if (!amount) throw new ValidationError('Valor é um atributo obrigatório');
    if (!date) throw new ValidationError('Data é um atributo obrigatório');
    if (!accId) throw new ValidationError('Conta é um atributo obrigatório');
    if (!type) throw new ValidationError('Tipo é um atributo obrigatório');
    if (!(type === 'O' || type === 'I')) throw new ValidationError('Tipo inválido');

    const newTransaction = { ...transaction };
    // adjust signal according to transaction type
    if ((type === 'I' && amount < 0)
      || (type === 'O' && amount > 0)) {
      newTransaction.amount *= -1;
    }

    return app.db('transactions').insert(newTransaction, '*');
  };

  const update = (id, transaction) => app.db('transactions')
    .where({ id })
    .update(transaction, '*');

  const remove = (id) => app.db('transactions').where({ id }).del();

  return { find, findOne, create, update, remove };
};
