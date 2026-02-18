import axios from 'axios';
import { config } from '../config';

export const strapiClient = axios.create({
  baseURL: config.STRAPI_URL,
  headers: {
    Authorization: `Bearer ${config.STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});
