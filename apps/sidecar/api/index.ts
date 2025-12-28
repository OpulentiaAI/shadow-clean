import { initializeServer } from '../src/server';

const appPromise = initializeServer();

export default async (req, res) => {
  const app = await appPromise;
  app(req, res);
};
