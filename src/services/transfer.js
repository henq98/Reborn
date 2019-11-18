const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const find = (filter = {}) => app.db('transfers')
    .where(filter)
    .select();

  const findOne = (filter) => app.db('transfers')
    .where(filter)
    .first();

  const validate = async (transfer) => {
    const {
      description,
      acc_dest_id,
      acc_ori_id,
      date,
      amount,
      user_id,
    } = transfer;

    if (!description) throw new ValidationError('Descrição é um atributo obrigatório');
    if (!amount) throw new ValidationError('Valor é um atributo obrigatório');
    if (!date) throw new ValidationError('Data é um atributo obrigatório');
    if (!acc_ori_id) throw new ValidationError('Conta de origem é obrigatória');
    if (!acc_dest_id) throw new ValidationError('Conta de destino é obrigatória');
    if (acc_ori_id === acc_dest_id) throw new ValidationError('Conta de origem deve ser diferente da conta de destino');

    const checkUserOwner = await app.db('accounts').where({ id: acc_ori_id }).first();
    if (checkUserOwner.user_id !== user_id) throw new ValidationError(`Conta de origem #${acc_ori_id} não pertence ao usuário`);
  };

  const create = async (transfer) => {
    const result = await app.db('transfers').insert(transfer, '*');
    const transferId = result[0].id;

    const {
      acc_dest_id,
      acc_ori_id,
      date,
      amount,
    } = transfer;

    const transactions = [
      { description: `Transfer to acc #${acc_dest_id}`, date, amount: amount * -1, type: 'O', acc_id: acc_ori_id, transfer_id: transferId, status: true },
      { description: `Transfer from acc #${acc_ori_id}`, date, amount, type: 'I', acc_id: acc_dest_id, transfer_id: transferId, status: true },
    ];

    await app.db('transactions').insert(transactions);

    return result;
  };

  const update = async (id, transfer) => {
    const result = await app.db('transfers')
      .where({ id })
      .update(transfer, '*');

    const {
      acc_dest_id,
      acc_ori_id,
      date,
      amount,
    } = transfer;

    const transactions = [
      { description: `Transfer to acc #${acc_dest_id}`, date, amount: amount * -1, type: 'O', acc_id: acc_ori_id, transfer_id: id, status: true },
      { description: `Transfer from acc #${acc_ori_id}`, date, amount, type: 'I', acc_id: acc_dest_id, transfer_id: id, status: true },
    ];

    await app.db('transactions').where({ transfer_id: id }).del();
    await app.db('transactions').insert(transactions);

    return result;
  };

  const remove = async (id) => {
    await app.db('transactions').where({ transfer_id: id }).del();
    return app.db('transfers').where({ id }).del();
  };

  return { find, findOne, create, update, validate, remove };
};
