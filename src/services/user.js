const bcrypt = require('bcryptjs');

const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const findAll = () => app.db('users').select(['id', 'name', 'email']);

  const findOne = (filter = {}) => app.db('users').where(filter).first();

  const hashPassword = (password) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  };

  const create = async (user) => {
    const { name, email, password } = user;
    if (!name) throw new ValidationError('Nome é um atributo obrigatório');
    if (!email) throw new ValidationError('Email é um atributo obrigatório');
    if (!password) throw new ValidationError('Senha é um atributo obrigatório');

    const userSaved = await findOne({ email });

    if (userSaved) throw new ValidationError('Já existe um usuário com esse email');

    const User = { name, email, password };

    User.password = hashPassword(User.password);

    return app.db('users').insert(User, ['id', 'name', 'email']);
  };

  return { create, findAll, findOne };
};
