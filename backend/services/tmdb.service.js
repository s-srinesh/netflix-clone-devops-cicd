import axios from 'axios';
import { ENV_VARS } from '../config/env.config.js';
import { getFallbackForUrl } from './mockData.js';

/**
 * Fetches data from The Movie Database (TMDB) using the provided URL and API key.
 * If TMDB_API_KEY is not configured or if the request fails (e.g. rate limit, 401, timeout),
 * it seamlessly returns high-quality fallback data to keep the Netflix app fully functional.
 *
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<Object>} - The fetched or fallback data.
 */
export const fetchFromTMDB = async (url) => {
  const isKeyMissingOrPlaceholder =
    !ENV_VARS.TMDB_API_KEY ||
    ENV_VARS.TMDB_API_KEY === 'your_tmdb_api_key' ||
    ENV_VARS.TMDB_API_KEY.trim() === '';

  if (isKeyMissingOrPlaceholder) {
    return getFallbackForUrl(url);
  }

  try {
    const options = {
      headers: {
        accept: 'application/json',
        Authorization: 'Bearer ' + ENV_VARS.TMDB_API_KEY,
      },
      timeout: 5000,
    };

    const response = await axios.get(url, options);

    if (response.status === 200 && response.data) {
      return response.data;
    }

    return getFallbackForUrl(url);
  } catch (error) {
    console.warn(`[TMDB Service] External API call failed (${error.message}). Serving fallback catalog.`);
    return getFallbackForUrl(url);
  }
};

