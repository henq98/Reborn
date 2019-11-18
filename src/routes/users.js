const router = require('express').Router();

module.exports = (app) => {
  router.post('/', async (req, res, next) => {
    try {
      const result = await app.services.user.create(req.body);
      return res.status(201).json(result[0]);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/', (req, res, next) => app.services.user.findAll()
    .then((result) => res.status(200).json(result))
    .catch((err) => next(err)));

  return router;
};
